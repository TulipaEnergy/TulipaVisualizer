/**
 * @fileoverview Storage price analysis service for energy storage system valuation and optimization.
 *
 * This module provides comprehensive storage price analysis by extracting dual values from
 * energy balance constraints in optimization results. Supports multiple storage types and
 * time resolutions for flexible storage system economic evaluation.
 *
 * ## Storage Analysis Capabilities
 *
 * - **Multi-Storage Type Support**: Short-term (batteries, pumped hydro) and long-term (seasonal) storage
 * - **Dual Value Analysis**: Marginal value extraction from storage balance constraints
 * - **Time Resolution Options**: Hourly to yearly aggregation for different analysis scales
 * - **Carrier-Specific Analysis**: Storage pricing by energy carrier type
 *
 * ## Storage Types Supported
 *
 * - **Short-term Storage**: Intra-period storage systems (batteries, pumped hydro)
 * - **Long-term Storage**: Inter-period storage systems (seasonal storage, hydrogen)
 * - **Combined Analysis**: Comparative analysis across multiple storage technologies
 *
 * ## Economic Insights
 *
 * - Storage system valuation and ROI calculations
 * - Energy arbitrage opportunity identification
 * - Optimal storage sizing and placement analysis
 * - Storage technology comparison and selection guidance
 *
 * ## Integration Architecture
 *
 * - Rust backend handles complex SQL queries and dual value extraction
 * - Apache Arrow serialization for efficient data transfer
 * - Type-safe interfaces for reliable frontend integration
 * - Error handling and validation at service boundaries
 *
 * @module StoragePriceQuery
 */

import { genericApacheIPC } from "../gateway/db";
import { Resolution, resolutionToTable } from "../types/resolution";
import { hasMetadata } from "./metadata";

export async function getStoragePriceDurationSeries(
  dbPath: string,
  resolution: Resolution,
  year: number,
  storageType: string,
  carrier: string,
  filters: Record<number, number[]>,
  grouper: number[],
): Promise<StoragePriceDurationSeriesRow[]> {
  if (!(resolution in resolutionToTable)) {
    throw new Error(
      "Invalid resolution specified. Use 'hours', 'days', 'weeks', 'months' or 'years'.",
    );
  }

  const enableMetadata: boolean = await hasMetadata(dbPath);
  return genericApacheIPC<StoragePriceDurationSeriesRow>(
    "get_storage_price_resolution",
    {
      dbPath: dbPath,
      year: year,
      resolution: resolutionToTable[resolution],
      storageType: storageType,
      carrier: carrier,
      filters: filters,
      grouper: grouper,
      enableMetadata: enableMetadata,
    },
  );
}

export type StoragePriceDurationSeriesRow = {
  asset: string;
  milestone_year: number;
  global_start: number;
  global_end: number;
  y_axis: number;
};
