/**
 * @fileoverview Renewable energy supply analysis service for demand-supply balance and residual load calculations.
 *
 * This module provides comprehensive renewable energy supply analysis functionality by processing
 * energy flow data from optimization results. Focuses on renewable energy generation patterns,
 * demand satisfaction, and supply-demand balance calculations with metadata filtering capabilities.
 *
 * ## Supply Analysis Methodology
 *
 * - **Renewable Classification**: Identifies renewable assets based on availability profiles
 * - **Consumer Flow Analysis**: Tracks energy flows to demand/consumer assets
 * - **Temporal Aggregation**: Configurable time resolution for different analysis scales
 * - **Metadata Filtering**: Advanced filtering by asset categories and geographic regions
 *
 * ## Renewable Energy Sources Covered
 *
 * - Wind power generation (onshore and offshore)
 * - Solar photovoltaic and thermal systems
 * - Hydroelectric and run-of-river power
 * - Other variable renewable energy technologies
 *
 * ## Analysis Capabilities
 *
 * - **Supply Pattern Analysis**: Renewable generation profiles and variability
 * - **Demand Satisfaction**: How renewable sources meet energy demand
 * - **Grid Integration**: Renewable energy integration challenges and opportunities
 * - **Flexibility Assessment**: Energy system response to renewable variability
 *
 * ## Business Applications
 *
 * - Renewable energy integration planning and optimization
 * - Grid balancing and energy storage requirement analysis
 * - Demand-supply matching and forecasting capabilities
 * - Energy system flexibility and reliability assessment
 *
 * ## Technical Features
 *
 * - Metadata-aware filtering for enhanced analysis granularity
 * - Time resolution aggregation from hourly to yearly scales
 * - Efficient data processing via Apache Arrow serialization
 * - Integration with asset categorization and geographic metadata
 *
 * @module ResidualLoadQuery
 */

import { genericApacheIPC } from "../gateway/db";
import { Resolution, resolutionToTable } from "../types/resolution";
import { hasMetadata } from "./metadata";

export type SupplyRow = {
  asset: string;
  milestone_year: number;
  global_start: number;
  global_end: number;
  y_axis: number;
};

export async function getSupply(
  dbPath: string,
  resolution: Resolution,
  year: number,
  filters: Record<number, number[]>,
  grouper: number[],
): Promise<SupplyRow[]> {
  if (!(resolution in resolutionToTable)) {
    throw new Error(
      "Invalid resolution specified. Use 'hours', 'days', 'weeks', 'months' or 'years'.",
    );
  }

  const enableMetadata: boolean = await hasMetadata(dbPath);

  return genericApacheIPC<SupplyRow>("get_supply", {
    dbPath,
    year,
    resolution: resolutionToTable[resolution],
    filters,
    grouper,
    enableMetadata,
  });
}
