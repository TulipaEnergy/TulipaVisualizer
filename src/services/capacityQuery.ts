/**
 * @fileoverview Asset capacity analysis service for investment and decommission tracking over time.
 * 
 * This module provides comprehensive capacity evolution analysis functionality by interfacing with
 * Rust backend services that handle complex capacity calculations. Tracks asset capacity changes
 * including initial capacity, investments, decommissions, and cumulative capacity evolution.
 * 
 * ## Capacity Analysis Features
 * 
 * - **Capacity Evolution Tracking**: Initial, investment, decommission, and final capacity over time
 * - **Asset-Specific Analysis**: Detailed capacity tracking for individual energy assets
 * - **Year Discovery**: Identification of all available milestone years for analysis
 * - **Missing Data Handling**: Graceful handling of databases without investment/decommission data
 * 
 * ## Business Logic Implementation
 * 
 * - **Initial Capacity**: Base asset units from commissioning specifications
 * - **Investment Capacity**: New capacity additions from optimization decisions
 * - **Decommission Capacity**: Capacity removals and retirements
 * - **Cumulative Calculations**: Final capacity = Initial + Investments - Decommissions
 * 
 * ## Data Interpretation
 * 
 * - **Positive Investment Values**: Capacity additions in MW for the given year
 * - **Positive Decommission Values**: Capacity removals in MW for the given year
 * - **Negative Values (-1)**: Indicates data not available in database schema
 * - **Capacity Evolution**: Year-over-year capacity development trends
 * 
 * ## Business Applications
 * 
 * - Investment planning and capacity expansion analysis
 * - Asset lifecycle management and retirement planning
 * - Energy system capacity adequacy assessment
 * - Long-term energy infrastructure development strategies
 * 
 * ## Technical Implementation
 * 
 * - Secure IPC communication with Rust backend for complex SQL execution
 * - Apache Arrow serialization for efficient numerical data transfer
 * - Type-safe data structures with clear semantics for missing data
 * - Error handling and validation for robust service operation
 * 
 * @module CapacityQuery
 */

import { Table } from "apache-arrow";
import { apacheIPC, genericApacheIPC } from "../gateway/db";

export async function getCapacity(
  dbPath: string,
  assetName: string,
): Promise<CapacityJson[]> {
  return genericApacheIPC<CapacityJson>("get_capacity", {
    dbPath: dbPath,
    assetName: assetName,
  });
}

/**
 * Structured capacity data returned from backend analysis.
 * Negative values (-1) indicate data not available in database schema.
 */
type CapacityJson = {
  year: number;
  /** New capacity investments (MW), -1 if not available */
  investment: number;
  /** Capacity decommissions (MW), -1 if not available */
  decommission: number;
  /** Capacity at start of year (MW) */
  initial_capacity: number;
  /** Capacity at end of year (MW) */
  final_capacity: number;
};

// TO BE MOVED IN TESTING FILE AFTER BACKEND REFACTOR
// export function capacityOverPeriodTest(
//   assetName: string,
//   startYear: number,
//   endYear: number,
// ) {
//   (async () => {
//     try {
//       const table = await executeCustomQuery(
//         capacityQuery(assetName, startYear, endYear),
//       );

//       const yearColumn = table.getChild("year");
//       const capacityColumn = table.getChild("installed_capacity");

//       if (!yearColumn || !capacityColumn) {
//         console.error("Required columns not found in period result");
//         return;
//       }

//       console.log(
//         `Installed capacity for asset '${assetName}' from ${startYear} to ${endYear}:`,
//       );
//       for (let i = 0; i < yearColumn.length; i++) {
//         const year = yearColumn.get(i);
//         const capacity = capacityColumn.get(i);
//         console.log(`Year: ${year}, Capacity: ${capacity}`);
//       }
//     } catch (err) {
//       console.error("Error querying capacity over period:", err);
//     }
//   })();
// }

export async function fetchAvailableYears(
  dbPath: string,
  assetName: string,
): Promise<number[]> {
  try {
    const res: Table<any> = await apacheIPC("get_available_years", {
      dbPath: dbPath,
      assetName: assetName,
    });
    return (res.toArray() as Array<YearJson>).map((item) => item.year); // Convert Apache Arrow Table into JS array
  } catch (err) {
    console.error("Error querying year:", err);
    throw err;
  }
}

type YearJson = {
  year: number;
};
