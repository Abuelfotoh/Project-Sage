import YahooFinance from "yahoo-finance2";
import type { PriceBar, IncomeStatementData, BalanceSheetData, CashFlowData } from "./types";

const yahooFinance = new YahooFinance();
const DELAY_MS = 250;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toYahooTicker(symbol: string): string {
  return `${symbol}.SR`;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export async function fetchHistoricalPrices(
  symbol: string,
  startDate: Date,
  endDate: Date = new Date()
): Promise<PriceBar[]> {
  await sleep(DELAY_MS);
  const ticker = toYahooTicker(symbol);

  const result = await yahooFinance.historical(ticker, {
    period1: startDate,
    period2: endDate,
    interval: "1d",
  });

  return result
    .filter((bar) => bar.close != null)
    .map((bar) => ({
      date: formatDate(bar.date),
      open: bar.open ?? 0,
      high: bar.high ?? 0,
      low: bar.low ?? 0,
      close: bar.close ?? 0,
      volume: bar.volume ?? 0,
      adjustedClose: bar.adjClose ?? bar.close ?? 0,
    }));
}

export async function fetchQuoteSummary(symbol: string) {
  await sleep(DELAY_MS);
  const ticker = toYahooTicker(symbol);

  const result = await yahooFinance.quoteSummary(ticker, {
    modules: [
      "incomeStatementHistory",
      "incomeStatementHistoryQuarterly",
      "balanceSheetHistory",
      "balanceSheetHistoryQuarterly",
      "cashflowStatementHistory",
      "cashflowStatementHistoryQuarterly",
      "defaultKeyStatistics",
      "financialData",
    ],
  });

  return result;
}

function extractIncomeStatements(
  statements: Array<Record<string, unknown>> | undefined,
  periodType: "annual" | "quarterly"
): IncomeStatementData[] {
  if (!statements) return [];
  return statements.map((s: Record<string, unknown>) => ({
    periodEnd: formatDate(s.endDate as Date),
    periodType,
    revenue: (s.totalRevenue as number) ?? null,
    costOfRevenue: (s.costOfRevenue as number) ?? null,
    grossProfit: (s.grossProfit as number) ?? null,
    operatingIncome: (s.operatingIncome as number) ?? null,
    netIncome: (s.netIncome as number) ?? null,
    ebit: (s.ebit as number) ?? null,
    ebitda: (s.ebitda as number) ?? null,
    eps: ((s.dilutedEPS ?? s.basicEPS) as number) ?? null,
    sharesOutstanding: null,
  }));
}

function extractBalanceSheets(
  statements: Array<Record<string, unknown>> | undefined,
  periodType: "annual" | "quarterly"
): BalanceSheetData[] {
  if (!statements) return [];
  return statements.map((s: Record<string, unknown>) => ({
    periodEnd: formatDate(s.endDate as Date),
    periodType,
    totalAssets: (s.totalAssets as number) ?? null,
    currentAssets: (s.totalCurrentAssets as number) ?? null,
    totalLiabilities: (s.totalLiab as number) ?? null,
    currentLiabilities: (s.totalCurrentLiabilities as number) ?? null,
    totalDebt: ((s.longTermDebt as number) ?? 0) + ((s.shortLongTermDebt as number) ?? 0) || null,
    longTermDebt: (s.longTermDebt as number) ?? null,
    totalEquity: (s.totalStockholderEquity as number) ?? null,
    bookValuePerShare: null, // computed later
    cashAndEquivalents: (s.cash as number) ?? null,
  }));
}

function extractCashFlows(
  statements: Array<Record<string, unknown>> | undefined,
  periodType: "annual" | "quarterly"
): CashFlowData[] {
  if (!statements) return [];
  return statements.map((s: Record<string, unknown>) => ({
    periodEnd: formatDate(s.endDate as Date),
    periodType,
    operatingCashFlow: (s.totalCashFromOperatingActivities as number) ?? null,
    capitalExpenditure: (s.capitalExpenditures as number) ?? null,
    freeCashFlow: (s.freeCashFlow as number) ?? null,
    dividendsPaid: (s.dividendsPaid as number) ?? null,
    depreciation: (s.depreciation as number) ?? null,
  }));
}

export function parseFinancials(summary: Awaited<ReturnType<typeof fetchQuoteSummary>>) {
  const incomeAnnual = extractIncomeStatements(
    summary.incomeStatementHistory?.incomeStatementHistory as Array<Record<string, unknown>> | undefined,
    "annual"
  );
  const incomeQuarterly = extractIncomeStatements(
    summary.incomeStatementHistoryQuarterly?.incomeStatementHistory as Array<Record<string, unknown>> | undefined,
    "quarterly"
  );

  const balanceAnnual = extractBalanceSheets(
    summary.balanceSheetHistory?.balanceSheetStatements as Array<Record<string, unknown>> | undefined,
    "annual"
  );
  const balanceQuarterly = extractBalanceSheets(
    summary.balanceSheetHistoryQuarterly?.balanceSheetStatements as Array<Record<string, unknown>> | undefined,
    "quarterly"
  );

  const cashflowAnnual = extractCashFlows(
    summary.cashflowStatementHistory?.cashflowStatements as Array<Record<string, unknown>> | undefined,
    "annual"
  );
  const cashflowQuarterly = extractCashFlows(
    summary.cashflowStatementHistoryQuarterly?.cashflowStatements as Array<Record<string, unknown>> | undefined,
    "quarterly"
  );

  return {
    incomeStatements: [...incomeAnnual, ...incomeQuarterly],
    balanceSheets: [...balanceAnnual, ...balanceQuarterly],
    cashFlows: [...cashflowAnnual, ...cashflowQuarterly],
    keyStats: summary.defaultKeyStatistics,
    financialData: summary.financialData,
  };
}

export async function fetchCurrentPrice(symbol: string): Promise<number | null> {
  await sleep(DELAY_MS);
  const ticker = toYahooTicker(symbol);
  try {
    const quote = await yahooFinance.quote(ticker);
    return quote.regularMarketPrice ?? null;
  } catch {
    return null;
  }
}
