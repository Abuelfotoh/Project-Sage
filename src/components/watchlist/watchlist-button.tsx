"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function WatchlistButton({
  symbol,
  isWatchlisted: initialState,
}: {
  symbol: string;
  isWatchlisted: boolean;
}) {
  const [watchlisted, setWatchlisted] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggle() {
    setLoading(true);
    try {
      if (watchlisted) {
        await fetch(`/api/watchlist?symbol=${symbol}`, { method: "DELETE" });
        setWatchlisted(false);
      } else {
        await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol }),
        });
        setWatchlisted(true);
      }
      router.refresh();
    } catch (error) {
      console.error("Watchlist toggle failed:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
        watchlisted
          ? "bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100"
          : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
      }`}
    >
      {watchlisted ? "★ Watchlisted" : "☆ Add to Watchlist"}
    </button>
  );
}
