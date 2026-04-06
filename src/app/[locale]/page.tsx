import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import {
  companies,
  prices,
  incomeStatements,
  balanceSheets,
  screenResults,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { ScreenerTable } from "@/components/screener/screener-table";
import { ScreenerActions } from "@/components/screener/screener-actions";

function getScreenerData() {
  const allCompanies = db
    .select()
    .from(companies)
    .where(eq(companies.isActive, 1))
    .all();

  return allCompanies.map((company) => {
    const composite = db
      .select()
      .from(screenResults)
      .where(
        and(
          eq(screenResults.symbol, company.symbol),
          eq(screenResults.screenType, "composite")
        )
      )
      .get();

    const grahamResult = db
      .select()
      .from(screenResults)
      .where(
        and(
          eq(screenResults.symbol, company.symbol),
          eq(screenResults.screenType, "graham")
        )
      )
      .get();

    const buffettResult = db
      .select()
      .from(screenResults)
      .where(
        and(
          eq(screenResults.symbol, company.symbol),
          eq(screenResults.screenType, "buffett")
        )
      )
      .get();

    const dcfResult = db
      .select()
      .from(screenResults)
      .where(
        and(
          eq(screenResults.symbol, company.symbol),
          eq(screenResults.screenType, "dcf")
        )
      )
      .get();

    const latestPrice = db
      .select()
      .from(prices)
      .where(eq(prices.symbol, company.symbol))
      .orderBy(desc(prices.date))
      .limit(1)
      .get();

    const latestIncome = db
      .select()
      .from(incomeStatements)
      .where(
        and(
          eq(incomeStatements.symbol, company.symbol),
          eq(incomeStatements.periodType, "annual")
        )
      )
      .orderBy(desc(incomeStatements.periodEnd))
      .limit(1)
      .get();

    const latestBalance = db
      .select()
      .from(balanceSheets)
      .where(
        and(
          eq(balanceSheets.symbol, company.symbol),
          eq(balanceSheets.periodType, "annual")
        )
      )
      .orderBy(desc(balanceSheets.periodEnd))
      .limit(1)
      .get();

    const price = latestPrice?.close ?? null;
    const eps = latestIncome?.eps ?? null;
    const pe = eps && eps > 0 && price ? price / eps : null;

    const sharesOutstanding =
      latestIncome?.sharesOutstanding ??
      (latestIncome?.netIncome && eps && eps !== 0
        ? Math.round(latestIncome.netIncome / eps)
        : null);

    const bookValuePerShare =
      latestBalance?.totalEquity && sharesOutstanding
        ? latestBalance.totalEquity / sharesOutstanding
        : null;
    const pb = bookValuePerShare && price ? price / bookValuePerShare : null;

    const roe =
      latestIncome?.netIncome &&
      latestBalance?.totalEquity &&
      latestBalance.totalEquity > 0
        ? (latestIncome.netIncome / latestBalance.totalEquity) * 100
        : null;

    let marginOfSafety = null;
    let signal = null;

    if (dcfResult?.detailsJson) {
      try {
        marginOfSafety = JSON.parse(dcfResult.detailsJson).marginOfSafety;
      } catch {}
    }

    if (composite?.detailsJson) {
      try {
        signal = JSON.parse(composite.detailsJson).signal;
      } catch {}
    }

    return {
      symbol: company.symbol,
      nameEn: company.nameEn,
      nameAr: company.nameAr,
      sectorEn: company.sectorEn,
      sectorAr: company.sectorAr,
      market: company.market,
      price,
      sageScore: composite?.score ? Math.round(composite.score) : null,
      grahamScore: grahamResult?.score ? Math.round(grahamResult.score) : null,
      buffettScore: buffettResult?.score
        ? Math.round(buffettResult.score)
        : null,
      dcfScore: dcfResult?.score ? Math.round(dcfResult.score) : null,
      pe: pe ? Math.round(pe * 100) / 100 : null,
      pb: pb ? Math.round(pb * 100) / 100 : null,
      roe: roe ? Math.round(roe * 10) / 10 : null,
      marginOfSafety,
      signal,
    };
  });
}

export default async function ScreenerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("screener");
  const data = getScreenerData();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("subtitle")}</p>
        </div>
        <ScreenerActions />
      </div>
      <ScreenerTable data={data} locale={locale} />
    </div>
  );
}
