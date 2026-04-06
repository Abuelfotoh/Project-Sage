import { z } from "zod";

export const CompanySchema = z.object({
  symbol: z.string().min(1),
  nameEn: z.string().min(1),
  nameAr: z.string().optional(),
  sectorEn: z.string().optional(),
  sectorAr: z.string().optional(),
  market: z.enum(["main", "nomu", "reit"]).default("main"),
});

export type CompanyData = z.infer<typeof CompanySchema>;

export const PriceBarSchema = z.object({
  date: z.string(), // YYYY-MM-DD
  open: z.number().nonnegative(),
  high: z.number().nonnegative(),
  low: z.number().nonnegative(),
  close: z.number().nonnegative(),
  volume: z.number().int().nonnegative(),
  adjustedClose: z.number().nonnegative().optional(),
});

export type PriceBar = z.infer<typeof PriceBarSchema>;

export const IncomeStatementSchema = z.object({
  periodEnd: z.string(),
  periodType: z.enum(["annual", "quarterly"]),
  revenue: z.number().nullable().optional(),
  costOfRevenue: z.number().nullable().optional(),
  grossProfit: z.number().nullable().optional(),
  operatingIncome: z.number().nullable().optional(),
  netIncome: z.number().nullable().optional(),
  ebit: z.number().nullable().optional(),
  ebitda: z.number().nullable().optional(),
  eps: z.number().nullable().optional(),
  sharesOutstanding: z.number().int().nullable().optional(),
});

export type IncomeStatementData = z.infer<typeof IncomeStatementSchema>;

export const BalanceSheetSchema = z.object({
  periodEnd: z.string(),
  periodType: z.enum(["annual", "quarterly"]),
  totalAssets: z.number().nullable().optional(),
  currentAssets: z.number().nullable().optional(),
  totalLiabilities: z.number().nullable().optional(),
  currentLiabilities: z.number().nullable().optional(),
  totalDebt: z.number().nullable().optional(),
  longTermDebt: z.number().nullable().optional(),
  totalEquity: z.number().nullable().optional(),
  bookValuePerShare: z.number().nullable().optional(),
  cashAndEquivalents: z.number().nullable().optional(),
});

export type BalanceSheetData = z.infer<typeof BalanceSheetSchema>;

export const CashFlowSchema = z.object({
  periodEnd: z.string(),
  periodType: z.enum(["annual", "quarterly"]),
  operatingCashFlow: z.number().nullable().optional(),
  capitalExpenditure: z.number().nullable().optional(),
  freeCashFlow: z.number().nullable().optional(),
  dividendsPaid: z.number().nullable().optional(),
  depreciation: z.number().nullable().optional(),
});

export type CashFlowData = z.infer<typeof CashFlowSchema>;
