import { useState, useEffect, useRef } from "react";
import ReactECharts from "echarts-for-react";
import { ChartType } from "../store/visualizationStore";
import { useChartTypes } from "./useChartTypes";

/**
 * Custom hook that manages resizing functionality for graph components
 * Extracted from GraphCard for better separation of concerns
 */
export const useResizeHandle = (graphId: string, chartType: ChartType) => {
  const { isFullWidthChart, getDefaultHeight } = useChartTypes();
  
  const [height, setHeight] = useState(() => getDefaultHeight(chartType));
  const [isResizing, setIsResizing] = useState(false);
  const [isFullWidth, setIsFullWidth] = useState(() => isFullWidthChart(chartType));
  const chartRef = useRef<ReactECharts>(null);

  // Update height when chart type changes
  useEffect(() => {
    const defaultHeight = getDefaultHeight(chartType);
    setHeight(defaultHeight);
  }, [chartType, getDefaultHeight]);

  // Update width only when chart type changes to database type (which requires full width)
  useEffect(() => {
    if (chartType === "database") {
      setIsFullWidth(true);
    }
    // For other chart types, don't override user's width preference
  }, [chartType]);

  // Handle mouse move during resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        // Limit minimum size
        const minHeight = 200;
        const newHeight = Math.max(
          minHeight,
          e.clientY -
            (document.getElementById(graphId)?.getBoundingClientRect().top || 0),
        );
        setHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, graphId]);

  // Handle ECharts resize when dimensions change
  useEffect(() => {
    if (chartRef.current) {
      const resizeObserver = new ResizeObserver(() => {
        chartRef.current?.getEchartsInstance().resize();
      });

      const chartElement = document.getElementById(graphId);
      if (chartElement) {
        resizeObserver.observe(chartElement);
      }

      return () => {
        if (chartElement) {
          resizeObserver.unobserve(chartElement);
        }
        resizeObserver.disconnect();
      };
    }
  }, [graphId, isFullWidth]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleWidthToggle = () => {
    setIsFullWidth(!isFullWidth);
  };

  return {
    height,
    isResizing,
    isFullWidth,
    chartRef,
    handleResizeStart,
    handleWidthToggle,
  };
}; 