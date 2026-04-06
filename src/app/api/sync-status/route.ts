import { NextResponse } from "next/server";
import { db } from "@/db";
import { companies, prices, incomeStatements, syncLog } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export async function GET() {
  // Count companies
  const totalCompanies = db
    .select({ count: sql<number>`count(*)` })
    .from(companies)
    .get()?.count ?? 0;

  const activeCompanies = db
    .select({ count: sql<number>`count(*)` })
    .from(companies)
    .where(eq(companies.isActive, 1))
    .get()?.count ?? 0;

  // Count by market
  const mainCount = db
    .select({ count: sql<number>`count(*)` })
    .from(companies)
    .where(sql`${companies.isActive} = 1 AND ${companies.market} = 'main'`)
    .get()?.count ?? 0;

  const nomuCount = db
    .select({ count: sql<number>`count(*)` })
    .from(companies)
    .where(sql`${companies.isActive} = 1 AND ${companies.market} = 'nomu'`)
    .get()?.count ?? 0;

  const reitCount = db
    .select({ count: sql<number>`count(*)` })
    .from(companies)
    .where(sql`${companies.isActive} = 1 AND ${companies.market} = 'reit'`)
    .get()?.count ?? 0;

  // Count prices
  const totalPrices = db
    .select({ count: sql<number>`count(*)` })
    .from(prices)
    .get()?.count ?? 0;

  // Companies with price data
  const companiesWithPrices = db
    .select({ count: sql<number>`count(DISTINCT ${prices.symbol})` })
    .from(prices)
    .get()?.count ?? 0;

  // Companies with financial data
  const companiesWithFinancials = db
    .select({ count: sql<number>`count(DISTINCT ${incomeStatements.symbol})` })
    .from(incomeStatements)
    .get()?.count ?? 0;

  // Recent sync logs
  const recentLogs = db
    .select()
    .from(syncLog)
    .orderBy(desc(syncLog.id))
    .limit(10)
    .all();

  // Latest sync per type
  const latestPriceSync = db
    .select()
    .from(syncLog)
    .where(eq(syncLog.syncType, "prices"))
    .orderBy(desc(syncLog.id))
    .limit(1)
    .get();

  const latestFinancialSync = db
    .select()
    .from(syncLog)
    .where(eq(syncLog.syncType, "financials"))
    .orderBy(desc(syncLog.id))
    .limit(1)
    .get();

  const latestCompanySync = db
    .select()
    .from(syncLog)
    .where(eq(syncLog.syncType, "companies"))
    .orderBy(desc(syncLog.id))
    .limit(1)
    .get();

  return NextResponse.json({
    companies: {
      total: totalCompanies,
      active: activeCompanies,
      main: mainCount,
      nomu: nomuCount,
      reit: reitCount,
      withPrices: companiesWithPrices,
      withFinancials: companiesWithFinancials,
    },
    prices: {
      totalBars: totalPrices,
    },
    lastSync: {
      prices: latestPriceSync,
      financials: latestFinancialSync,
      companies: latestCompanySync,
    },
    recentLogs,
  });
}
