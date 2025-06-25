import { genericApacheIPC } from "../gateway/db";
import {
  CountryEnergyFlow,
  EnergyFlowBreakdown,
  EnergyFlowOptions,
} from "../types/GeoEnergyFlow";

// Get energy flow data
// Tauri sends all data only once, we then structure (and copy) this data
// such that it becomes easier to work with in the frontend
export async function getEnergyFlowData(
  dbPath: string,
  options: EnergyFlowOptions,
): Promise<CountryEnergyFlow[]> {
  let aggregateFlows: AggregateFlowRow[] =
    await genericApacheIPC<AggregateFlowRow>("get_all_aggregate_flows", {
      dbPath: dbPath,
      options: options,
    });
  let detailedFlowsSorted: DetailedFlowRow[] = sortDescending(
    await genericApacheIPC<DetailedFlowRow>("get_all_detailed_flows", {
      dbPath: dbPath,
      options: options,
    }),
  );

  let energyFlows: CountryEnergyFlow[] = [];
  for (let aggregateFlow of aggregateFlows) {
    let importBreakdown: EnergyFlowBreakdown[] = [...detailedFlowsSorted]
      .filter(
        (detailedFlow: DetailedFlowRow) =>
          detailedFlow.toId === aggregateFlow.id && detailedFlow.totFlow > 1e-3,
      )
      .map((df: DetailedFlowRow): EnergyFlowBreakdown => {
        return {
          partnerId: df.fromId,
          partnerName: df.fromName,
          amount: df.totFlow,
        };
      });

    let exportBreakdown: EnergyFlowBreakdown[] = [...detailedFlowsSorted]
      .filter(
        (detailedFlow: DetailedFlowRow) =>
          detailedFlow.fromId === aggregateFlow.id &&
          detailedFlow.totFlow > 1e-3,
      )
      .map((df: DetailedFlowRow): EnergyFlowBreakdown => {
        return {
          partnerId: df.toId,
          partnerName: df.toName,
          amount: df.totFlow,
        };
      });

    let energyFlow: CountryEnergyFlow = {
      ...aggregateFlow,
      importBreakdown: importBreakdown,
      exportBreakdown: exportBreakdown,
    };

    energyFlows.push(energyFlow);
  }

  return energyFlows;
}

// filters on descending magnitude
function sortDescending(flowRows: DetailedFlowRow[]): DetailedFlowRow[] {
  return flowRows.sort((a, b) => b.totFlow - a.totFlow); // THIS SORTS IN DESCENDING ORDER (normally it sorts ascending)
}

// Get available years from actual database queries across all regions
export async function getAvailableYearsFlows(
  dbPath: string,
): Promise<number[]> {
  try {
    return (
      await genericApacheIPC<YearRow>("get_available_years_flows", {
        dbPath: dbPath,
      })
    )
      .map((r) => r.year)
      .sort();
  } catch (e: any) {
    console.error(e);
    return [];
  }
}

// --- TYPES ---
export interface YearRow {
  year: number;
}

export interface AggregateFlowRow {
  id: number;
  group: string;
  totalImport: number;
  totalExport: number;
}

export interface DetailedFlowRow {
  fromId: number;
  fromName: string;
  toId: number;
  toName: string;
  totFlow: number;
}
