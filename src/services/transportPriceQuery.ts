/**
 * @fileoverview Transportation price analysis service for energy transmission and transport cost evaluation.
 * 
 * This module provides transportation price analysis functionality by extracting dual values from
 * transport flow limit constraints in energy optimization results. Supports directional flow analysis,
 * carrier-specific pricing, and configurable time resolution for comprehensive transmission cost insights.
 * 
 * ## Transportation Analysis Features
 * 
 * - **Flow Constraint Analysis**: Dual values from transport capacity limit constraints
 * - **Directional Pricing**: Separate analysis for inbound (import) and outbound (export) flows
 * - **Carrier-Specific Analysis**: Transportation costs by energy carrier type
 * - **Time Resolution Support**: Configurable temporal aggregation for different analysis scales
 * 
 * ## Price Interpretation Framework
 * 
 * - **Dual Values**: Marginal cost of additional transport capacity
 * - **Infrastructure Investment**: Guidance for transmission capacity expansion
 * - **Congestion Analysis**: Identification of transport bottlenecks and constraints
 * - **Economic Efficiency**: Assessment of transmission utilization and pricing
 * 
 * ## Business Applications
 * 
 * - Transmission pricing and tariff design for grid operators
 * - Infrastructure investment prioritization and planning
 * - Congestion management and capacity planning strategies
 * - Energy market analysis and cross-border trade evaluation
 * 
 * ## Technical Implementation
 * 
 * - Interfaces with Rust backend for complex SQL query execution
 * - Apache Arrow serialization for efficient data transfer
 * - Input validation and error handling for robust operation
 * - Type-safe data structures for reliable frontend integration
 * 
 * @module TransportPriceQuery
 */

import { genericApacheIPC } from "../gateway/db";
import { Resolution, resolutionToTable } from "../types/resolution";

export async function getTransportationPriceDurationSeries(
  dbPath: string,
  year: number,
  carrier: string,
  resolution: Resolution,
  columnType: string,
): Promise<TransportationPriceDurationSeriesRow[]> {
  if (!(resolution in resolutionToTable)) {
    throw new Error(
      "Invalid resolution specified. Use 'hours', 'days', 'weeks', 'months' or 'years'.",
    );
  }

  return genericApacheIPC<TransportationPriceDurationSeriesRow>(
    "get_transportation_price_resolution",
    {
      dbPath: dbPath,
      year: year,
      carrier: carrier,
      resolution: resolutionToTable[resolution],
      columnType: columnType,
    },
  );
}

/**
 * Retrieves available energy carriers with transportation infrastructure in the model.
 *
 * Carrier Portfolio:
 * - Lists all energy vectors with modeled transmission/transport infrastructure
 * - Enables carrier-specific transportation cost analysis
 * - Supports multi-carrier energy system economic evaluation
 */
export async function getTransportationCarriers(
  dbPath: string,
): Promise<CarrierJson[]> {
  return genericApacheIPC<CarrierJson>("get_transportation_carriers", {
    dbPath: dbPath,
  });
}

export type CarrierJson = {
  carrier: string;
};

export type TransportationPriceDurationSeriesRow = {
  carrier: string;
  milestone_year: number;
  global_start: number;
  global_end: number;
  y_axis: number;
};
