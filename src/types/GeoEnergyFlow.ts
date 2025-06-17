export interface Region {
  id: number;
  name: string;
  parent_id: number | null;
  level: number; // 0 for EU provinces, 1 for countries
}

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

export interface EnergyFlowBreakdown {
  partnerId: number;
  partnerName: string;
  amount: number;
  percentage: number;
}

export interface EnergyFlowOptions {
  year?: number;
  categoryLevel?: number; // 0 for EU provinces, 1 for countries
  selectedRegions?: string[]; // Names of selected regions/countries
}
