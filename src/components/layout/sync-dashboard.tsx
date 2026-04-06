"use client";

import { useState, useEffect } from "react";

interface SyncStatus {
  companies: {
    total: number;
    active: number;
    main: number;
    nomu: number;
    reit: number;
    withPrices: number;
    withFinancials: number;
  };
  prices: {
    totalBars: number;
  };
  lastSync: {
    prices: SyncLogEntry | null;
    financials: SyncLogEntry | null;
    companies: SyncLogEntry | null;
  };
  recentLogs: SyncLogEntry[];
}

interface SyncLogEntry {
  id: number;
  syncType: string;
  startedAt: string;
  completedAt: string | null;
  status: string;
  recordsAffected: number | null;
  errorMessage: string | null;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "success" ? "bg-green-500" :
    status === "running" ? "bg-blue-500 animate-pulse" :
    status === "partial" ? "bg-yellow-500" :
    "bg-red-500";
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function SyncDashboard({ locale }: { locale: string }) {
  const [data, setData] = useState<SyncStatus | null>(null);
  const [tick, setTick] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  // Fetch status every 5 seconds
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/sync-status");
        const json = await res.json();
        setData(json);
      } catch {}
    };
    fetchStatus();
    const interval = setInterval(() => {
      fetchStatus();
      setTick((t) => t + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Elapsed timer (counts up every second)
  useEffect(() => {
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-300 border-t-emerald-600 rounded-full" />
      </div>
    );
  }

  const pctWithPrices = data.companies.active > 0
    ? Math.round((data.companies.withPrices / data.companies.active) * 100)
    : 0;

  const pctWithFinancials = data.companies.active > 0
    ? Math.round((data.companies.withFinancials / data.companies.active) * 100)
    : 0;

  const isRunning = data.recentLogs.some((l) => l.status === "running");

  return (
    <div className="space-y-6">
      {/* Live indicator */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        Live — refreshing every 5s
        <span className="ms-auto font-mono text-xs">
          Page open: {Math.floor(elapsed / 60)}m {elapsed % 60}s
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Companies Discovered"
          value={data.companies.active}
          sub={`Main: ${data.companies.main} | Nomu: ${data.companies.nomu} | REITs: ${data.companies.reit}`}
        />
        <StatCard
          label="With Price Data"
          value={`${data.companies.withPrices} / ${data.companies.active}`}
          sub={`${pctWithPrices}% coverage`}
        />
        <StatCard
          label="With Financial Data"
          value={`${data.companies.withFinancials} / ${data.companies.active}`}
          sub={`${pctWithFinancials}% coverage`}
        />
        <StatCard
          label="Total Price Bars"
          value={data.prices.totalBars.toLocaleString()}
          sub="Daily OHLCV records"
        />
      </div>

      {/* Progress bars */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <h2 className="font-semibold text-gray-900">Data Coverage</h2>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Price Data</span>
            <span className="font-medium">{pctWithPrices}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className="bg-emerald-500 h-3 rounded-full transition-all duration-1000"
              style={{ width: `${pctWithPrices}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Financial Data</span>
            <span className="font-medium">{pctWithFinancials}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className="bg-blue-500 h-3 rounded-full transition-all duration-1000"
              style={{ width: `${pctWithFinancials}%` }}
            />
          </div>
        </div>
      </div>

      {/* Last sync times */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="font-semibold text-gray-900 mb-3">Last Sync</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Companies</p>
            <p className="font-medium">
              {data.lastSync.companies?.completedAt
                ? timeAgo(data.lastSync.companies.completedAt)
                : "Never"}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Prices</p>
            <p className="font-medium">
              {data.lastSync.prices?.completedAt
                ? timeAgo(data.lastSync.prices.completedAt)
                : "Never"}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Financials</p>
            <p className="font-medium">
              {data.lastSync.financials?.completedAt
                ? timeAgo(data.lastSync.financials.completedAt)
                : "Never"}
            </p>
          </div>
        </div>
      </div>

      {/* Recent sync log */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="font-semibold text-gray-900 mb-3">Sync Log</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-start text-xs text-gray-500 uppercase border-b">
                <th className="pb-2 pe-4">Status</th>
                <th className="pb-2 pe-4">Type</th>
                <th className="pb-2 pe-4">Started</th>
                <th className="pb-2 pe-4">Duration</th>
                <th className="pb-2 pe-4">Records</th>
                <th className="pb-2">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.recentLogs.map((log) => {
                const duration =
                  log.startedAt && log.completedAt
                    ? Math.round(
                        (new Date(log.completedAt).getTime() -
                          new Date(log.startedAt).getTime()) /
                          1000
                      )
                    : null;
                return (
                  <tr key={log.id}>
                    <td className="py-1.5 pe-4">
                      <StatusDot status={log.status} />
                      <span className="ms-1.5">{log.status}</span>
                    </td>
                    <td className="py-1.5 pe-4 font-medium">{log.syncType}</td>
                    <td className="py-1.5 pe-4 text-gray-500">
                      {timeAgo(log.startedAt)}
                    </td>
                    <td className="py-1.5 pe-4 text-gray-500">
                      {log.status === "running"
                        ? "in progress..."
                        : duration != null
                          ? `${duration}s`
                          : "—"}
                    </td>
                    <td className="py-1.5 pe-4">{log.recordsAffected ?? "—"}</td>
                    <td className="py-1.5 text-red-500 text-xs truncate max-w-[200px]">
                      {log.errorMessage || ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
