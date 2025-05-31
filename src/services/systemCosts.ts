import { genericApacheIPC } from "../gateway/db";

export async function getAssetCostsByYear(dbPath: string): Promise<
  {
    year: number;
    asset_fixed_costs: number;
    unit_on_costs: number;
  }[]
> {
  const afc = await genericApacheIPC<FixedAssetCostRow>(
    "get_fixed_asset_cost",
    {
      dbPath: dbPath,
    },
  );
  const uoc = await genericApacheIPC<UnitOnCostRow>("get_unit_on_cost", {
    dbPath: dbPath,
  });

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

export async function getFlowCostsByYear(dbPath: string): Promise<
  {
    year: number;
    flow_fixed_costs: number;
    flow_variable_costs: number;
  }[]
> {
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
    return {
      year: year,
      flow_fixed_costs: ff
        .filter((d) => d.milestone_year == year)
        .reduce((sum, item) => sum + item.flow_fixed_cost, 0),
      flow_variable_costs: fv
        .filter((d) => d.milestone_year == year)
        .reduce((sum, item) => sum + item.flow_variable_cost, 0),
    };
  });
}

export interface VariableFlowCost {
  milestone_year: number;
  flow_variable_cost: number;
}
export interface FixedFlowCost {
  milestone_year: number;
  flow_fixed_cost: number;
}

export interface FixedAssetCostRow {
  milestone_year: number;
  asset: string;
  assets_fixed_cost: number;
}

export interface UnitOnCostRow {
  milestone_year: number;
  asset: string;
  unit_on_cost: number;
}
