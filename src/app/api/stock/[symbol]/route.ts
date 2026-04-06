import { NextResponse } from "next/server";
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;

  const company = db
    .select()
    .from(companies)
    .where(eq(companies.symbol, symbol))
    .get();

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  // Get all data for this stock
  const priceHistory = db
    .select()
    .from(prices)
    .where(eq(prices.symbol, symbol))
    .orderBy(desc(prices.date))
    .limit(1260) // ~5 years of daily data
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
    .all();

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
    .all();

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
    .all();

  // Screen results
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

  // Check watchlist status
  const watchlistEntry = db
    .select()
    .from(watchlist)
    .where(eq(watchlist.symbol, symbol))
    .get();

  // Get peers (same sector)
  const peers = company.sectorEn
    ? db
        .select()
        .from(companies)
        .where(
          and(
            eq(companies.sectorEn, company.sectorEn),
            eq(companies.isActive, 1)
          )
        )
        .all()
        .filter((c) => c.symbol !== symbol)
        .slice(0, 5)
    : [];

  return NextResponse.json({
    company,
    prices: priceHistory,
    financials: {
      income: annualIncome,
      balance: annualBalance,
      cashFlow: annualCashFlow,
    },
    screens,
    isWatchlisted: !!watchlistEntry,
    watchlistEntry,
    peers: peers.map((p) => ({
      symbol: p.symbol,
      nameEn: p.nameEn,
      nameAr: p.nameAr,
    })),
  });
}
