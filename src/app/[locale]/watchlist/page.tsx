import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { watchlist, companies, prices, screenResults } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { WatchlistTable } from "@/components/watchlist/watchlist-table";
import Link from "next/link";

function getWatchlistData() {
  const items = db.select().from(watchlist).all();

  return items.map((item) => {
    const company = db
      .select()
      .from(companies)
      .where(eq(companies.symbol, item.symbol))
      .get();

    const latestPrice = db
      .select()
      .from(prices)
      .where(eq(prices.symbol, item.symbol))
      .orderBy(desc(prices.date))
      .limit(1)
      .get();

    const composite = db
      .select()
      .from(screenResults)
      .where(
        and(
          eq(screenResults.symbol, item.symbol),
          eq(screenResults.screenType, "composite")
        )
      )
      .get();

    return {
      ...item,
      nameEn: company?.nameEn ?? item.symbol,
      nameAr: company?.nameAr ?? null,
      sectorEn: company?.sectorEn ?? null,
      currentPrice: latestPrice?.close ?? null,
      sageScore: composite?.score ? Math.round(composite.score) : null,
    };
  });
}

export default async function WatchlistPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("watchlist");
  const data = getWatchlistData();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{t("title")}</h1>
      <p className="text-sm text-gray-500 mb-6">{t("subtitle")}</p>

      {data.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-400 mb-4">{t("empty")}</p>
          <Link
            href={`/${locale}`}
            className="text-emerald-600 hover:text-emerald-800 font-medium"
          >
            &larr; Go to Screener
          </Link>
        </div>
      ) : (
        <WatchlistTable data={data} locale={locale} />
      )}
    </div>
  );
}
