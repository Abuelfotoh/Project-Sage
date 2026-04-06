"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

export function ScreenerActions() {
  const t = useTranslations("common");
  const router = useRouter();
  const [running, setRunning] = useState(false);

  async function runScreen() {
    setRunning(true);
    try {
      await fetch("/api/screen", { method: "POST" });
      router.refresh();
    } catch (error) {
      console.error("Screening failed:", error);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={runScreen}
        disabled={running}
        className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {running ? t("loading") : "Run Screen"}
      </button>
    </div>
  );
}
