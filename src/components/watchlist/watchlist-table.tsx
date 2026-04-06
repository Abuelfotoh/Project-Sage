"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ScoreBadge } from "@/components/screener/score-badge";

interface WatchlistItem {
  id: number;
  symbol: string;
  nameEn: string;
  nameAr: string | null;
  sectorEn: string | null;
  currentPrice: number | null;
  targetPrice: number | null;
  sageScore: number | null;
  notes: string | null;
  addedAt: string;
}

export function WatchlistTable({
  data,
  locale,
}: {
  data: WatchlistItem[];
  locale: string;
}) {
  const router = useRouter();
  const isAr = locale === "ar";

  async function removeFromWatchlist(symbol: string) {
    await fetch(`/api/watchlist?symbol=${symbol}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 bg-white">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-start text-xs font-medium text-gray-500 uppercase">
              Symbol
            </th>
            <th className="px-4 py-2 text-start text-xs font-medium text-gray-500 uppercase">
              Company
            </th>
            <th className="px-4 py-2 text-start text-xs font-medium text-gray-500 uppercase">
              Price
            </th>
            <th className="px-4 py-2 text-start text-xs font-medium text-gray-500 uppercase">
              Target
            </th>
            <th className="px-4 py-2 text-start text-xs font-medium text-gray-500 uppercase">
              % to Target
            </th>
            <th className="px-4 py-2 text-start text-xs font-medium text-gray-500 uppercase">
              Sage Score
            </th>
            <th className="px-4 py-2 text-start text-xs font-medium text-gray-500 uppercase">
              Notes
            </th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((item) => {
            const pctToTarget =
              item.currentPrice && item.targetPrice
                ? ((item.targetPrice - item.currentPrice) / item.currentPrice) * 100
                : null;

            return (
              <tr key={item.symbol} className="hover:bg-emerald-50">
                <td className="px-4 py-2 text-sm font-mono font-bold text-emerald-700">
                  <Link href={`/${locale}/stock/${item.symbol}`}>
                    {item.symbol}
                  </Link>
                </td>
                <td className="px-4 py-2 text-sm">
                  {isAr ? (item.nameAr || item.nameEn) : item.nameEn}
                </td>
                <td className="px-4 py-2 text-sm font-medium">
                  {item.currentPrice?.toFixed(2) ?? "—"}
                </td>
                <td className="px-4 py-2 text-sm">
                  {item.targetPrice?.toFixed(2) ?? "—"}
                </td>
                <td className="px-4 py-2 text-sm">
                  {pctToTarget != null ? (
                    <span
                      className={
                        pctToTarget > 0 ? "text-green-600" : "text-red-600"
                      }
                    >
                      {pctToTarget > 0 ? "+" : ""}
                      {pctToTarget.toFixed(1)}%
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2">
                  <ScoreBadge score={item.sageScore} />
                </td>
                <td className="px-4 py-2 text-xs text-gray-500 max-w-[200px] truncate">
                  {item.notes || "—"}
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => removeFromWatchlist(item.symbol)}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
