"use client";

import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries } from "lightweight-charts";

interface PriceBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export function PriceChartWrapper({ data }: { data: PriceBar[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: "#ffffff" },
        textColor: "#333",
      },
      grid: {
        vertLines: { color: "#f0f0f0" },
        horzLines: { color: "#f0f0f0" },
      },
      timeScale: {
        borderColor: "#ddd",
      },
      rightPriceScale: {
        borderColor: "#ddd",
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#ef4444",
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
      borderVisible: false,
    });

    candlestickSeries.setData(data as Parameters<typeof candlestickSeries.setData>[0]);
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-gray-400">
        No price data available
      </div>
    );
  }

  return <div ref={containerRef} className="w-full" />;
}
