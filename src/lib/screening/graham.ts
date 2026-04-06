/**
 * Graham Quantitative Screen
 * Based on Benjamin Graham's criteria from "The Intelligent Investor"
 * and "Security Analysis".
 */

import { db } from "@/db";
import { incomeStatements, balanceSheets, cashFlows, prices } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { GrahamScreenResult, CriterionResult } from "./types";

interface FinancialContext {
  symbol: string;
  currentPrice: number;
  sharesOutstanding: number;
  // Latest annual data
  latestIncome: typeof incomeStatements.$inferSelect | null | undefined;
  latestBalance: typeof balanceSheets.$inferSelect | null | undefined;
  // Historical annual incomes (sorted newest first)
  annualIncomes: (typeof incomeStatements.$inferSelect)[];
  annualCashFlows: (typeof cashFlows.$inferSelect)[];
}

function getFinancialContext(symbol: string): FinancialContext | null {
  const latestPrice = db
    .select()
    .from(prices)
    .where(eq(prices.symbol, symbol))
    .orderBy(desc(prices.date))
    .limit(1)
    .get();

  if (!latestPrice?.close) return null;

  const annualIncomes = db
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

  const latestBalance = db
    .select()
    .from(balanceSheets)
    .where(
      and(
        eq(balanceSheets.symbol, symbol),
        eq(balanceSheets.periodType, "annual")
      )
    )
    .orderBy(desc(balanceSheets.periodEnd))
    .limit(1)
    .get();

  const annualCashFlows = db
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

  const latestIncome = annualIncomes[0] ?? null;

  // Estimate shares outstanding from market data or income data
  const sharesOutstanding =
    latestIncome?.sharesOutstanding ??
    (latestIncome?.netIncome && latestIncome?.eps && latestIncome.eps !== 0
      ? Math.round(latestIncome.netIncome / latestIncome.eps)
      : 0);

  return {
    symbol,
    currentPrice: latestPrice.close,
    sharesOutstanding,
    latestIncome,
    latestBalance,
    annualIncomes,
    annualCashFlows,
  };
}

// Criterion 1: P/E ratio < 15
function checkPE(ctx: FinancialContext): CriterionResult {
  const eps = ctx.latestIncome?.eps;
  if (!eps || eps <= 0) {
    return { name: "P/E Ratio", passed: false, value: null, threshold: "< 15", description: "Insufficient data" };
  }
  const pe = ctx.currentPrice / eps;
  return {
    name: "P/E Ratio",
    passed: pe < 15,
    value: Math.round(pe * 100) / 100,
    threshold: "< 15",
    description: pe < 15 ? "Moderately priced" : "Expensive relative to earnings",
  };
}

// Criterion 2: P/B ratio < 1.5 (or P/E x P/B < 22.5)
function checkPB(ctx: FinancialContext): CriterionResult {
  const bookValue = ctx.latestBalance?.bookValuePerShare ??
    (ctx.latestBalance?.totalEquity && ctx.sharesOutstanding
      ? ctx.latestBalance.totalEquity / ctx.sharesOutstanding
      : null);

  if (!bookValue || bookValue <= 0) {
    return { name: "P/B Ratio", passed: false, value: null, threshold: "< 1.5", description: "Insufficient data" };
  }

  const pb = ctx.currentPrice / bookValue;
  const eps = ctx.latestIncome?.eps;
  const pe = eps && eps > 0 ? ctx.currentPrice / eps : null;

  // Graham's combined test: P/E x P/B < 22.5
  const combined = pe ? pe * pb : null;
  const passedPB = pb < 1.5;
  const passedCombined = combined ? combined < 22.5 : false;

  return {
    name: "P/B Ratio",
    passed: passedPB || passedCombined,
    value: Math.round(pb * 100) / 100,
    threshold: "< 1.5 (or P/E x P/B < 22.5)",
    description: passedPB
      ? "Below book value threshold"
      : passedCombined
        ? `P/E x P/B = ${combined?.toFixed(1)} (< 22.5)`
        : "Above book value threshold",
  };
}

// Criterion 3: Current ratio > 2.0
function checkCurrentRatio(ctx: FinancialContext): CriterionResult {
  const ca = ctx.latestBalance?.currentAssets;
  const cl = ctx.latestBalance?.currentLiabilities;

  if (!ca || !cl || cl === 0) {
    return { name: "Current Ratio", passed: false, value: null, threshold: "> 2.0", description: "Insufficient data" };
  }

  const ratio = ca / cl;
  return {
    name: "Current Ratio",
    passed: ratio > 2.0,
    value: Math.round(ratio * 100) / 100,
    threshold: "> 2.0",
    description: ratio > 2.0 ? "Strong liquidity position" : "Below minimum liquidity threshold",
  };
}

// Criterion 4: Positive earnings for last 5 years
function checkEarningsStability(ctx: FinancialContext): CriterionResult {
  const years = ctx.annualIncomes.slice(0, 5);
  if (years.length < 3) {
    return { name: "Earnings Stability", passed: false, value: null, threshold: "5 years positive", description: `Only ${years.length} years of data` };
  }

  const allPositive = years.every((y) => y.netIncome != null && y.netIncome > 0);
  return {
    name: "Earnings Stability",
    passed: allPositive,
    value: years.length,
    threshold: "5 years positive",
    description: allPositive
      ? `Positive earnings for ${years.length} consecutive years`
      : "Not all years had positive earnings",
  };
}

// Criterion 5: Dividend record (5+ years)
function checkDividendRecord(ctx: FinancialContext): CriterionResult {
  const cfs = ctx.annualCashFlows.slice(0, 5);
  if (cfs.length < 3) {
    return { name: "Dividend Record", passed: false, value: null, threshold: "5+ years", description: "Insufficient history" };
  }

  const dividendYears = cfs.filter(
    (cf) => cf.dividendsPaid != null && cf.dividendsPaid < 0 // dividendsPaid is negative
  ).length;

  return {
    name: "Dividend Record",
    passed: dividendYears >= Math.min(5, cfs.length),
    value: dividendYears,
    threshold: "5+ years",
    description: `Dividends paid in ${dividendYears} of ${cfs.length} years`,
  };
}

// Criterion 6: Earnings growth >= 33% over available history
function checkEarningsGrowth(ctx: FinancialContext): CriterionResult {
  const incomes = ctx.annualIncomes;
  if (incomes.length < 3) {
    return { name: "Earnings Growth", passed: false, value: null, threshold: ">= 33%", description: "Insufficient history" };
  }

  const oldest = incomes[incomes.length - 1];
  const newest = incomes[0];

  if (!oldest.eps || !newest.eps || oldest.eps <= 0) {
    return { name: "Earnings Growth", passed: false, value: null, threshold: ">= 33%", description: "Cannot compute growth" };
  }

  const growth = ((newest.eps - oldest.eps) / oldest.eps) * 100;
  return {
    name: "Earnings Growth",
    passed: growth >= 33,
    value: Math.round(growth * 10) / 10,
    threshold: ">= 33%",
    description: `${growth.toFixed(1)}% EPS growth over ${incomes.length} years`,
  };
}

// Criterion 7: Debt-to-equity ratio
function checkDebtToEquity(ctx: FinancialContext): CriterionResult {
  const debt = ctx.latestBalance?.totalDebt ?? ctx.latestBalance?.longTermDebt;
  const equity = ctx.latestBalance?.totalEquity;

  if (debt == null || !equity || equity <= 0) {
    return { name: "Debt/Equity", passed: false, value: null, threshold: "< 1.0", description: "Insufficient data" };
  }

  const ratio = debt / equity;
  return {
    name: "Debt/Equity",
    passed: ratio < 1.0,
    value: Math.round(ratio * 100) / 100,
    threshold: "< 1.0",
    description: ratio < 1.0 ? "Conservative debt level" : "High leverage",
  };
}

// Criterion 8: Net-Net Working Capital (NCAV > 2/3 of market cap)
function checkNCAV(ctx: FinancialContext): CriterionResult {
  const ncav = ctx.latestBalance?.netCurrentAssets;
  if (ncav == null || !ctx.sharesOutstanding) {
    return { name: "NCAV Analysis", passed: false, value: null, threshold: "Price < 2/3 NCAV/share", description: "Insufficient data" };
  }

  const ncavPerShare = ncav / ctx.sharesOutstanding;
  const threshold = ncavPerShare * (2 / 3);
  const passed = ncavPerShare > 0 && ctx.currentPrice < threshold;

  return {
    name: "NCAV Analysis",
    passed,
    value: Math.round(ncavPerShare * 100) / 100,
    threshold: "Price < 2/3 NCAV/share",
    description: passed
      ? "Trading below net-net working capital (deep value)"
      : ncavPerShare <= 0
        ? "Negative net current assets"
        : `NCAV/share: ${ncavPerShare.toFixed(2)}, need price < ${threshold.toFixed(2)}`,
  };
}

export function runGrahamScreen(symbol: string): GrahamScreenResult | null {
  const ctx = getFinancialContext(symbol);
  if (!ctx) {
    return null;
  }

  const criteria: CriterionResult[] = [
    checkPE(ctx),
    checkPB(ctx),
    checkCurrentRatio(ctx),
    checkEarningsStability(ctx),
    checkDividendRecord(ctx),
    checkEarningsGrowth(ctx),
    checkDebtToEquity(ctx),
    checkNCAV(ctx),
  ];

  const passedCount = criteria.filter((c) => c.passed).length;
  const score = Math.round((passedCount / criteria.length) * 100);

  return {
    symbol,
    criteria,
    passedCount,
    totalCriteria: criteria.length,
    score,
  };
}
