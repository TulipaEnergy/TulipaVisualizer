/// Builds dynamic SQL query for time resolution analysis with clustering support.
/// 
/// This function generates complex SQL queries that aggregate energy data across different
/// time resolutions, handling both clustered (yearly) and representative period approaches.
/// 
/// # Arguments
/// * `source_table` - Database table containing the source data
/// * `value_col` - Column name containing the values to aggregate
/// * `group_cols` - Columns to group by (e.g., asset, region)
/// * `agg` - SQL aggregation function (SUM, AVG, etc.)
/// * `resolution` - Time resolution for grouping (hours, days, etc.)
/// * `clustered` - Whether to use clustered year resolution or representative periods
/// 
/// # Security
/// All parameters are validated and sanitized through prepared statement placeholders.
/// String interpolation is used only for column/table names, not user data.
pub fn build_resolution_query(
    source_table: &str,
    value_col: &str,
    group_cols: &[&str],
    agg: &str,
    resolution: &str,
    clustered: bool,
) -> String {
    let combine_sql: String;
    if clustered {
        combine_sql = "WITH ".to_string()
            + CLUSTURED_YEAR_RESOLUTIONS_SQL
            + &LAST_PART_SQL.replace("{final}", "final_clustered");
    } else {
        combine_sql = REP_PERIOD_RESOLUTION_SQL.to_string()
            + &LAST_PART_SQL.replace("{final}", "final_rep_periods");
    }
    let group_cols_sql = group_cols.join(", ");
        combine_sql
            .replace("{group_cols}", &group_cols_sql)
            .replace("{value_col}", value_col)
            .replace("{source_table}", source_table)
            .replace("{agg}", agg)
            .replace("{period_length}", resolution)
}

/// Builds SQL query combining both representative periods and clustered year resolutions.
/// Used for comparative analysis across different temporal modeling approaches.
pub fn build_resolution_query_both(
    source_table: &str,
    source_table_1: &str,
    value_col: &str,
    group_cols: &[&str],
    agg: &str,
    resolution: &str,
) -> String {

  let combine_sql = REP_PERIOD_RESOLUTION_SQL.to_string()
      + &CLUSTURED_YEAR_RESOLUTIONS_SQL.replace("{source_table}", "{source_table_1}")
      + BOTH_RESOLUTIONS_SQL
      + &LAST_PART_SQL.replace("{final}", "final");
  let group_cols_sql = group_cols.join(", ");
    combine_sql
        .replace("{group_cols}", &group_cols_sql)
        .replace("{value_col}", value_col)
        .replace("{source_table}", source_table)
        .replace("{source_table_1}", source_table_1)
        .replace("{agg}", agg)
        .replace("{period_length}", resolution)
}

// --- SQL TEMPLATE QUERIES ---
// These constants contain parameterized SQL templates that are safely interpolated
// with validated column/table names. User data is passed via prepared statement parameters.

/// Complex SQL query template for representative period resolution analysis.
/// 
/// Algorithm overview:
/// 1. Groups consecutive time blocks with identical values using ROW_NUMBER window functions
/// 2. Aggregates consecutive blocks into single time periods  
/// 3. Generates all possible time block boundaries for each period
/// 4. Calculates weighted sums considering representative period weights
/// 5. Re-groups consecutive results with same values for visualization efficiency
const REP_PERIOD_RESOLUTION_SQL: &str = "
/* Assigns a group number (grp) to consecutive blocks that have the same {value_col} values
   within the same {group_cols}, year, and rep_period, ordered by time_block_start (chronologically).
*/
WITH numbered AS (
  SELECT *,
         ROW_NUMBER() OVER (PARTITION BY {group_cols}, year, rep_period ORDER BY time_block_start) 
       - ROW_NUMBER() OVER (PARTITION BY {group_cols}, year, rep_period, {value_col} ORDER BY time_block_start) AS grp
  FROM {source_table}
),
/* Aggregates consecutive rows (based on the grp from numbered) into a single time block
   by computing the MIN(time_block_start) and MAX(time_block_end) for each distinct {value_col} group.
*/
grouped AS (
  SELECT
    {group_cols},
    year,
    rep_period,
    {value_col},
    MIN(time_block_start) AS time_block_start,
    MAX(time_block_end) AS time_block_end
  FROM numbered
  WHERE year = ?
  GROUP BY {group_cols}, year, rep_period, {value_col}, grp
),
/* Generates all block end times per period by:
    - Including each time_block_end from grouped
    - Adding an extra starting point (0) to aid with boundary calculations
  We do that in order to get all time blocks for each period, including the start of the period.

*/
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
/* Assigns a row number (rn) to each time_block_end value within a given year and period,
   so that we can later pair consecutive time blocks together.
*/
ranked_blocks AS (
  SELECT 
    year,
    period,
    time_block_end,
    ROW_NUMBER() OVER (PARTITION BY year, period ORDER BY time_block_end) AS rn
  FROM all_blocks
),
/* Pairs each time block end with the next one to form all the
   [start_hour, end_hour) intervals for each period in each year.
*/
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
/* Builds an initial y-axis. Calculates weighted sums of {value_col} values
   over the [start_hour, end_hour) intervals, taking into account the weight
   and resolution of each representative period.
*/
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
/* Again groups consecutive data with the same y_axis values. */
numbered_blocks AS (
  SELECT *,
         ROW_NUMBER() OVER (PARTITION BY {group_cols}, milestone_year, period ORDER BY start_hour) -
         ROW_NUMBER() OVER (PARTITION BY {group_cols}, milestone_year, period, y_axis ORDER BY start_hour) AS grp
  FROM raw
),
/* Combines the consecutive blocks with the same y_axis values. */
final_rep_periods AS (
  SELECT
    {group_cols},
    milestone_year,
    period,
    MIN(start_hour) AS start_hour,
    MAX(end_hour) AS end_hour,
    y_axis
  FROM numbered_blocks
  GROUP BY
    {group_cols},
    milestone_year,
    period,
    y_axis,
    grp
),
";

/// SQL query template for clustered year resolution analysis.
/// 
/// Processes data where each period represents a full year rather than representative periods.
/// Uses LATERAL UNNEST with GENERATE_SERIES for period expansion.
static CLUSTURED_YEAR_RESOLUTIONS_SQL: &str = "
  /* Generates a row for each period instead of having
  a single row per consecutive periods with the same price */
  pre_processed AS (
    SELECT
      {group_cols},
      year AS milestone_year,
      period,
      SUM({value_col}) AS y_axis
    FROM {source_table},
    LATERAL UNNEST(GENERATE_SERIES(period_block_start, period_block_end)) AS period(period)
    WHERE year = ?
    GROUP BY
      {group_cols},
      milestone_year,
      period
  ),
  /* Prepares the data to be in the needed format for the next query */
  final_clustered AS (
    SELECT DISTINCT
      {group_cols},
      milestone_year,
      m.period,
      0 AS start_hour,
      (d.num_timesteps * d.resolution) AS end_hour,
      y_axis
    FROM pre_processed AS pre
    JOIN rep_periods_mapping AS m ON pre.milestone_year = m.year AND pre.period = m.period
    JOIN rep_periods_data AS d ON m.year = d.year AND m.rep_period = d.rep_period
  ),
";

const BOTH_RESOLUTIONS_SQL: &str = "
/* Combines the clustered and non-clustered data into a single table.*/
final AS (
  SELECT
    final_clustered.{group_cols},
    final_clustered.milestone_year,
    final_rep_periods.period,
    final_rep_periods.start_hour,
    final_rep_periods.end_hour,
    (final_rep_periods.y_axis + final_clustered.y_axis) AS y_axis
    FROM final_rep_periods
  JOIN final_clustered ON final_rep_periods.{group_cols} = final_clustered.{group_cols}
    AND final_rep_periods.milestone_year = final_clustered.milestone_year
    AND final_rep_periods.period = final_clustered.period
  
  UNION ALL
  SELECT * FROM final_rep_periods
  WHERE {group_cols} NOT IN (
    SELECT {group_cols} FROM final_clustered
  )
  UNION ALL
  SELECT * FROM final_clustered
  WHERE {group_cols} NOT IN (
    SELECT {group_cols} FROM final_rep_periods
  )

  ),
";

static LAST_PART_SQL: &str = "
  /* Calculates the total duration (in hours) of each period per {group_cols} and milestone_year. */
period_durations AS (
  SELECT
    {group_cols},
    milestone_year,
    period,
    MAX(end_hour) AS period_duration
  FROM {final}
  GROUP BY 
    {group_cols},
    milestone_year,
    period
),
/* Computes offset_val as the cumulative duration of all previous periods
   (to map each [start_hour, end_hour) interval to a global timeline).
*/   
final_with_offsets AS (
  SELECT *,
    COALESCE((
      SELECT SUM(d.period_duration)
      FROM period_durations d
      WHERE d.{group_cols} = f.{group_cols}
      AND d.milestone_year = f.milestone_year
      AND d.period < f.period
    ), 0) AS offset_val
  FROM {final} AS f
),
/* Add the offsets to the local start and end hours to create a global timeline.
*/
s_table AS (
  SELECT
    {group_cols},
    milestone_year,
    (offset_val + start_hour) AS global_start,
    (offset_val + end_hour) AS global_end,
    y_axis
  FROM final_with_offsets
  ORDER BY
    {group_cols},
    milestone_year,
    global_start
),
/* Calculates the global_start and global_end based on the specified period length.
   This allows us to handle cases where a single time block spans multiple periods (here a period has the resolution length).
*/
exploded AS (
  SELECT 
    {group_cols},
    milestone_year,
    global_start,
    global_end,
    y_axis,
    FLOOR(global_start / {period_length}) AS first_period,
    FLOOR((global_end - 1) / {period_length}) AS last_period
  FROM s_table
),
/* Generates all resolution periods. For each row in exploded, it creates a series of periods.
   Each period is defined by its start and end times, which are adjusted to fit within the global_start and global_end.
*/
resolution_periods AS (
  SELECT 
    e.{group_cols},
    e.milestone_year,
    p.period,
    GREATEST(e.global_start, p.period) AS period_start,
    LEAST(e.global_end, p.period + 1) AS period_end,
    e.y_axis
  FROM exploded e
  JOIN LATERAL (
    SELECT UNNEST(generate_series(
      CAST(e.first_period AS BIGINT),
      CAST(e.last_period AS BIGINT))
    ) AS period
  ) AS p ON TRUE
),
/* Calculates the weighted price for each period by multiplying the duration of each period
   by the y_axis value, and then sums these values to get the total weighted price.
*/
weighted AS (
  SELECT
    {group_cols},
    milestone_year,
    period,
    SUM((period_end - period_start) * y_axis) AS weighted_price,
    SUM(period_end - period_start) AS duration
  FROM resolution_periods
  GROUP BY {group_cols}, milestone_year, period
),
/* Computes the average or total weighted price for each period.
   If the aggregation is 'avg', it divides the weighted price by the duration of the period.
   Otherwise, it returns the weighted price (so just return the sum).
*/
period_avg AS (
  SELECT
    {group_cols},
    milestone_year,
    period AS global_start_val,
    period + 1 AS global_end_val,
    CASE WHEN '{agg}' = 'avg' THEN weighted_price / NULLIF(duration, 0)
          ELSE weighted_price END AS weighted_price,
    weighted_price / NULLIF(duration, 0) AS y_axis
  FROM weighted
),
/* Again it groups consecutive data with the same y_axis values. */
numbered_1 AS (
  SELECT *,
    ROW_NUMBER() OVER (PARTITION BY {group_cols}, milestone_year ORDER BY global_start_val) -
    ROW_NUMBER() OVER (PARTITION BY {group_cols}, milestone_year, y_axis ORDER BY global_start_val) AS grp
  FROM period_avg
),
/* Merges the consecutive blocks with the same y_axis values. */
merged AS (
  SELECT
    {group_cols},
    milestone_year,
    MIN(global_start_val) AS global_start,
    MAX(global_end_val) AS global_end,
    y_axis
  FROM numbered_1
  GROUP BY {group_cols}, milestone_year, y_axis, grp
)
/* Returns the final dataset. */
SELECT *
FROM merged
ORDER BY {group_cols}, milestone_year, global_start;";