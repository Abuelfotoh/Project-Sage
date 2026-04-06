"use client";

export function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        N/A
      </span>
    );
  }

  let colorClass: string;
  if (score >= 80) colorClass = "bg-emerald-100 text-emerald-800";
  else if (score >= 65) colorClass = "bg-green-100 text-green-800";
  else if (score >= 45) colorClass = "bg-yellow-100 text-yellow-800";
  else if (score >= 25) colorClass = "bg-orange-100 text-orange-800";
  else colorClass = "bg-red-100 text-red-800";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${colorClass}`}
    >
      {score}
    </span>
  );
}

export function SignalBadge({
  signal,
  label,
}: {
  signal: string | null;
  label?: string;
}) {
  if (!signal) {
    return null;
  }

  const config: Record<string, { bg: string; text: string }> = {
    strong_buy: { bg: "bg-emerald-600", text: "text-white" },
    buy: { bg: "bg-green-500", text: "text-white" },
    watch: { bg: "bg-yellow-400", text: "text-yellow-900" },
    hold: { bg: "bg-orange-400", text: "text-white" },
    avoid: { bg: "bg-red-500", text: "text-white" },
  };

  const c = config[signal] ?? { bg: "bg-gray-400", text: "text-white" };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${c.bg} ${c.text}`}
    >
      {label ?? signal.replace("_", " ").toUpperCase()}
    </span>
  );
}
