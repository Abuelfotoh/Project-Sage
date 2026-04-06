/**
 * Buffett Quality-Moat Screen
 * Based on Warren Buffett's investment principles from
 * Berkshire Hathaway shareholder letters and known practices.
 */

import { db } from "@/db";
import { incomeStatements, balanceSheets, cashFlows, prices } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { BuffettScreenResult } from "./types";

interface FinancialHistory {
  symbol: string;
  currentPrice: number;
  annualIncomes: (typeof incomeStatements.$inferSelect)[];
  annualBalances: (typeof balanceSheets.$inferSelect)[];
  annualCashFlows: (typeof cashFlows.$inferSelect)[];
}

function getHistory(symbol: string): FinancialHistory | null {
  const latestPrice = db
    .select()
    .from(prices)
    .where(eq(prices.symbol, symbol))
    .orderBy(desc(prices.date))
    .limit(1)
    .get();

  if (!latestPrice?.close) return null;

  return {
    symbol,
    currentPrice: latestPrice.close,
    annualIncomes: db
      .select()
      .from(incomeStatements)
      .where(and(eq(incomeStatements.symbol, symbol), eq(incomeStatements.periodType, "annual")))
      .orderBy(desc(incomeStatements.periodEnd))
      .all(),
    annualBalances: db
      .select()
      .from(balanceSheets)
      .where(and(eq(balanceSheets.symbol, symbol), eq(balanceSheets.periodType, "annual")))
      .orderBy(desc(balanceSheets.periodEnd))
      .all(),
    annualCashFlows: db
      .select()
      .from(cashFlows)
      .where(and(eq(cashFlows.symbol, symbol), eq(cashFlows.periodType, "annual")))
      .orderBy(desc(cashFlows.periodEnd))
      .all(),
  };
}

function scoreCriterion(
  name: string,
  value: number | null,
  scoreFn: (v: number) => number,
  description: string
) {
  if (value == null) {
    return { name, score: 0, value: null, description: "Insufficient data" };
  }
  const score = Math.max(0, Math.min(10, scoreFn(value)));
  return { name, score: Math.round(score * 10) / 10, value, description };
}

// 1. ROE Consistency: Average ROE > 15% over 5 years
function scoreROE(hist: FinancialHistory) {
  const pairs = hist.annualIncomes
    .map((inc) => {
      const bal = hist.annualBalances.find((b) => b.periodEnd === inc.periodEnd);
      if (!inc.netIncome || !bal?.totalEquity || bal.totalEquity <= 0) return null;
      return (inc.netIncome / bal.totalEquity) * 100;
    })
    .filter((v): v is number => v != null)
    .slice(0, 5);

  if (pairs.length === 0) {
    return scoreCriterion("ROE Consistency", null, () => 0, "No data");
  }

  const avgROE = pairs.reduce((a, b) => a + b, 0) / pairs.length;
  const minROE = Math.min(...pairs);

  return scoreCriterion(
    "ROE Consistency",
    avgROE,
    (v) => {
      let s = 0;
      if (v >= 20) s = 8;
      else if (v >= 15) s = 6;
      else if (v >= 10) s = 3;
      // Bonus for consistency (min > 10%)
      if (minROE >= 10) s += 2;
      return s;
    },
    `Avg ROE: ${avgROE.toFixed(1)}%, Min: ${minROE.toFixed(1)}% over ${pairs.length} years`
  );
}

// 2. Owner Earnings Yield
function scoreOwnerEarnings(hist: FinancialHistory) {
  const latestIncome = hist.annualIncomes[0];
  const latestCF = hist.annualCashFlows[0];
  const latestBalance = hist.annualBalances[0];

  if (!latestIncome?.netIncome || !latestCF?.depreciation) {
    return scoreCriterion("Owner Earnings Yield", null, () => 0, "No data");
  }

  const capex = Math.abs(latestCF.capitalExpenditure ?? 0);
  const ownerEarnings = latestIncome.netIncome + (latestCF.depreciation ?? 0) - capex;

  // Estimate market cap
  const shares = latestIncome.sharesOutstanding ??
    (latestIncome.eps && latestIncome.eps !== 0
      ? Math.round(latestIncome.netIncome / latestIncome.eps)
      : null);

  if (!shares) {
    return scoreCriterion("Owner Earnings Yield", null, () => 0, "Cannot estimate market cap");
  }

  const marketCap = hist.currentPrice * shares;
  const yield_ = (ownerEarnings / marketCap) * 100;

  return scoreCriterion(
    "Owner Earnings Yield",
    yield_,
    (v) => {
      if (v >= 10) return 10;
      if (v >= 7) return 8;
      if (v >= 5) return 6;
      if (v >= 3) return 4;
      if (v > 0) return 2;
      return 0;
    },
    `Owner earnings yield: ${yield_.toFixed(1)}%`
  );
}

// 3. Gross Margin Stability & Level
function scoreGrossMargin(hist: FinancialHistory) {
  const margins = hist.annualIncomes
    .filter((i) => i.revenue && i.revenue > 0 && i.grossProfit != null)
    .map((i) => ((i.grossProfit! / i.revenue!) * 100))
    .slice(0, 5);

  if (margins.length < 2) {
    return scoreCriterion("Gross Margin", null, () => 0, "Insufficient data");
  }

  const avg = margins.reduce((a, b) => a + b, 0) / margins.length;
  const stdDev = Math.sqrt(margins.reduce((sum, m) => sum + (m - avg) ** 2, 0) / margins.length);

  return scoreCriterion(
    "Gross Margin",
    avg,
    (v) => {
      let s = 0;
      if (v >= 40) s = 7;
      else if (v >= 30) s = 5;
      else if (v >= 20) s = 3;
      else s = 1;
      // Bonus for stability (low std dev)
      if (stdDev < 3) s += 3;
      else if (stdDev < 5) s += 2;
      else if (stdDev < 8) s += 1;
      return s;
    },
    `Avg gross margin: ${avg.toFixed(1)}%, StdDev: ${stdDev.toFixed(1)}%`
  );
}

// 4. Operating Margin
function scoreOperatingMargin(hist: FinancialHistory) {
  const margins = hist.annualIncomes
    .filter((i) => i.revenue && i.revenue > 0 && i.operatingIncome != null)
    .map((i) => ((i.operatingIncome! / i.revenue!) * 100))
    .slice(0, 5);

  if (margins.length === 0) {
    return scoreCriterion("Operating Margin", null, () => 0, "No data");
  }

  const avg = margins.reduce((a, b) => a + b, 0) / margins.length;

  return scoreCriterion(
    "Operating Margin",
    avg,
    (v) => {
      if (v >= 25) return 10;
      if (v >= 20) return 8;
      if (v >= 15) return 6;
      if (v >= 10) return 4;
      if (v > 0) return 2;
      return 0;
    },
    `Avg operating margin: ${avg.toFixed(1)}%`
  );
}

// 5. Low CapEx Ratio (CapEx / Net Income < 50%)
function scoreCapexRatio(hist: FinancialHistory) {
  const ratios = hist.annualIncomes
    .map((inc) => {
      const cf = hist.annualCashFlows.find((c) => c.periodEnd === inc.periodEnd);
      if (!inc.netIncome || inc.netIncome <= 0 || !cf?.capitalExpenditure) return null;
      return (Math.abs(cf.capitalExpenditure) / inc.netIncome) * 100;
    })
    .filter((v): v is number => v != null)
    .slice(0, 5);

  if (ratios.length === 0) {
    return scoreCriterion("CapEx Ratio", null, () => 0, "No data");
  }

  const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;

  return scoreCriterion(
    "CapEx Ratio",
    avg,
    (v) => {
      if (v < 25) return 10;
      if (v < 35) return 8;
      if (v < 50) return 6;
      if (v < 75) return 3;
      return 1;
    },
    `Avg CapEx/Net Income: ${avg.toFixed(1)}% (lower = capital-light)`
  );
}

// 6. Earnings Predictability (low coefficient of variation)
function scoreEarningsPredictability(hist: FinancialHistory) {
  const earnings = hist.annualIncomes
    .filter((i) => i.netIncome != null)
    .map((i) => i.netIncome!)
    .slice(0, 5);

  if (earnings.length < 3) {
    return scoreCriterion("Earnings Predictability", null, () => 0, "Insufficient data");
  }

  const avg = earnings.reduce((a, b) => a + b, 0) / earnings.length;
  if (avg === 0) {
    return scoreCriterion("Earnings Predictability", null, () => 0, "Zero average earnings");
  }

  const stdDev = Math.sqrt(earnings.reduce((sum, e) => sum + (e - avg) ** 2, 0) / earnings.length);
  const cv = (stdDev / Math.abs(avg)) * 100;

  return scoreCriterion(
    "Earnings Predictability",
    cv,
    (v) => {
      if (v < 10) return 10;
      if (v < 20) return 8;
      if (v < 30) return 6;
      if (v < 50) return 4;
      return 2;
    },
    `Coefficient of variation: ${cv.toFixed(1)}% (lower = more predictable)`
  );
}

// 7. Debt Payoff (Total Debt / Owner Earnings < 4 years)
function scoreDebtPayoff(hist: FinancialHistory) {
  const latestBalance = hist.annualBalances[0];
  const latestIncome = hist.annualIncomes[0];
  const latestCF = hist.annualCashFlows[0];

  if (!latestBalance?.totalDebt || !latestIncome?.netIncome || !latestCF) {
    return scoreCriterion("Debt Payoff", null, () => 0, "No data");
  }

  const capex = Math.abs(latestCF.capitalExpenditure ?? 0);
  const ownerEarnings = latestIncome.netIncome + (latestCF.depreciation ?? 0) - capex;

  if (ownerEarnings <= 0) {
    return scoreCriterion("Debt Payoff", null, () => 0, "Negative owner earnings");
  }

  const years = latestBalance.totalDebt / ownerEarnings;

  return scoreCriterion(
    "Debt Payoff",
    years,
    (v) => {
      if (v <= 1) return 10;
      if (v <= 2) return 8;
      if (v <= 3) return 6;
      if (v <= 4) return 4;
      if (v <= 6) return 2;
      return 0;
    },
    `${years.toFixed(1)} years to pay off debt with owner earnings`
  );
}

// 8. Dividend Consistency & Share Buybacks
function scoreManagementQuality(hist: FinancialHistory) {
  // Check dividend consistency
  const dividendYears = hist.annualCashFlows
    .slice(0, 5)
    .filter((cf) => cf.dividendsPaid != null && cf.dividendsPaid < 0).length;

  // Check for share buybacks (decreasing shares outstanding)
  const shares = hist.annualIncomes
    .filter((i) => i.sharesOutstanding != null && i.sharesOutstanding > 0)
    .map((i) => i.sharesOutstanding!)
    .slice(0, 5);

  let buybackSignal = false;
  if (shares.length >= 2) {
    buybackSignal = shares[0] < shares[shares.length - 1];
  }

  const totalYears = Math.min(5, hist.annualCashFlows.length);
  const dividendScore = totalYears > 0 ? (dividendYears / totalYears) * 7 : 0;
  const buybackScore = buybackSignal ? 3 : 0;

  return {
    name: "Management Quality",
    score: Math.round((dividendScore + buybackScore) * 10) / 10,
    value: dividendYears,
    description: `Dividends: ${dividendYears}/${totalYears} years${buybackSignal ? " + share buybacks detected" : ""}`,
  };
}

export function runBuffettScreen(symbol: string): BuffettScreenResult | null {
  const hist = getHistory(symbol);
  if (!hist) return null;

  const criteria = [
    scoreROE(hist),
    scoreOwnerEarnings(hist),
    scoreGrossMargin(hist),
    scoreOperatingMargin(hist),
    scoreCapexRatio(hist),
    scoreEarningsPredictability(hist),
    scoreDebtPayoff(hist),
    scoreManagementQuality(hist),
  ];

  const totalScore = criteria.reduce((sum, c) => sum + c.score, 0);
  const maxScore = criteria.length * 10;
  const normalizedScore = Math.round((totalScore / maxScore) * 100);

  return {
    symbol,
    criteria,
    totalScore,
    maxScore,
    normalizedScore,
  };
}
