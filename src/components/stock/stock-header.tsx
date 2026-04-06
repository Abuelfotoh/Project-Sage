"use client";

import { ScoreBadge, SignalBadge } from "@/components/screener/score-badge";
import { WatchlistButton } from "@/components/watchlist/watchlist-button";

interface StockHeaderProps {
  symbol: string;
  nameEn: string;
  nameAr: string | null;
  sectorEn: string | null;
  sectorAr: string | null;
  price: number | null;
  dayChange: number | null;
  sageScore: number | null;
  signal: string | null;
  isWatchlisted: boolean;
  locale: string;
}

export function StockHeader({
  symbol,
  nameEn,
  nameAr,
  sectorEn,
  sectorAr,
  price,
  dayChange,
  sageScore,
  signal,
  isWatchlisted,
  locale,
}: StockHeaderProps) {
  const isAr = locale === "ar";
  const name = isAr ? (nameAr || nameEn) : nameEn;
  const sector = isAr ? (sectorAr || sectorEn) : sectorEn;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-gray-900">{name}</span>
            <span className="text-lg font-mono text-gray-500">{symbol}</span>
            <ScoreBadge score={sageScore} />
            <SignalBadge signal={signal} />
          </div>
          {sector && (
            <p className="text-sm text-gray-500 mt-1">{sector}</p>
          )}
        </div>
        <WatchlistButton symbol={symbol} isWatchlisted={isWatchlisted} />
      </div>

      <div className="flex items-baseline gap-4 mt-3">
        <span className="text-3xl font-bold">
          {price ? `${price.toFixed(2)} SAR` : "—"}
        </span>
        {dayChange != null && (
          <span
            className={`text-lg font-semibold ${
              dayChange >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {dayChange >= 0 ? "+" : ""}
            {dayChange.toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  );
}
