import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  companies,
  incomeStatements,
  balanceSheets,
  cashFlows,
  screenResults,
  prices,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { runAnalysis } from "@/lib/ai/client";
import { buildMemoPrompt, buildStatementAnalysisPrompt, buildBuffettLensPrompt } from "@/lib/ai/prompts";

export async function POST(request: Request) {
  const body = await request.json();
  const { symbol, type = "memo", locale = "en" } = body as {
    symbol: string;
    type?: "memo" | "statement" | "buffett_lens";
    locale?: string;
  };

  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
  }

  const company = db
    .select()
    .from(companies)
    .where(eq(companies.symbol, symbol))
    .get();

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  // Gather financial data
  const income = db
    .select()
    .from(incomeStatements)
    .where(and(eq(incomeStatements.symbol, symbol), eq(incomeStatements.periodType, "annual")))
    .orderBy(desc(incomeStatements.periodEnd))
    .all();

  const balance = db
    .select()
    .from(balanceSheets)
    .where(and(eq(balanceSheets.symbol, symbol), eq(balanceSheets.periodType, "annual")))
    .orderBy(desc(balanceSheets.periodEnd))
    .all();

  const cashflow = db
    .select()
    .from(cashFlows)
    .where(and(eq(cashFlows.symbol, symbol), eq(cashFlows.periodType, "annual")))
    .orderBy(desc(cashFlows.periodEnd))
    .all();

  const screens: Record<string, unknown> = {};
  for (const sType of ["graham", "buffett", "dcf", "composite"]) {
    const r = db
      .select()
      .from(screenResults)
      .where(and(eq(screenResults.symbol, symbol), eq(screenResults.screenType, sType)))
      .get();
    if (r?.detailsJson) {
      try { screens[sType] = JSON.parse(r.detailsJson); } catch {}
    }
  }

  const latestPrice = db
    .select()
    .from(prices)
    .where(eq(prices.symbol, symbol))
    .orderBy(desc(prices.date))
    .limit(1)
    .get();

  const compositeScore = screens.composite
    ? (screens.composite as { composite: number }).composite
    : null;

  const ctx = {
    symbol,
    nameEn: company.nameEn,
    nameAr: company.nameAr,
    sector: company.sectorEn,
    currentPrice: latestPrice?.close ?? null,
    sageScore: compositeScore,
    incomeData: JSON.stringify(income.map((i) => ({
      period: i.periodEnd,
      revenue: i.revenue,
      grossProfit: i.grossProfit,
      operatingIncome: i.operatingIncome,
      netIncome: i.netIncome,
      eps: i.eps,
    }))),
    balanceData: JSON.stringify(balance.map((b) => ({
      period: b.periodEnd,
      totalAssets: b.totalAssets,
      currentAssets: b.currentAssets,
      totalLiabilities: b.totalLiabilities,
      totalEquity: b.totalEquity,
      totalDebt: b.totalDebt,
      cash: b.cashAndEquivalents,
    }))),
    cashFlowData: JSON.stringify(cashflow.map((c) => ({
      period: c.periodEnd,
      operatingCF: c.operatingCashFlow,
      capex: c.capitalExpenditure,
      fcf: c.freeCashFlow,
      dividends: c.dividendsPaid,
      depreciation: c.depreciation,
    }))),
    screenResults: JSON.stringify(screens),
  };

  let prompt: string;
  let analysisType: string;
  let cacheTTL: number;

  switch (type) {
    case "statement":
      prompt = buildStatementAnalysisPrompt(ctx, locale);
      analysisType = "statement";
      cacheTTL = 7;
      break;
    case "buffett_lens":
      prompt = buildBuffettLensPrompt(ctx, locale);
      analysisType = "buffett_lens";
      cacheTTL = 30;
      break;
    default:
      prompt = buildMemoPrompt(ctx, locale);
      analysisType = "memo";
      cacheTTL = 7;
  }

  try {
    const result = await runAnalysis({
      symbol,
      analysisType,
      prompt,
      cacheTTLDays: cacheTTL,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
