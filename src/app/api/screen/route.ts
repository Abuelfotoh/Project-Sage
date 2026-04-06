import { NextResponse } from "next/server";
import { db } from "@/db";
import { companies, screenResults, prices, incomeStatements, balanceSheets } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { screenAllCompanies } from "@/lib/screening/sage-score";

export async function GET() {
  // Return current screen results with company info
  const allCompanies = db
    .select()
    .from(companies)
    .where(eq(companies.isActive, 1))
    .all();

  const results = allCompanies.map((company) => {
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

    // Compute key metrics
    const price = latestPrice?.close ?? null;
    const eps = latestIncome?.eps ?? null;
    const pe = eps && eps > 0 && price ? price / eps : null;

    const sharesOutstanding = latestIncome?.sharesOutstanding ??
      (latestIncome?.netIncome && eps && eps !== 0
        ? Math.round(latestIncome.netIncome / eps)
        : null);

    const bookValuePerShare = latestBalance?.totalEquity && sharesOutstanding
      ? latestBalance.totalEquity / sharesOutstanding
      : null;
    const pb = bookValuePerShare && price ? price / bookValuePerShare : null;

    const roe = latestIncome?.netIncome && latestBalance?.totalEquity && latestBalance.totalEquity > 0
      ? (latestIncome.netIncome / latestBalance.totalEquity) * 100
      : null;

    // Parse DCF details for margin of safety
    let marginOfSafety = null;
    if (dcfResult?.detailsJson) {
      try {
        const dcfDetails = JSON.parse(dcfResult.detailsJson);
        marginOfSafety = dcfDetails.marginOfSafety;
      } catch {}
    }

    // Parse composite details for signal
    let signal = null;
    if (composite?.detailsJson) {
      try {
        const details = JSON.parse(composite.detailsJson);
        signal = details.signal;
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
      sageScore: composite?.score ?? null,
      grahamScore: grahamResult?.score ?? null,
      buffettScore: buffettResult?.score ?? null,
      dcfScore: dcfResult?.score ?? null,
      pe: pe ? Math.round(pe * 100) / 100 : null,
      pb: pb ? Math.round(pb * 100) / 100 : null,
      roe: roe ? Math.round(roe * 10) / 10 : null,
      marginOfSafety,
      signal,
    };
  });

  // Sort by sage score descending, nulls last
  results.sort((a, b) => (b.sageScore ?? -1) - (a.sageScore ?? -1));

  return NextResponse.json(results);
}

export async function POST() {
  // Trigger a full re-screen of all companies
  try {
    const results = screenAllCompanies();
    return NextResponse.json({
      success: true,
      screened: results.length,
      topScores: results.slice(0, 5).map((r) => ({
        symbol: r.symbol,
        score: r.composite,
        signal: r.signal,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Screening failed" },
      { status: 500 }
    );
  }
}
