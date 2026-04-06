"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

export function ScreenerActions() {
  const t = useTranslations("common");
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function runScreen() {
    setRunning(true);
    setStatus("Running screening engine...");
    try {
      const res = await fetch("/api/screen", { method: "POST" });
      const data = await res.json();
      setStatus(`Screened ${data.screened} companies`);
      router.refresh();
    } catch (error) {
      setStatus("Screening failed");
    } finally {
      setRunning(false);
      setTimeout(() => setStatus(null), 5000);
    }
  }

  async function refreshData(type: string) {
    setRunning(true);
    setStatus(
      type === "prices"
        ? "Syncing prices (this may take a while)..."
        : type === "financials"
          ? "Syncing financials (this may take a while)..."
          : "Full sync in progress..."
    );
    try {
      const res = await fetch("/api/data/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (data.success) {
        const parts = [];
        if (data.results.prices) parts.push(`${data.results.prices} prices`);
        if (data.results.financials) parts.push(`${data.results.financials} financials`);
        if (data.results.screened) parts.push(`${data.results.screened} screened`);
        setStatus(`Done: ${parts.join(", ")}`);
      } else {
        setStatus(data.error || "Failed");
      }
      router.refresh();
    } catch {
      setStatus("Sync failed");
    } finally {
      setRunning(false);
      setTimeout(() => setStatus(null), 10000);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <div className="relative group">
          <button
            disabled={running}
            className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Sync Data ▾
          </button>
          <div className="absolute end-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
            <button
              onClick={() => refreshData("prices")}
              disabled={running}
              className="block w-full text-start px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Update Prices
            </button>
            <button
              onClick={() => refreshData("financials")}
              disabled={running}
              className="block w-full text-start px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Update Financials
            </button>
            <button
              onClick={() => refreshData("all")}
              disabled={running}
              className="block w-full text-start px-4 py-2 text-sm text-emerald-700 font-medium hover:bg-emerald-50 disabled:opacity-50 border-t border-gray-100"
            >
              Full Sync + Screen
            </button>
          </div>
        </div>
        <button
          onClick={runScreen}
          disabled={running}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {running ? t("loading") : "Run Screen"}
        </button>
      </div>
      {status && (
        <span className="text-xs text-gray-500 animate-pulse">{status}</span>
      )}
    </div>
  );
}
