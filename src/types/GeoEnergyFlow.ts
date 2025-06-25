// Energy flow data types for import/export visualization

/**
 * Energy flow data aggregated by country with bilateral trade breakdown.
 * Provides comprehensive trade analysis including partner-specific flows
 * and percentage contributions for import/export balance calculations.
 */
export interface CountryEnergyFlow {
  id: number;
  group: string;
  totalImport: number;
  totalExport: number;
  importBreakdown: EnergyFlowBreakdown[];
  /** Detailed breakdown of export flows by trading partner */
  exportBreakdown: EnergyFlowBreakdown[];
}

/**
 * Bilateral energy trade data between two regions.
 * Provides detailed partner-specific flow information for trade analysis
 * and visualization with both absolute values and relative percentages.
 */
export interface EnergyFlowBreakdown {
  /** Trading partner's unique region identifier */
  partnerId: number;
  /** Trading partner's display name */
  partnerName: string;
  /** Energy flow amount in MWh for the analysis period */
  amount: number;
}

// options to use
export interface EnergyFlowOptions {
  level: number;
  year: number;
}
