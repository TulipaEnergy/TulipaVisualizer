pub fn build_duration_series_query(
    source_table: &str,
    value_col: &str,
    group_cols: &[&str],
) -> String {
    let group_cols_sql = group_cols.join(",");
        DURATION_SERIES_TEMPLATE_SQL
        .replace("{group_cols}", &group_cols_sql)
        .replace("{value_col}", value_col)
        .replace("{source_table}", source_table)
}

pub fn build_time_weighted_query(
    source_table: &str,
    value_col: &str,
    group_cols: &[&str],
) -> String {
    let group_cols_sql = group_cols.join(", ");
        TIME_WEIGHTED_TEMPLATE_SQL
        .replace("{group_cols}", &group_cols_sql)
        .replace("{value_col}", value_col)
        .replace("{source_table}", source_table)
}


const TIME_WEIGHTED_TEMPLATE_SQL: &str = "SELECT
            {group_cols},
            src.year AS milestone_year,
            m.period,
            d.num_timesteps * d.resolution AS length,
            SUM(  src.{value_col}
                * (src.time_block_end - src.time_block_start + 1)
                * d.resolution * m.weight
            ) AS y_axis	
            FROM {source_table} AS src
            JOIN
                rep_periods_mapping AS m
            ON m.year = src.year AND m.rep_period = src.rep_period
            JOIN
                rep_periods_data AS d
            ON d.year = m.year AND d.rep_period = m.rep_period
            GROUP BY
                src.year,
                m.period,
                length,
                {group_cols},
            ORDER BY
            src.year,
            m.period,
            y_axis,
            {group_cols};";


const  DURATION_SERIES_TEMPLATE_SQL: &str = "
WITH numbered AS (
  SELECT *,
         ROW_NUMBER() OVER (PARTITION BY {group_cols}, year, rep_period ORDER BY time_block_start) 
       - ROW_NUMBER() OVER (PARTITION BY {group_cols}, year, rep_period, {value_col} ORDER BY time_block_start) AS grp
  FROM {source_table}
),
grouped AS (
  SELECT
    {group_cols},
    year,
    rep_period,
    {value_col},
    MIN(time_block_start) AS time_block_start,
    MAX(time_block_end) AS time_block_end
  FROM numbered
  GROUP BY {group_cols}, year, rep_period, {value_col}, grp
),
all_blocks AS (
  SELECT g.year, m.period, g.time_block_end
  FROM grouped AS g
  JOIN rep_periods_mapping AS m 
    ON g.year = m.year AND g.rep_period = m.rep_period
  UNION
  SELECT g.year, m.period, 0 AS time_block_end
  FROM grouped AS g
  JOIN rep_periods_mapping AS m 
    ON g.year = m.year AND g.rep_period = m.rep_period
),
ranked_blocks AS (
  SELECT 
    year,
    period,
    time_block_end,
    ROW_NUMBER() OVER (PARTITION BY year, period ORDER BY time_block_end) AS rn
  FROM all_blocks
),
periods AS (
  SELECT
    first.year,
    first.period, 
    first.time_block_end AS start_hour,
    second.time_block_end AS end_hour
  FROM ranked_blocks AS first
  JOIN ranked_blocks AS second
    ON first.year = second.year
    AND first.period = second.period
    AND first.rn + 1 = second.rn
),
raw AS (
  SELECT
      {group_cols},
      g.year AS milestone_year,
      m.period,
      (p.start_hour * d.resolution) AS start_hour,
      (p.end_hour * d.resolution) AS end_hour,
      SUM(g.{value_col} * m.weight / d.resolution ) AS y_axis
  FROM grouped AS g
  JOIN rep_periods_mapping AS m
      ON g.year = m.year AND g.rep_period = m.rep_period
  JOIN periods AS p
      ON p.year = m.year
      AND p.period = m.period
      AND p.start_hour + 1 >= g.time_block_start
      AND p.end_hour <= g.time_block_end
  JOIN rep_periods_data AS d
      ON d.year = m.year AND d.rep_period = m.rep_period
  GROUP BY
      {group_cols},
      g.year,
      m.period,
      d.resolution,
      p.start_hour,
      p.end_hour
),
numbered_blocks AS (
  SELECT *,
         ROW_NUMBER() OVER (PARTITION BY {group_cols}, milestone_year, period ORDER BY start_hour) -
         ROW_NUMBER() OVER (PARTITION BY {group_cols}, milestone_year, period, y_axis ORDER BY start_hour) AS grp
  FROM raw
),
final AS (
  SELECT
    {group_cols},
    milestone_year,
    period,
    MIN(start_hour) AS start,
    MAX(end_hour) AS end,
    y_axis
  FROM numbered_blocks
  GROUP BY
    {group_cols},
    milestone_year,
    period,
    y_axis,
    grp
)
SELECT *
FROM final
ORDER BY {group_cols}, milestone_year, period, start;

";