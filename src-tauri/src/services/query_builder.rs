use std::collections::HashMap;

/// Builds a SQL query to calculate resolution-based values for a given source table.
/// This version supports two resolution methods: representative periods and clustered periods.
///
/// # Arguments
///
/// * `source_table` - The name of the source SQL table.
/// * `value_col` - The name of the column containing values to aggregate.
/// * `group_cols` - A list of column names to group by.
/// * `agg` - Aggregation method (e.g., "avg", "sum").
/// * `resolution` - Resolution period length (e.g., 24 for daily).
/// * `clustered` - Whether to use the clustered resolution strategy.
///
/// # Returns
///
/// A `String` containing the generated SQL query.
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
    let group_cols_comparisons = group_cols
        .iter()
        .map(|col| format!("d.{} = f.{}", col, col))
        .collect::<Vec<_>>()
        .join(" AND ");

        combine_sql
            .replace("{group_cols}", &group_cols_sql)
            .replace("{group_cols_comparisons}", &group_cols_comparisons)
            .replace("{value_col}", value_col)
            .replace("{source_table}", source_table)
            .replace("{agg}", agg)
            .replace("{period_length}", resolution)
}

/// Builds a SQL query that combines both clustered and representative period resolutions.
///
/// # Arguments
///
/// * `source_table` - The name of the source SQL table.
/// * `source_table_1` - Table for clustered data.
/// * `value_col` - The name of the column containing values to aggregate.
/// * `group_cols` - A list of column names to group by.
/// * `agg` - Aggregation method (e.g., "avg", "sum").
/// * `resolution` - Resolution period length (e.g., 24 for daily).
/// 
/// # Returns
///
/// A `String` containing the generated SQL query.
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
  let group_cols_comparisons = group_cols
        .iter()
        .map(|col| format!("d.{} = f.{}", col, col))
        .collect::<Vec<_>>()
        .join(" AND ");

    combine_sql
        .replace("{group_cols}", &group_cols_sql)
        .replace("{group_cols_comparisons}", &group_cols_comparisons)
        .replace("{value_col}", value_col)
        .replace("{source_table}", source_table)
        .replace("{source_table_1}", source_table_1)
        .replace("{agg}", agg)
        .replace("{period_length}", resolution)
}

/// Builds a SQL query for resolution-based aggregation with category-based filters.
///
/// # Arguments
///
/// * `source_table` - The name of the source SQL table.
/// * `value_col` - The name of the column containing values to aggregate.
/// * `group_cols` - A list of column names to group by.
/// * `agg` - Aggregation method (e.g., "avg", "sum").
/// * `resolution` - Resolution period length (e.g., 24 for daily).
/// * `filters_by_category` - Map where each key is a root category ID and the value is a list of leaf or internal node category IDs.
///
/// # Returns
///
/// A `String` representing the SQL query with category-based filters.
pub fn build_resolution_query_with_filters(
    source_table: &str,
    value_col: &str,
    group_cols: &[&str],
    agg: &str,
    resolution: &str,
    filters_by_category: &HashMap<i32, Vec<i32>>,
) -> String {
    let group_cols_sql = group_cols.join(", ");
    let filter_conditions = build_filter_conditions(filters_by_category);

    // Build individual column comparisons for WHERE clauses
    let group_cols_comparisons = group_cols.to_vec()
        .iter()
        .map(|col| format!("d.{} = f.{}", col, col))
        .collect::<Vec<_>>()
        .join(" AND ");
    
    let combine_sql = REP_PERIOD_RESOLUTION_SQL.to_string()
            + &LAST_PART_SQL.replace("{final}", "final_rep_periods");

    combine_sql
        .replace("{group_cols}", &group_cols_sql)
        .replace("{group_cols_comparisons}", &group_cols_comparisons)
        .replace("{value_col}", value_col)
        .replace("{source_table}", source_table)
        .replace("{agg}", agg)
        .replace("{period_length}", resolution)
        .replace("{filter_conditions}", &filter_conditions)
}

/// Builds SQL filter conditions for a map of category filters.
/// 
/// # Arguments
///
/// * `filters_by_category` - Map where each key is a root category ID and the value is a list of leaf or internal node category IDs.
///
/// # Returns
///
/// A string of SQL `AND` filter conditions.
fn build_filter_conditions(filters_by_category: &HashMap<i32, Vec<i32>>) -> String {
    if filters_by_category.is_empty() {
        return String::new();
    }

    let mut conditions = Vec::new();

    for (root_id, leaf_ids) in filters_by_category {
        if leaf_ids.is_empty() {
            continue;
        }
        let ids_list: Vec<String> = leaf_ids.iter().map(ToString::to_string).collect();
        let ids_csv = ids_list.join(", ");

        // Build a recursive CTE to find all descendants of the filtered nodes, including the filtered nodes themselves.
        let desc_cte = format!(
            "WITH RECURSIVE sub{0} AS (  
                SELECT id FROM category WHERE id IN ({1})  
              UNION ALL  
                SELECT c.id FROM category c JOIN sub{0} s ON c.parent_id = s.id
            )",
            root_id, ids_csv
        );

        // Simply check if the asset's category (ac.leaf_id) is a included in the filtered nodes (sub{0}).
        let condition = format!(
            "EXISTS (
                {desc_cte}
                SELECT 1
                FROM asset_category ac{0}
                WHERE ac{0}.asset = f.from_asset
                  AND ac{0}.root_id = {0}
                  AND ac{0}.leaf_id IN (SELECT id FROM sub{0})
            )",
            root_id,
            desc_cte = desc_cte.replace("\n", " ")
        );

        conditions.push(condition);
    }

    if conditions.is_empty() {
        String::new()
    } else {
        format!("AND {}", conditions.join(" AND "))
    }
}


/// Builds a SQL query for resolution-based aggregation with both category-based filters and breakdown support.
///
/// # Arguments
///
/// * `source_table` - The name of the source SQL table.
/// * `value_col` - The name of the column containing values to aggregate.
/// * `breakdown_cols` - A list of breakdown column names to include in grouping.
/// * `agg` - Aggregation method (e.g., "avg", "sum").
/// * `resolution` - Resolution period length (e.g., 24 for daily).
/// * `filters_by_category` - Map where each key is a root category ID and the value is a list of leaf or internal node category IDs.
/// * `grouper` - List of breakdown node IDs to group by.
///
/// # Returns
///
/// A `String` representing the SQL query with both filters and breakdown support.
pub fn build_resolution_query_with_filters_and_breakdown(
    source_table: &str,
    value_col: &str,
    breakdown_cols: &[String],
    agg: &str,
    resolution: &str,
    filters_by_category: &HashMap<i32, Vec<i32>>,
    grouper: &[i32],
) -> String {
    // For breakdown, we group by the breakdown categories, not individual assets
    let breakdown_refs: Vec<&str> = breakdown_cols.iter().map(String::as_str).collect();
    let group_cols_sql = breakdown_refs.join(", ");

    // Build individual column comparisons for WHERE clauses
    let group_cols_comparisons = breakdown_refs.to_vec()
        .iter()
        .map(|col| format!("d.{} = f.{}", col, col))
        .collect::<Vec<_>>()
        .join(" AND ");
    
    let filter_conditions = build_filter_conditions(filters_by_category);
    let breakdown_joins = build_breakdown_joins(grouper);
    let breakdown_selects = build_breakdown_selects(grouper);
    let breakdown_case_conditions = build_breakdown_case_conditions(grouper);
    let breakdown_group_by = build_breakdown_group_by(grouper);
    
    let combine_sql = REP_PERIOD_RESOLUTION_SQL.to_string()
            + &LAST_PART_SQL.replace("{final}", "final_rep_periods");

    combine_sql
        .replace("{group_cols}", &group_cols_sql)
        .replace("{group_cols_comparisons}", &group_cols_comparisons)
        .replace("{value_col}", value_col)
        .replace("{source_table}", source_table)
        .replace("{agg}", agg)
        .replace("{period_length}", resolution)
        .replace("{filter_conditions}", &filter_conditions)
        .replace("{breakdown_joins}", &breakdown_joins)
        .replace("{breakdown_selects}", &breakdown_selects)
        .replace("{breakdown_case_conditions}", &breakdown_case_conditions)
        .replace("{breakdown_group_by}", &breakdown_group_by)
}

/// Builds breakdown column names for SQL GROUP BY clause
pub fn build_breakdown_columns(grouper: &[i32]) -> Vec<String> {
    let mut columns = vec!["asset".to_string()]; // Always include asset column
    columns.extend(
        grouper.iter()
            .map(|&node_id| format!("breakdown_{}", node_id))
    );
    columns
}

/// Builds CASE conditions for breakdown categorization
/// This creates the logic to categorize assets into breakdown groups or 'Other'
pub fn build_breakdown_case_conditions(grouper: &[i32]) -> String {
    if grouper.is_empty() {
        return "bf.from_asset".to_string();
    }

    let mut conditions = Vec::new();
    
    for &node_id in grouper {
        let condition = format!(
            "WHEN EXISTS (
                WITH RECURSIVE descendants_{0} AS (
                    SELECT id FROM category WHERE id = {0}
                    UNION ALL
                    SELECT c.id FROM category c 
                    JOIN descendants_{0} d ON c.parent_id = d.id
                )
                SELECT 1 FROM asset_category ac_{0}
                WHERE ac_{0}.asset = bf.from_asset
                  AND ac_{0}.leaf_id IN (SELECT id FROM descendants_{0})
                LIMIT 1
            ) THEN c{0}.name",
            node_id
        );
        conditions.push(condition);
    }
    
    conditions.join("\n        ")
}

/// Builds JOIN clauses for breakdown nodes with proper category hierarchy handling
pub fn build_breakdown_joins(grouper: &[i32]) -> String {
   let mut joins = Vec::new();
    
    for &node_id in grouper {
        let join = format!(
            "LEFT JOIN category c{0} ON c{0}.id = {0}",
            node_id
        );
        joins.push(join);
    }
    
    joins.join("\n    ")
}

/// Builds SELECT clauses for breakdown columns with proper aggregation
pub fn build_breakdown_selects(grouper: &[i32]) -> String {
    if grouper.is_empty() {
        return String::new();
    }
    
    let selects: Vec<String> = grouper.iter()
        .map(|&node_id| {
            format!("c{}.name AS breakdown_{}", node_id, node_id)
        })
        .collect();
    
    format!(",\n      {}", selects.join(",\n      "))
}

/// Builds GROUP BY clauses for breakdown columns
pub fn build_breakdown_group_by(grouper: &[i32]) -> String {
    if grouper.is_empty() {
        return String::new();
    }
    
    let group_bys: Vec<String> = grouper.iter()
        .map(|&node_id| {
            format!("c{}.name", node_id)
        })
        .collect();
    
    format!(",\n      {}", group_bys.join(",\n      "))
}

// --- QUERIES ---

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
      WHERE {group_cols_comparisons}
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