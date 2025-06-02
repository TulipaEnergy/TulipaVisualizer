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