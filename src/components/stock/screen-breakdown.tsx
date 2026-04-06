"use client";

import { ScoreBadge } from "@/components/screener/score-badge";

interface ScreenBreakdownProps {
  screens: Record<string, unknown>;
  locale: string;
}

export function ScreenBreakdown({ screens, locale }: ScreenBreakdownProps) {
  const graham = screens.graham as {
    score: number;
    criteria: { name: string; passed: boolean; value: number | null; threshold: string | null; description: string }[];
  } | undefined;

  const buffett = screens.buffett as {
    normalizedScore: number;
    criteria: { name: string; score: number; value: number | null; description: string }[];
  } | undefined;

  const dcf = screens.dcf as {
    score: number;
    intrinsicValue: number | null;
    currentPrice: number | null;
    marginOfSafety: number | null;
    fairValue: number | null;
    bargainValue: number | null;
    growthRate: number | null;
  } | undefined;

  if (!graham && !buffett && !dcf) {
    return (
      <p className="text-gray-400 text-sm py-8 text-center">
        No screening data available. Click &quot;Run Screen&quot; from the main page first.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Graham Screen */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Graham Screen</h3>
          <ScoreBadge score={graham?.score ?? null} />
        </div>
        {graham?.criteria ? (
          <ul className="space-y-1.5">
            {graham.criteria.map((c) => (
              <li key={c.name} className="text-xs flex items-start gap-1.5">
                <span className={c.passed ? "text-green-600" : "text-red-400"}>
                  {c.passed ? "✓" : "✗"}
                </span>
                <div>
                  <span className="font-medium">{c.name}</span>
                  <span className="text-gray-400 ms-1">
                    {c.value != null ? `(${c.value})` : ""}
                  </span>
                  <p className="text-gray-500">{c.description}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-400">No data</p>
        )}
      </div>

      {/* Buffett Screen */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Buffett Screen</h3>
          <ScoreBadge score={buffett?.normalizedScore ?? null} />
        </div>
        {buffett?.criteria ? (
          <ul className="space-y-1.5">
            {buffett.criteria.map((c) => (
              <li key={c.name} className="text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-gray-600 font-mono">{c.score}/10</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                  <div
                    className="bg-emerald-500 h-1.5 rounded-full"
                    style={{ width: `${(c.score / 10) * 100}%` }}
                  />
                </div>
                <p className="text-gray-500 mt-0.5">{c.description}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-400">No data</p>
        )}
      </div>

      {/* DCF Model */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">DCF Model</h3>
          <ScoreBadge score={dcf?.score ?? null} />
        </div>
        {dcf ? (
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Intrinsic Value</span>
              <span className="font-medium">
                {dcf.intrinsicValue ? `${dcf.intrinsicValue.toFixed(2)} SAR` : "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Current Price</span>
              <span className="font-medium">
                {dcf.currentPrice ? `${dcf.currentPrice.toFixed(2)} SAR` : "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Margin of Safety</span>
              <span
                className={`font-bold ${
                  (dcf.marginOfSafety ?? 0) >= 30
                    ? "text-green-600"
                    : (dcf.marginOfSafety ?? 0) >= 0
                      ? "text-yellow-600"
                      : "text-red-600"
                }`}
              >
                {dcf.marginOfSafety != null ? `${dcf.marginOfSafety.toFixed(1)}%` : "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Fair Value (25% margin)</span>
              <span className="font-medium">
                {dcf.fairValue ? `${dcf.fairValue.toFixed(2)} SAR` : "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Bargain Value (50% margin)</span>
              <span className="font-medium">
                {dcf.bargainValue ? `${dcf.bargainValue.toFixed(2)} SAR` : "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Growth Rate</span>
              <span className="font-medium">
                {dcf.growthRate != null ? `${dcf.growthRate}%` : "N/A"}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400">No data</p>
        )}
      </div>
    </div>
  );
}
