import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useChartTypes } from "../useChartTypes";

describe("useChartTypes Hook", () => {
  it("returns the correct chart types", () => {
    const { result } = renderHook(() => useChartTypes());

    expect(result.current.chartTypes).toHaveLength(8);
    expect(result.current.chartTypes[0]).toEqual({
      value: "capacity",
      label: "Asset capacity",
    });
    expect(result.current.chartTypes[7]).toEqual({
      value: "database",
      label: "SQL explorer",
    });
  });

  it("correctly identifies metadata support", () => {
    const { result } = renderHook(() => useChartTypes());

    expect(result.current.supportsMetadata("residual-load")).toBe(true);
    expect(result.current.supportsMetadata("system-costs")).toBe(true);
    expect(
      result.current.supportsMetadata("production-prices-duration-series"),
    ).toBe(true);
    expect(result.current.supportsMetadata("storage-prices")).toBe(true);

    expect(result.current.supportsMetadata("capacity")).toBe(false);
    expect(result.current.supportsMetadata("database")).toBe(false);
    expect(result.current.supportsMetadata("geo-imports-exports")).toBe(false);
    expect(result.current.supportsMetadata("transportation-prices")).toBe(
      false,
    );
  });

  it("correctly identifies full width charts", () => {
    const { result } = renderHook(() => useChartTypes());

    expect(result.current.isFullWidthChart("database")).toBe(true);
    expect(result.current.isFullWidthChart("capacity")).toBe(false);
    expect(result.current.isFullWidthChart("system-costs")).toBe(false);
  });

  it("returns correct default heights", () => {
    const { result } = renderHook(() => useChartTypes());

    expect(result.current.getDefaultHeight("database")).toBe(1150);
    expect(result.current.getDefaultHeight("capacity")).toBe(400);
    expect(result.current.getDefaultHeight("system-costs")).toBe(400);
  });

  it("returns charts with meta features", () => {
    const { result } = renderHook(() => useChartTypes());

    const metaCharts = result.current.getChartsWithMetaFeatures();
    expect(metaCharts).toEqual([
      "residual-load",
      "system-costs",
      "production-prices-duration-series",
      "storage-prices",
    ]);
  });
});
