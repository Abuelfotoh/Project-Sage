/**
 * DCF Intrinsic Value Model
 * Two-stage discounted cash flow using owner earnings.
 * Grounded in Buffett's definition of owner earnings from the 1986 letter.
 */

import { db } from "@/db";
import { incomeStatements, balanceSheets, cashFlows, prices } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { DCFResult } from "./types";

const DEFAULT_DISCOUNT_RATE = 0.10; // 10% hurdle rate
const TERMINAL_GROWTH_RATE = 0.03; // 3% (Saudi GDP growth)
const GROWTH_PHASE_YEARS = 5;
const TERMINAL_PHASE_YEARS = 5;
const MAX_GROWTH_RATE = 0.15; // Cap growth at 15%

interface DCFInputs {
  ownerEarnings: number;
  growthRate: number;
  discountRate: number;
  terminalGrowthRate: number;
  sharesOutstanding: number;
  currentPrice: number;
}

function calculateDCF(inputs: DCFInputs): {
  intrinsicValue: number;
  marginOfSafety: number;
  fairValue: number;
  bargainValue: number;
} {
  const { ownerEarnings, growthRate, discountRate, terminalGrowthRate } = inputs;

  let totalPV = 0;

  // Stage 1: Growth phase (years 1-5)
  for (let year = 1; year <= GROWTH_PHASE_YEARS; year++) {
    const futureCF = ownerEarnings * Math.pow(1 + growthRate, year);
    const pv = futureCF / Math.pow(1 + discountRate, year);
    totalPV += pv;
  }

  // Stage 2: Transition phase (years 6-10), growth fades to terminal rate
  const growthStep = (growthRate - terminalGrowthRate) / TERMINAL_PHASE_YEARS;
  for (let year = GROWTH_PHASE_YEARS + 1; year <= GROWTH_PHASE_YEARS + TERMINAL_PHASE_YEARS; year++) {
    const fadeYear = year - GROWTH_PHASE_YEARS;
    const fadedGrowth = growthRate - growthStep * fadeYear;
    const futureCF =
      ownerEarnings *
      Math.pow(1 + growthRate, GROWTH_PHASE_YEARS) *
      Math.pow(1 + fadedGrowth, fadeYear);
    const pv = futureCF / Math.pow(1 + discountRate, year);
    totalPV += pv;
  }

  // Terminal value using Gordon Growth Model
  const terminalYearCF =
    ownerEarnings *
    Math.pow(1 + growthRate, GROWTH_PHASE_YEARS) *
    Math.pow(1 + terminalGrowthRate, TERMINAL_PHASE_YEARS);
  const terminalValue = (terminalYearCF * (1 + terminalGrowthRate)) / (discountRate - terminalGrowthRate);
  const pvTerminal = terminalValue / Math.pow(1 + discountRate, GROWTH_PHASE_YEARS + TERMINAL_PHASE_YEARS);

  totalPV += pvTerminal;

  const intrinsicValuePerShare = totalPV / inputs.sharesOutstanding;
  const marginOfSafety =
    ((intrinsicValuePerShare - inputs.currentPrice) / intrinsicValuePerShare) * 100;

  return {
    intrinsicValue: intrinsicValuePerShare,
    marginOfSafety,
    fairValue: intrinsicValuePerShare * 0.75, // 25% margin of safety
    bargainValue: intrinsicValuePerShare * 0.5, // 50% margin of safety
  };
}

function estimateGrowthRate(
  annualIncomes: (typeof incomeStatements.$inferSelect)[]
): number {
  if (annualIncomes.length < 2) return 0.05; // default 5%

  // Use EPS growth if available, otherwise net income growth
  const values = annualIncomes
    .filter((i) => i.eps != null && i.eps > 0)
    .map((i) => i.eps!);

  if (values.length < 2) {
    const netIncomes = annualIncomes
      .filter((i) => i.netIncome != null && i.netIncome > 0)
      .map((i) => i.netIncome!);
    if (netIncomes.length < 2) return 0.05;
    const cagr = Math.pow(
      netIncomes[0] / netIncomes[netIncomes.length - 1],
      1 / (netIncomes.length - 1)
    ) - 1;
    return Math.max(0, Math.min(MAX_GROWTH_RATE, cagr));
  }

  // CAGR from oldest to newest
  const cagr = Math.pow(values[0] / values[values.length - 1], 1 / (values.length - 1)) - 1;

  // Be conservative: use half the historical growth or max 15%
  const conservativeGrowth = cagr * 0.75;
  return Math.max(0, Math.min(MAX_GROWTH_RATE, conservativeGrowth));
}

export function runDCF(symbol: string): DCFResult | null {
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
    .where(and(eq(incomeStatements.symbol, symbol), eq(incomeStatements.periodType, "annual")))
    .orderBy(desc(incomeStatements.periodEnd))
    .all();

  const annualCashFlows = db
    .select()
    .from(cashFlows)
    .where(and(eq(cashFlows.symbol, symbol), eq(cashFlows.periodType, "annual")))
    .orderBy(desc(cashFlows.periodEnd))
    .all();

  const latestIncome = annualIncomes[0];
  const latestCF = annualCashFlows[0];

  if (!latestIncome?.netIncome || !latestCF) {
    return {
      symbol,
      intrinsicValue: null,
      currentPrice: latestPrice.close,
      marginOfSafety: null,
      fairValue: null,
      bargainValue: null,
      ownerEarnings: null,
      growthRate: null,
      discountRate: DEFAULT_DISCOUNT_RATE,
      terminalGrowthRate: TERMINAL_GROWTH_RATE,
      score: 0,
    };
  }

  // Owner Earnings = Net Income + Depreciation - CapEx
  const depreciation = latestCF.depreciation ?? 0;
  const capex = Math.abs(latestCF.capitalExpenditure ?? 0);
  const ownerEarnings = latestIncome.netIncome + depreciation - capex;

  if (ownerEarnings <= 0) {
    return {
      symbol,
      intrinsicValue: null,
      currentPrice: latestPrice.close,
      marginOfSafety: null,
      fairValue: null,
      bargainValue: null,
      ownerEarnings,
      growthRate: null,
      discountRate: DEFAULT_DISCOUNT_RATE,
      terminalGrowthRate: TERMINAL_GROWTH_RATE,
      score: 0,
    };
  }

  // Estimate shares outstanding
  const sharesOutstanding =
    latestIncome.sharesOutstanding ??
    (latestIncome.eps && latestIncome.eps !== 0
      ? Math.round(latestIncome.netIncome / latestIncome.eps)
      : null);

  if (!sharesOutstanding || sharesOutstanding <= 0) {
    return {
      symbol,
      intrinsicValue: null,
      currentPrice: latestPrice.close,
      marginOfSafety: null,
      fairValue: null,
      bargainValue: null,
      ownerEarnings,
      growthRate: null,
      discountRate: DEFAULT_DISCOUNT_RATE,
      terminalGrowthRate: TERMINAL_GROWTH_RATE,
      score: 0,
    };
  }

  const growthRate = estimateGrowthRate(annualIncomes);

  const dcf = calculateDCF({
    ownerEarnings,
    growthRate,
    discountRate: DEFAULT_DISCOUNT_RATE,
    terminalGrowthRate: TERMINAL_GROWTH_RATE,
    sharesOutstanding,
    currentPrice: latestPrice.close,
  });

  // Score based on margin of safety
  let score = 0;
  if (dcf.marginOfSafety >= 50) score = 100;
  else if (dcf.marginOfSafety >= 40) score = 85;
  else if (dcf.marginOfSafety >= 30) score = 70;
  else if (dcf.marginOfSafety >= 20) score = 55;
  else if (dcf.marginOfSafety >= 10) score = 40;
  else if (dcf.marginOfSafety >= 0) score = 25;
  else score = Math.max(0, 15 + dcf.marginOfSafety); // negative margin = overvalued

  return {
    symbol,
    intrinsicValue: Math.round(dcf.intrinsicValue * 100) / 100,
    currentPrice: latestPrice.close,
    marginOfSafety: Math.round(dcf.marginOfSafety * 10) / 10,
    fairValue: Math.round(dcf.fairValue * 100) / 100,
    bargainValue: Math.round(dcf.bargainValue * 100) / 100,
    ownerEarnings,
    growthRate: Math.round(growthRate * 1000) / 10,
    discountRate: DEFAULT_DISCOUNT_RATE,
    terminalGrowthRate: TERMINAL_GROWTH_RATE,
    score: Math.round(score),
  };
}
