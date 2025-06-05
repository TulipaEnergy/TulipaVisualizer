// Energy flow data types for import/export visualization

// Region/Country data structure
export interface Region {
  id: number;
  name: string;
  parent_id: number | null;
  level: number; // 0 for regions, 1 for countries
}

// Processed country-level data for visualization
export interface CountryEnergyFlow {
  countryId: number;
  countryName: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  totalImports: number;
  totalExports: number;
  importBreakdown: EnergyFlowBreakdown[];
  exportBreakdown: EnergyFlowBreakdown[];
}

// Breakdown data for pie charts
export interface EnergyFlowBreakdown {
  partnerId: number;
  partnerName: string;
  amount: number;
  percentage: number;
}

// Options for the energy flow chart
export interface EnergyFlowOptions {
  year?: number;
  categoryLevel?: number; // 0 for regions, 1 for countries
  selectedRegions?: string[]; // Names of selected regions/countries
}
