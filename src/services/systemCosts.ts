import { genericApacheIPC } from "../gateway/db";

export async function getAssetCostsByYear(
  dbPath: string,
): Promise<AssetSystemCostPerYear[]> {
  const afc = await genericApacheIPC<FixedAssetCostRow>(
    "get_fixed_asset_cost",
    {
      dbPath: dbPath,
    },
  );
  const uoc = await genericApacheIPC<UnitOnCostRow>("get_unit_on_cost", {
    dbPath: dbPath,
  });

  // Create unified year timeline from both cost categories
  const years: number[] = [
    ...new Set(
      uoc.map((i) => i.milestone_year).concat(afc.map((i) => i.milestone_year)),
    ),
  ].sort((a, b) => a - b);

  return years.map((year) => {
    return {
      year: year,
      unit_on_costs: uoc
        .filter((d) => d.milestone_year == year)
        .reduce((sum, item) => sum + item.unit_on_cost, 0),
      asset_fixed_costs: afc
        .filter((d) => d.milestone_year == year)
        .reduce((sum, item) => sum + item.assets_fixed_cost, 0),
    };
  });
}

export async function getFlowCostsByYear(
  dbPath: string,
): Promise<FlowSystemCostPerYear[]> {
  const ff = await genericApacheIPC<FixedFlowCost>("get_fixed_flow_cost", {
    dbPath: dbPath,
  });
  const fv = await genericApacheIPC<VariableFlowCost>(
    "get_variable_flow_cost",
    {
      dbPath: dbPath,
    },
  );

  const years: number[] = [
    ...new Set(
      ff.map((i) => i.milestone_year).concat(fv.map((i) => i.milestone_year)),
    ),
  ].sort((a, b) => a - b);

  return years.map((year) => {
    const flow_fixed_costs_by_carrier: { [carrier: string]: number } = {};
    const flow_variable_costs_by_carrier: { [carrier: string]: number } = {};

    // Aggregate fixed costs by carrier, filtering positive values only
    ff.filter((d) => d.milestone_year === year).forEach((item) => {
      if (item.flow_fixed_cost > 0) {
        flow_fixed_costs_by_carrier[item.carrier] =
          (flow_fixed_costs_by_carrier[item.carrier] || 0) +
          item.flow_fixed_cost;
      }
    });

    // Aggregate variable costs by carrier, filtering positive values only
    fv.filter((d) => d.milestone_year === year).forEach((item) => {
      if (item.flow_variable_cost > 0) {
        flow_variable_costs_by_carrier[item.carrier] =
          (flow_variable_costs_by_carrier[item.carrier] || 0) +
          item.flow_variable_cost;
      }
    });

    return {
      year: year,
      flow_fixed_costs_by_carrier: flow_fixed_costs_by_carrier,
      flow_variable_costs_by_carrier: flow_variable_costs_by_carrier,
    };
  });
}

/**
 * Extracts unique energy carriers from flow cost data for UI filtering.
 * Provides sorted list of all carriers with associated costs in the dataset.
 */
export function getUniqueCarriers(data: FlowSystemCostPerYear[]): string[] {
  const carriers = new Set<string>();
  data.forEach((item) => {
    Object.keys(item.flow_fixed_costs_by_carrier).forEach((carrier) =>
      carriers.add(carrier),
    );
    Object.keys(item.flow_variable_costs_by_carrier).forEach((carrier) =>
      carriers.add(carrier),
    );
  });
  return Array.from(carriers).sort();
}

/**
 * Combines year ranges from asset and flow cost data for comprehensive timeline analysis.
 * Ensures UI components can handle full temporal scope of optimization results.
 */
export function getUniqueYears(
  assetData: AssetSystemCostPerYear[],
  flowData: FlowSystemCostPerYear[],
): number[] {
  return [
    ...new Set([...assetData, ...flowData].map((item) => item.year)),
  ].sort((a, b) => a - b);
}

interface VariableFlowCost {
  milestone_year: number;
  carrier: string;
  flow_variable_cost: number;
}
interface FixedFlowCost {
  milestone_year: number;
  carrier: string;
  flow_fixed_cost: number;
}

interface FixedAssetCostRow {
  milestone_year: number;
  asset: string;
  assets_fixed_cost: number;
}

interface UnitOnCostRow {
  milestone_year: number;
  asset: string;
  unit_on_cost: number;
}

export interface AssetSystemCostPerYear {
  year: number;
  asset_fixed_costs: number;
  unit_on_costs: number;
}

export interface FlowSystemCostPerYear {
  year: number;
  flow_fixed_costs_by_carrier: { [carrier: string]: number };
  flow_variable_costs_by_carrier: { [carrier: string]: number };
}
