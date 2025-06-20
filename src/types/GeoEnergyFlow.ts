/**
 * Geographic region data structure for hierarchical energy model categorization.
 * Supports multi-level geographic analysis from provinces to countries to continents.
 */
export interface Region {
  /** Unique database identifier for the geographic region */
  id: number;
  /** Human-readable region name (e.g., "Netherlands", "South-Holland") */
  name: string;
  /** Parent region ID for hierarchical relationships, null for top-level regions */
  parent_id: number | null;
  /** Hierarchical level: 0 for EU provinces, 1 for countries, 2 for continents */
  level: number;
}

/**
 * Energy flow data aggregated by country with bilateral trade breakdown.
 * Provides comprehensive trade analysis including partner-specific flows
 * and percentage contributions for import/export balance calculations.
 */
export interface CountryEnergyFlow {
  /** Unique country identifier matching Region.id */
  countryId: number;
  /** Country display name for UI presentation */
  countryName: string;
  /** Geographic center point for map visualization placement */
  coordinates: {
    /** Latitude coordinate in decimal degrees */
    latitude: number;
    /** Longitude coordinate in decimal degrees */
    longitude: number;
  };
  /** Total energy imports in MWh for the analysis period */
  totalImports: number;
  /** Total energy exports in MWh for the analysis period */
  totalExports: number;
  /** Detailed breakdown of import flows by trading partner */
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
  /** Percentage of total trade volume with this partner (0-100) */
  percentage: number;
}

/**
 * Configuration options for energy flow analysis and visualization.
 * Controls temporal scope, geographic detail level, and regional filtering
 * for customized energy trade analysis scenarios.
 */
export interface EnergyFlowOptions {
  /** Analysis year for milestone data filtering, defaults to latest available */
  year?: number;
  /** Geographic detail level: 0 for EU provinces, 1 for countries */
  categoryLevel?: number;
  /** Array of region names to include in analysis, undefined for all regions */
  selectedRegions?: string[];
}
