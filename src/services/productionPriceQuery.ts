/**
 * @fileoverview Production price analysis service for energy market pricing and dual value extraction.
 *
 * This module provides production price analysis functionality by interfacing with Rust backend
 * services that extract dual values from optimization constraint equations. Supports configurable
 * time resolution aggregation and energy carrier filtering for comprehensive price analysis.
 *
 * ## Price Analysis Features
 *
 * - **Dual Value Extraction**: Marginal pricing from capacity constraint equations
 * - **Time Resolution**: Configurable aggregation (hourly, daily, weekly, monthly, yearly)
 * - **Carrier Filtering**: Analysis by specific energy carrier types (electricity, gas, etc.)
 * - **Economic Interpretation**: Market pricing insights and investment guidance
 *
 * ## Data Flow Architecture
 *
 * 1. Frontend requests price data with resolution and carrier parameters
 * 2. Service validates inputs and calls Rust backend via secure IPC
 * 3. Backend extracts dual values from DuckDB optimization results
 * 4. Data aggregated by time resolution and returned via Apache Arrow
 * 5. Results consumed by price visualization components
 *
 * ## Business Applications
 *
 * - Energy market price forecasting and analysis
 * - Investment decision support through dual value insights
 * - Capacity planning optimization guidance
 * - Economic efficiency assessment of energy assets
 *
 * @module ProductionPriceQuery
 */

import { genericApacheIPC } from "../gateway/db";
import { Resolution, resolutionToTable } from "../types/resolution";
import { hasMetadata } from "./metadata";

export async function getProductionPriceDurationSeries(
  dbPath: string,
  resolution: Resolution,
  year: number,
  carrier: string,
  filters: Record<number, number[]>,
  grouper: number[],
): Promise<ProductionPriceDurationSeriesRow[]> {
  if (!(resolution in resolutionToTable)) {
    throw new Error(
      "Invalid resolution specified. Use 'hours', 'days', 'weeks', 'months' or 'years'.",
    );
  }
  const enableMetadata: boolean = await hasMetadata(dbPath);
  return genericApacheIPC<ProductionPriceDurationSeriesRow>(
    "get_production_price_resolution",
    {
      dbPath: dbPath,
      year: year,
      resolution: resolutionToTable[resolution],
      carrier: carrier,
      filters: filters,
      grouper: grouper,
      enableMetadata: enableMetadata,
    },
  );
}

export type ProductionPriceDurationSeriesRow = {
  asset: string;
  milestone_year: number;
  global_start: number;
  global_end: number;
  y_axis: number;
};
