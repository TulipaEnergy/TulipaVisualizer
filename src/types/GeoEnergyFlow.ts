// Energy flow data types for import/export visualization

// Processed country-level data for visualization
export interface CountryEnergyFlow {
  id: number;
  group: string;
  totalImport: number;
  totalExport: number;
  importBreakdown: EnergyFlowBreakdown[];
  exportBreakdown: EnergyFlowBreakdown[];
}

// Breakdown data for pie charts
export interface EnergyFlowBreakdown {
  partnerId: number;
  partnerName: string;
  amount: number;
}

// options to use
export interface EnergyFlowOptions {
  level: number;
  year: number;
}
