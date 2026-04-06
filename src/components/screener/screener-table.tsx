"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ScoreBadge, SignalBadge } from "./score-badge";

interface StockRow {
  symbol: string;
  nameEn: string;
  nameAr: string | null;
  sectorEn: string | null;
  sectorAr: string | null;
  market: string | null;
  price: number | null;
  sageScore: number | null;
  grahamScore: number | null;
  buffettScore: number | null;
  dcfScore: number | null;
  pe: number | null;
  pb: number | null;
  roe: number | null;
  marginOfSafety: number | null;
  signal: string | null;
}

type SortField = "sageScore" | "price" | "pe" | "pb" | "roe" | "grahamScore" | "buffettScore" | "dcfScore" | "marginOfSafety";

export function ScreenerTable({
  data,
  locale,
}: {
  data: StockRow[];
  locale: string;
}) {
  const t = useTranslations("screener");
  const tc = useTranslations("common");
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [marketFilter, setMarketFilter] = useState<string>("all");
  const [minScore, setMinScore] = useState(0);
  const [sortField, setSortField] = useState<SortField>("sageScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const isAr = locale === "ar";

  // Get unique sectors
  const sectors = useMemo(() => {
    const set = new Set(data.map((d) => (isAr ? d.sectorAr : d.sectorEn)).filter(Boolean));
    return Array.from(set).sort();
  }, [data, isAr]);

  // Filter and sort
  const filtered = useMemo(() => {
    let result = data;

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.symbol.toLowerCase().includes(q) ||
          r.nameEn.toLowerCase().includes(q) ||
          (r.nameAr && r.nameAr.includes(q))
      );
    }

    // Market filter
    if (marketFilter !== "all") {
      result = result.filter((r) => r.market === marketFilter);
    }

    // Sector filter
    if (sectorFilter !== "all") {
      result = result.filter(
        (r) => (isAr ? r.sectorAr : r.sectorEn) === sectorFilter
      );
    }

    // Min score filter
    if (minScore > 0) {
      result = result.filter((r) => (r.sageScore ?? 0) >= minScore);
    }

    // Sort
    result = [...result].sort((a, b) => {
      const aVal = a[sortField] ?? -Infinity;
      const bVal = b[sortField] ?? -Infinity;
      return sortDir === "desc" ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number);
    });

    return result;
  }, [data, search, sectorFilter, marketFilter, minScore, sortField, sortDir, isAr]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  function SortHeader({ field, children }: { field: SortField; children: React.ReactNode }) {
    const isActive = sortField === field;
    return (
      <th
        className="px-3 py-2 text-start text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
        onClick={() => toggleSort(field)}
      >
        <span className="inline-flex items-center gap-1">
          {children}
          {isActive && (
            <span className="text-emerald-600">
              {sortDir === "desc" ? "▼" : "▲"}
            </span>
          )}
        </span>
      </th>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder={tc("search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
        />
        <select
          value={marketFilter}
          onChange={(e) => setMarketFilter(e.target.value)}
          title="Filter by market"
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="all">All Markets</option>
          <option value="main">Main Market</option>
          <option value="nomu">Nomu</option>
          <option value="reit">REITs</option>
        </select>
        <select
          value={sectorFilter}
          onChange={(e) => setSectorFilter(e.target.value)}
          title={t("filterBySector")}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="all">{t("allSectors")}</option>
          {sectors.map((s) => (
            <option key={s} value={s!}>
              {s}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">{t("minScore")}:</label>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            title={t("minScore")}
            className="w-24"
          />
          <span className="text-sm font-medium text-gray-700 w-8">{minScore}</span>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500 mb-2">
        {filtered.length} / {data.length}
      </p>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-start text-xs font-medium text-gray-500 uppercase">
                {t("symbol")}
              </th>
              <th className="px-3 py-2 text-start text-xs font-medium text-gray-500 uppercase">
                {t("company")}
              </th>
              <th className="px-3 py-2 text-start text-xs font-medium text-gray-500 uppercase">
                {t("sector")}
              </th>
              <SortHeader field="price">{t("price")}</SortHeader>
              <SortHeader field="sageScore">{t("sageScore")}</SortHeader>
              <SortHeader field="grahamScore">{t("grahamScore")}</SortHeader>
              <SortHeader field="buffettScore">{t("buffettScore")}</SortHeader>
              <SortHeader field="dcfScore">{t("dcfScore")}</SortHeader>
              <SortHeader field="pe">{t("pe")}</SortHeader>
              <SortHeader field="pb">{t("pb")}</SortHeader>
              <SortHeader field="roe">{t("roe")}</SortHeader>
              <th className="px-3 py-2 text-start text-xs font-medium text-gray-500 uppercase">
                {t("signal")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((stock) => (
              <tr
                key={stock.symbol}
                className="hover:bg-emerald-50 transition-colors"
              >
                <td className="px-3 py-2 text-sm font-mono font-bold text-emerald-700">
                  <Link href={`/${locale}/stock/${stock.symbol}`}>
                    {stock.symbol}
                  </Link>
                </td>
                <td className="px-3 py-2 text-sm">
                  <Link
                    href={`/${locale}/stock/${stock.symbol}`}
                    className="hover:text-emerald-700"
                  >
                    {isAr ? (stock.nameAr || stock.nameEn) : stock.nameEn}
                  </Link>
                </td>
                <td className="px-3 py-2 text-xs text-gray-500">
                  {isAr ? stock.sectorAr : stock.sectorEn}
                </td>
                <td className="px-3 py-2 text-sm font-medium">
                  {stock.price?.toFixed(2) ?? "—"}
                </td>
                <td className="px-3 py-2">
                  <ScoreBadge score={stock.sageScore} />
                </td>
                <td className="px-3 py-2">
                  <ScoreBadge score={stock.grahamScore} />
                </td>
                <td className="px-3 py-2">
                  <ScoreBadge score={stock.buffettScore} />
                </td>
                <td className="px-3 py-2">
                  <ScoreBadge score={stock.dcfScore} />
                </td>
                <td className="px-3 py-2 text-sm text-gray-600">
                  {stock.pe?.toFixed(1) ?? "—"}
                </td>
                <td className="px-3 py-2 text-sm text-gray-600">
                  {stock.pb?.toFixed(2) ?? "—"}
                </td>
                <td className="px-3 py-2 text-sm text-gray-600">
                  {stock.roe ? `${stock.roe.toFixed(1)}%` : "—"}
                </td>
                <td className="px-3 py-2">
                  <SignalBadge signal={stock.signal} />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={12} className="px-3 py-8 text-center text-gray-400">
                  No stocks match the current filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
