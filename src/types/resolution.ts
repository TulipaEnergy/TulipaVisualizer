/**
 * Time resolution enumeration for data aggregation and analysis.
 * Defines available temporal granularities for energy model data visualization
 * and supports flexible time-series analysis across different scales.
 */
export enum Resolution {
  /** Hourly data points for detailed short-term analysis */
  Hours = "hours",
  /** Daily aggregation for medium-term patterns */
  Days = "days",
  /** Weekly aggregation for seasonal trend analysis */
  Weeks = "weeks",
  /** Monthly aggregation for annual planning */
  Months = "months",
  /** Yearly aggregation for long-term strategic analysis */
  Years = "years",
}

/**
 * Time resolution to hour conversion mapping for database query construction.
 * Maps resolution enums to hour multipliers for SQL aggregation queries.
 * Used by query builders to generate appropriate time grouping clauses.
 */
export const resolutionToTable: Record<Resolution, number> = {
  /** 1 hour per data point for hourly resolution */
  [Resolution.Hours]: 1,
  /** 24 hours per data point for daily aggregation */
  [Resolution.Days]: 24,
  /** 168 hours per data point for weekly aggregation (7 * 24) */
  [Resolution.Weeks]: 168,
  /** 720 hours per data point for monthly aggregation (30 * 24) */
  [Resolution.Months]: 720,
  /** 8760 hours per data point for yearly aggregation (365 * 24) */
  [Resolution.Years]: 8760,
};
