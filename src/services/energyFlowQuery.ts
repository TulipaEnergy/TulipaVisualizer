import { Table } from "apache-arrow";
import { apacheIPC } from "../gateway/db";
import {
  CountryEnergyFlow,
  EnergyFlowBreakdown,
  Region,
} from "../types/GeoEnergyFlow";

export type ImportExportRow = {
  root_cat_in_id: number;
  cat_in_name: string;
  root_cat_out_id: number;
  cat_out_name: string;
  year: number;
  tot_flow: number;
};

// Hardcoded regions/countries data as provided
const REGIONS: Region[] = [
  { id: 0, name: "South-Holland", parent_id: 3, level: 0 },
  { id: 1, name: "North-Holland", parent_id: 3, level: 0 },
  { id: 2, name: "Antwerp", parent_id: 4, level: 0 },
  { id: 3, name: "Netherlands", parent_id: null, level: 1 },
  { id: 4, name: "Belgium", parent_id: null, level: 1 },
];

// Mapping between database region names and EU provinces GeoJSON feature names
const REGION_NAME_MAPPING: Record<string, string> = {
  // Dutch provinces - mapping from database names to EU provinces GeoJSON names
  "South-Holland": "South Holland",
  "North-Holland": "North Holland",
  Utrecht: "Utrecht",
  Gelderland: "Gelderland",
  Overijssel: "Overijssel",
  // Add more Dutch provinces as needed
  "Zuid-Holland": "South Holland", // Alternative name mapping
  "Noord-Holland": "North Holland", // Alternative name mapping

  // Belgian provinces
  Antwerp: "Antwerp", // Keep as is for Belgium regions

  // Countries
  Netherlands: "Netherlands", // Keep as is for country level
  Belgium: "Belgium", // Keep as is for country level
};

// Get the GeoJSON compatible name for a region
export function getGeoJSONName(databaseName: string): string {
  return REGION_NAME_MAPPING[databaseName] || databaseName;
}

// Get available regions by level
export function getRegionsByLevel(level: number): Region[] {
  return REGIONS.filter((r) => r.level === level);
}

// Get all regions
export function getAllRegions(): Region[] {
  return [...REGIONS];
}

// Get energy flow data with simplified logic - no aggregation
export async function getEnergyFlowData(
  dbFilePath: string,
  categoryLevel: number,
  year: number,
): Promise<CountryEnergyFlow[]> {
  try {
    // Get regions for the specified level
    const targetRegions = getRegionsByLevel(categoryLevel);

    const results: CountryEnergyFlow[] = [];

    for (const region of targetRegions) {
      try {
        // Get import data using direct apacheIPC call
        const importRes: Table<any> = await apacheIPC("get_import", {
          dbPath: dbFilePath,
          catName: region.name,
        });
        const importData = importRes.toArray() as Array<ImportExportRow>;

        const yearImports = importData.filter((d) => {
          return d.year === year;
        });

        // Get export data using direct apacheIPC call
        const exportRes: Table<any> = await apacheIPC("get_export", {
          dbPath: dbFilePath,
          catName: region.name,
        });
        const exportData = exportRes.toArray() as Array<ImportExportRow>;

        const yearExports = exportData.filter((d) => {
          return d.year === year;
        });
        // Calculate totals
        const totalImports = yearImports.reduce((sum, record) => {
          const flow = record.tot_flow || 0;
          return sum + flow;
        }, 0);

        const totalExports = yearExports.reduce((sum, record) => {
          const flow = record.tot_flow || 0;
          return sum + flow;
        }, 0);

        // Process import breakdown (imports = flow INTO this region)
        const importBreakdown: EnergyFlowBreakdown[] = [];
        const importByPartner = new Map<
          string,
          { amount: number; id: number }
        >();

        yearImports.forEach((record, _) => {
          if (record.cat_out_name && record.tot_flow) {
            const current = importByPartner.get(record.cat_out_name) || {
              amount: 0,
              id: record.root_cat_out_id,
            };
            current.amount += record.tot_flow;
            importByPartner.set(record.cat_out_name, current);
          }
        });

        for (const [partner, data] of importByPartner.entries()) {
          const breakdown = {
            partnerId: data.id,
            partnerName: partner,
            amount: data.amount,
            percentage:
              totalImports > 0 ? (data.amount / totalImports) * 100 : 0,
          };
          importBreakdown.push(breakdown);
        }

        // Process export breakdown (exports = flow FROM this region)
        const exportBreakdown: EnergyFlowBreakdown[] = [];
        const exportByPartner = new Map<
          string,
          { amount: number; id: number }
        >();

        yearExports.forEach((record, _) => {
          if (record.cat_in_name && record.tot_flow) {
            const current = exportByPartner.get(record.cat_in_name) || {
              amount: 0,
              id: record.root_cat_in_id,
            };
            current.amount += record.tot_flow;
            exportByPartner.set(record.cat_in_name, current);
          }
        });

        for (const [partner, data] of exportByPartner.entries()) {
          const breakdown = {
            partnerId: data.id,
            partnerName: partner,
            amount: data.amount,
            percentage:
              totalExports > 0 ? (data.amount / totalExports) * 100 : 0,
          };
          exportBreakdown.push(breakdown);
        }

        // Sort breakdowns by amount
        importBreakdown.sort((a, b) => b.amount - a.amount);
        exportBreakdown.sort((a, b) => b.amount - a.amount);

        const regionResult = {
          countryId: region.id,
          countryName: region.name,
          coordinates: { latitude: 0, longitude: 0 }, // Placeholder coordinates
          totalImports,
          totalExports,
          importBreakdown,
          exportBreakdown,
        };

        results.push(regionResult);
      } catch (regionError) {
        console.error(`Error processing region ${region.name}:`, regionError);
        console.error(
          `Region error stack:`,
          regionError instanceof Error
            ? regionError.stack
            : "No stack available",
        );
        // Continue with other regions
      }
    }

    return results;
  } catch (error) {
    console.error("Error in getEnergyFlowData:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack available",
    );
    // Return mock data as fallback
    return [];
  }
}

// Get available years from actual database queries across all regions
export async function getAvailableYears(dbFilePath: string): Promise<number[]> {
  try {
    const years = new Set<number>();

    // Query all regions to get comprehensive year coverage
    for (const region of REGIONS) {
      try {
        // Get import data using direct apacheIPC call
        const importRes: Table<any> = await apacheIPC("get_import", {
          dbPath: dbFilePath,
          catName: region.name,
        });
        const imports = importRes.toArray() as Array<ImportExportRow>;

        if (Array.isArray(imports) && imports.length > 0) {
          imports.forEach((record, _) => {
            // Try different ways to get the year
            const yearValue = record.year;
            const yearNum = Number(yearValue);

            if (yearValue && !isNaN(yearNum)) {
              years.add(yearNum);
            }
          });
        } else if (Array.isArray(imports)) {
          console.log(`No import records found for ${region.name}`);
        }

        // Get export data using direct apacheIPC call
        const exportRes: Table<any> = await apacheIPC("get_export", {
          dbPath: dbFilePath,
          catName: region.name,
        });
        const exports = exportRes.toArray() as Array<ImportExportRow>;

        if (Array.isArray(exports) && exports.length > 0) {
          exports.forEach((record, _) => {
            // Try different ways to get the year
            const yearValue = record.year;
            const yearNum = Number(yearValue);

            if (yearValue && !isNaN(yearNum)) {
              years.add(yearNum);
            }
          });
        } else if (Array.isArray(exports)) {
          console.log(`No export records found for ${region.name}`);
        }
      } catch (regionError) {
        console.warn(
          `Failed to get data for region ${region.name}:`,
          regionError,
        );
        // Continue with other regions
      }
    }

    const availableYears = Array.from(years).sort((a, b) => a - b);

    return availableYears;
  } catch (error) {
    console.error("Error getting available years:", error);
    return [];
  }
}
