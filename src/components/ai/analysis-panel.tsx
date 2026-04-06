"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type AnalysisType = "memo" | "statement" | "buffett_lens";

export function AnalysisPanel({
  symbol,
  locale,
}: {
  symbol: string;
  locale: string;
}) {
  const t = useTranslations("ai");
  const [activeType, setActiveType] = useState<AnalysisType | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);

  async function runAnalysis(type: AnalysisType) {
    setActiveType(type);
    setLoading(true);
    setError(null);
    setResult(null);
    setCached(false);

    try {
      const res = await fetch("/api/ai/memo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, type, locale }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Analysis failed");
      }

      const data = await res.json();
      setResult(data.text);
      setCached(data.cached);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const buttons: { type: AnalysisType; label: string; color: string }[] = [
    { type: "memo", label: t("generateMemo"), color: "bg-purple-600 hover:bg-purple-700" },
    { type: "statement", label: t("analyzeStatements"), color: "bg-blue-600 hover:bg-blue-700" },
    { type: "buffett_lens", label: t("buffettLens"), color: "bg-amber-600 hover:bg-amber-700" },
  ];

  return (
    <div>
      {/* Analysis type buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        {buttons.map((btn) => (
          <button
            key={btn.type}
            onClick={() => runAnalysis(btn.type)}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-50 ${
              activeType === btn.type && !loading
                ? "ring-2 ring-offset-2 ring-gray-400"
                : ""
            } ${btn.color}`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-purple-300 border-t-purple-600 rounded-full mb-3" />
          <p className="text-gray-600">{t("generating")}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {cached && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 mb-3">
              {t("cached")}
            </span>
          )}
          <div
            className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700"
            dangerouslySetInnerHTML={{
              __html: result
                .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                .replace(/\n\n/g, "</p><p>")
                .replace(/\n/g, "<br/>")
                .replace(/^/, "<p>")
                .replace(/$/, "</p>"),
            }}
          />
        </div>
      )}
    </div>
  );
}
