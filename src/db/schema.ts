import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";

// ─── Companies ───────────────────────────────────────────────
export const companies = sqliteTable("companies", {
  symbol: text("symbol").primaryKey(), // e.g. "2222"
  yahooTicker: text("yahoo_ticker").notNull(), // e.g. "2222.SR"
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar"),
  sectorEn: text("sector_en"),
  sectorAr: text("sector_ar"),
  market: text("market").default("main"), // "main" or "nomu"
  listingDate: text("listing_date"),
  isActive: integer("is_active").default(1),
  updatedAt: text("updated_at"),
});

// ─── Prices ──────────────────────────────────────────────────
export const prices = sqliteTable(
  "prices",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    symbol: text("symbol")
      .notNull()
      .references(() => companies.symbol),
    date: text("date").notNull(), // ISO date YYYY-MM-DD
    open: real("open"),
    high: real("high"),
    low: real("low"),
    close: real("close"),
    volume: integer("volume"),
    adjustedClose: real("adjusted_close"),
  },
  (table) => [
    uniqueIndex("prices_symbol_date_idx").on(table.symbol, table.date),
  ]
);

// ─── Income Statements ──────────────────────────────────────
export const incomeStatements = sqliteTable(
  "income_statements",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    symbol: text("symbol")
      .notNull()
      .references(() => companies.symbol),
    periodEnd: text("period_end").notNull(),
    periodType: text("period_type").notNull(), // "annual" or "quarterly"
    revenue: real("revenue"),
    costOfRevenue: real("cost_of_revenue"),
    grossProfit: real("gross_profit"),
    operatingIncome: real("operating_income"),
    netIncome: real("net_income"),
    ebit: real("ebit"),
    ebitda: real("ebitda"),
    eps: real("eps"),
    sharesOutstanding: integer("shares_outstanding"),
    currency: text("currency").default("SAR"),
    rawJson: text("raw_json"),
  },
  (table) => [
    uniqueIndex("income_symbol_period_idx").on(
      table.symbol,
      table.periodEnd,
      table.periodType
    ),
  ]
);

// ─── Balance Sheets ──────────────────────────────────────────
export const balanceSheets = sqliteTable(
  "balance_sheets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    symbol: text("symbol")
      .notNull()
      .references(() => companies.symbol),
    periodEnd: text("period_end").notNull(),
    periodType: text("period_type").notNull(),
    totalAssets: real("total_assets"),
    currentAssets: real("current_assets"),
    totalLiabilities: real("total_liabilities"),
    currentLiabilities: real("current_liabilities"),
    totalDebt: real("total_debt"),
    longTermDebt: real("long_term_debt"),
    totalEquity: real("total_equity"),
    bookValuePerShare: real("book_value_per_share"),
    cashAndEquivalents: real("cash_and_equivalents"),
    netCurrentAssets: real("net_current_assets"), // current_assets - total_liabilities
    rawJson: text("raw_json"),
  },
  (table) => [
    uniqueIndex("balance_symbol_period_idx").on(
      table.symbol,
      table.periodEnd,
      table.periodType
    ),
  ]
);

// ─── Cash Flows ──────────────────────────────────────────────
export const cashFlows = sqliteTable(
  "cash_flows",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    symbol: text("symbol")
      .notNull()
      .references(() => companies.symbol),
    periodEnd: text("period_end").notNull(),
    periodType: text("period_type").notNull(),
    operatingCashFlow: real("operating_cash_flow"),
    capitalExpenditure: real("capital_expenditure"),
    freeCashFlow: real("free_cash_flow"),
    dividendsPaid: real("dividends_paid"),
    depreciation: real("depreciation"),
    rawJson: text("raw_json"),
  },
  (table) => [
    uniqueIndex("cashflow_symbol_period_idx").on(
      table.symbol,
      table.periodEnd,
      table.periodType
    ),
  ]
);

// ─── Screen Results ──────────────────────────────────────────
export const screenResults = sqliteTable(
  "screen_results",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    symbol: text("symbol")
      .notNull()
      .references(() => companies.symbol),
    screenType: text("screen_type").notNull(), // "graham", "buffett", "dcf", "composite"
    score: real("score"),
    detailsJson: text("details_json"),
    computedAt: text("computed_at").notNull(),
  },
  (table) => [
    uniqueIndex("screen_symbol_type_idx").on(table.symbol, table.screenType),
  ]
);

// ─── Watchlist ───────────────────────────────────────────────
export const watchlist = sqliteTable("watchlist", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  symbol: text("symbol")
    .notNull()
    .references(() => companies.symbol),
  addedAt: text("added_at").notNull(),
  notes: text("notes"),
  targetPrice: real("target_price"),
  alertEnabled: integer("alert_enabled").default(0),
});

// ─── AI Cache ────────────────────────────────────────────────
export const aiCache = sqliteTable(
  "ai_cache",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    symbol: text("symbol").notNull(),
    analysisType: text("analysis_type").notNull(), // "memo", "statement", "report", "buffett_lens"
    promptHash: text("prompt_hash").notNull(),
    resultText: text("result_text"),
    modelUsed: text("model_used"),
    createdAt: text("created_at").notNull(),
    expiresAt: text("expires_at"),
  },
  (table) => [
    uniqueIndex("ai_cache_hash_idx").on(table.symbol, table.analysisType, table.promptHash),
  ]
);

// ─── Sync Log ────────────────────────────────────────────────
export const syncLog = sqliteTable("sync_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  syncType: text("sync_type").notNull(), // "prices", "financials", "companies"
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
  status: text("status").notNull(), // "running", "success", "partial", "failed"
  recordsAffected: integer("records_affected").default(0),
  errorMessage: text("error_message"),
});
