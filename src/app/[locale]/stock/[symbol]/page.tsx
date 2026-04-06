import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import {
  companies,
  prices,
  incomeStatements,
  balanceSheets,
  cashFlows,
  screenResults,
  watchlist,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { StockHeader } from "@/components/stock/stock-header";
import { PriceChartWrapper } from "@/components/charts/price-chart-wrapper";
import { FinancialCharts } from "@/components/charts/financial-charts";
import { ScreenBreakdown } from "@/components/stock/screen-breakdown";
import Link from "next/link";

function getStockData(symbol: string) {
  const company = db
    .select()
    .from(companies)
    .where(eq(companies.symbol, symbol))
    .get();

  if (!company) return null;

  const priceHistory = db
    .select()
    .from(prices)
    .where(eq(prices.symbol, symbol))
    .orderBy(desc(prices.date))
    .limit(1260)
    .all()
    .reverse();

  const annualIncome = db
    .select()
    .from(incomeStatements)
    .where(
      and(
        eq(incomeStatements.symbol, symbol),
        eq(incomeStatements.periodType, "annual")
      )
    )
    .orderBy(desc(incomeStatements.periodEnd))
    .all()
    .reverse();

  const annualBalance = db
    .select()
    .from(balanceSheets)
    .where(
      and(
        eq(balanceSheets.symbol, symbol),
        eq(balanceSheets.periodType, "annual")
      )
    )
    .orderBy(desc(balanceSheets.periodEnd))
    .all()
    .reverse();

  const annualCashFlow = db
    .select()
    .from(cashFlows)
    .where(
      and(
        eq(cashFlows.symbol, symbol),
        eq(cashFlows.periodType, "annual")
      )
    )
    .orderBy(desc(cashFlows.periodEnd))
    .all()
    .reverse();

  const screens: Record<string, unknown> = {};
  for (const type of ["graham", "buffett", "dcf", "composite"]) {
    const result = db
      .select()
      .from(screenResults)
      .where(
        and(eq(screenResults.symbol, symbol), eq(screenResults.screenType, type))
      )
      .get();
    if (result?.detailsJson) {
      try {
        screens[type] = JSON.parse(result.detailsJson);
      } catch {
        screens[type] = { score: result.score };
      }
    }
  }

  const isWatchlisted = !!db
    .select()
    .from(watchlist)
    .where(eq(watchlist.symbol, symbol))
    .get();

  return {
    company,
    prices: priceHistory,
    income: annualIncome,
    balance: annualBalance,
    cashFlow: annualCashFlow,
    screens,
    isWatchlisted,
  };
}

export default async function StockDetailPage({
  params,
}: {
  params: Promise<{ locale: string; symbol: string }>;
}) {
  const { locale, symbol } = await params;
  const t = await getTranslations("stock");
  const data = getStockData(symbol);

  if (!data) notFound();

  const { company, screens } = data;
  const latestPrice = data.prices[data.prices.length - 1];
  const prevPrice = data.prices.length > 1 ? data.prices[data.prices.length - 2] : null;
  const dayChange = latestPrice && prevPrice
    ? ((latestPrice.close! - prevPrice.close!) / prevPrice.close!) * 100
    : null;

  const priceData = data.prices.map((p) => ({
    time: p.date,
    open: p.open ?? 0,
    high: p.high ?? 0,
    low: p.low ?? 0,
    close: p.close ?? 0,
  }));

  const incomeChartData = data.income.map((i) => ({
    period: i.periodEnd.substring(0, 4),
    revenue: i.revenue ? i.revenue / 1e6 : 0,
    netIncome: i.netIncome ? i.netIncome / 1e6 : 0,
    grossProfit: i.grossProfit ? i.grossProfit / 1e6 : 0,
  }));

  return (
    <div>
      <Link
        href={`/${locale}`}
        className="text-sm text-emerald-600 hover:text-emerald-800 mb-4 inline-block"
      >
        &larr; {t("overview")}
      </Link>

      <StockHeader
        symbol={symbol}
        nameEn={company.nameEn}
        nameAr={company.nameAr}
        sectorEn={company.sectorEn}
        sectorAr={company.sectorAr}
        price={latestPrice?.close ?? null}
        dayChange={dayChange}
        sageScore={
          screens.composite
            ? (screens.composite as { composite: number }).composite
            : null
        }
        signal={
          screens.composite
            ? (screens.composite as { signal: string }).signal
            : null
        }
        isWatchlisted={data.isWatchlisted}
        locale={locale}
      />

      {/* Price Chart */}
      <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-lg font-semibold mb-3">{t("priceChart")}</h2>
        <PriceChartWrapper data={priceData} />
      </div>

      {/* Financial Charts */}
      <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-lg font-semibold mb-3">{t("financials")}</h2>
        {incomeChartData.length > 0 ? (
          <FinancialCharts data={incomeChartData} locale={locale} />
        ) : (
          <p className="text-gray-400 text-sm py-8 text-center">
            No financial data available
          </p>
        )}
      </div>

      {/* Screen Breakdown */}
      <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-lg font-semibold mb-3">{t("screening")}</h2>
        <ScreenBreakdown screens={screens} locale={locale} />
      </div>

      {/* AI Analysis Link */}
      <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-lg font-semibold mb-3">{t("analysis")}</h2>
        <Link
          href={`/${locale}/analysis/${symbol}`}
          className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
        >
          Generate AI Analysis &rarr;
        </Link>
      </div>
    </div>
  );
}
