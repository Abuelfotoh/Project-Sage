import { db } from "@/db";
import { companies, incomeStatements, balanceSheets, cashFlows, syncLog } from "@/db/schema";
import { fetchQuoteSummary, parseFinancials } from "@/lib/data-sources/yahoo";
import { eq } from "drizzle-orm";

export async function syncFinancials(symbols?: string[]): Promise<number> {
  const logEntry = {
    syncType: "financials",
    startedAt: new Date().toISOString(),
    status: "running",
  };

  const result = db.insert(syncLog).values(logEntry).returning().all();
  const log = result[0];
  let totalRecords = 0;
  let errors = 0;

  try {
    const companyList = symbols
      ? db
          .select()
          .from(companies)
          .where(eq(companies.isActive, 1))
          .all()
          .filter((c) => symbols.includes(c.symbol))
      : db
          .select()
          .from(companies)
          .where(eq(companies.isActive, 1))
          .all();

    console.log(`Syncing financials for ${companyList.length} companies...`);

    for (const company of companyList) {
      try {
        const summary = await fetchQuoteSummary(company.symbol);
        const financials = parseFinancials(summary);

        // Upsert income statements
        for (const stmt of financials.incomeStatements) {
          db.insert(incomeStatements)
            .values({
              symbol: company.symbol,
              periodEnd: stmt.periodEnd,
              periodType: stmt.periodType,
              revenue: stmt.revenue ?? null,
              costOfRevenue: stmt.costOfRevenue ?? null,
              grossProfit: stmt.grossProfit ?? null,
              operatingIncome: stmt.operatingIncome ?? null,
              netIncome: stmt.netIncome ?? null,
              ebit: stmt.ebit ?? null,
              ebitda: stmt.ebitda ?? null,
              eps: stmt.eps ?? null,
              sharesOutstanding: stmt.sharesOutstanding ?? null,
              currency: "SAR",
              rawJson: JSON.stringify(stmt),
            })
            .onConflictDoUpdate({
              target: [
                incomeStatements.symbol,
                incomeStatements.periodEnd,
                incomeStatements.periodType,
              ],
              set: {
                revenue: stmt.revenue ?? null,
                costOfRevenue: stmt.costOfRevenue ?? null,
                grossProfit: stmt.grossProfit ?? null,
                operatingIncome: stmt.operatingIncome ?? null,
                netIncome: stmt.netIncome ?? null,
                ebit: stmt.ebit ?? null,
                ebitda: stmt.ebitda ?? null,
                eps: stmt.eps ?? null,
                sharesOutstanding: stmt.sharesOutstanding ?? null,
                rawJson: JSON.stringify(stmt),
              },
            })
            .run();
          totalRecords++;
        }

        // Upsert balance sheets
        for (const bs of financials.balanceSheets) {
          const netCurrentAssets =
            bs.currentAssets != null && bs.totalLiabilities != null
              ? bs.currentAssets - bs.totalLiabilities
              : null;

          db.insert(balanceSheets)
            .values({
              symbol: company.symbol,
              periodEnd: bs.periodEnd,
              periodType: bs.periodType,
              totalAssets: bs.totalAssets ?? null,
              currentAssets: bs.currentAssets ?? null,
              totalLiabilities: bs.totalLiabilities ?? null,
              currentLiabilities: bs.currentLiabilities ?? null,
              totalDebt: bs.totalDebt ?? null,
              longTermDebt: bs.longTermDebt ?? null,
              totalEquity: bs.totalEquity ?? null,
              bookValuePerShare: bs.bookValuePerShare ?? null,
              cashAndEquivalents: bs.cashAndEquivalents ?? null,
              netCurrentAssets: netCurrentAssets,
              rawJson: JSON.stringify(bs),
            })
            .onConflictDoUpdate({
              target: [
                balanceSheets.symbol,
                balanceSheets.periodEnd,
                balanceSheets.periodType,
              ],
              set: {
                totalAssets: bs.totalAssets ?? null,
                currentAssets: bs.currentAssets ?? null,
                totalLiabilities: bs.totalLiabilities ?? null,
                currentLiabilities: bs.currentLiabilities ?? null,
                totalDebt: bs.totalDebt ?? null,
                longTermDebt: bs.longTermDebt ?? null,
                totalEquity: bs.totalEquity ?? null,
                bookValuePerShare: bs.bookValuePerShare ?? null,
                cashAndEquivalents: bs.cashAndEquivalents ?? null,
                netCurrentAssets: netCurrentAssets,
                rawJson: JSON.stringify(bs),
              },
            })
            .run();
          totalRecords++;
        }

        // Upsert cash flows
        for (const cf of financials.cashFlows) {
          db.insert(cashFlows)
            .values({
              symbol: company.symbol,
              periodEnd: cf.periodEnd,
              periodType: cf.periodType,
              operatingCashFlow: cf.operatingCashFlow ?? null,
              capitalExpenditure: cf.capitalExpenditure ?? null,
              freeCashFlow: cf.freeCashFlow ?? null,
              dividendsPaid: cf.dividendsPaid ?? null,
              depreciation: cf.depreciation ?? null,
              rawJson: JSON.stringify(cf),
            })
            .onConflictDoUpdate({
              target: [
                cashFlows.symbol,
                cashFlows.periodEnd,
                cashFlows.periodType,
              ],
              set: {
                operatingCashFlow: cf.operatingCashFlow ?? null,
                capitalExpenditure: cf.capitalExpenditure ?? null,
                freeCashFlow: cf.freeCashFlow ?? null,
                dividendsPaid: cf.dividendsPaid ?? null,
                depreciation: cf.depreciation ?? null,
                rawJson: JSON.stringify(cf),
              },
            })
            .run();
          totalRecords++;
        }

        console.log(
          `  ${company.symbol} (${company.nameEn}): ${financials.incomeStatements.length} income, ${financials.balanceSheets.length} balance, ${financials.cashFlows.length} cashflow`
        );
      } catch (error) {
        errors++;
        console.error(
          `  Error syncing financials for ${company.symbol}:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    const status =
      errors === 0
        ? "success"
        : errors < companyList.length
          ? "partial"
          : "failed";
    db.update(syncLog)
      .set({
        completedAt: new Date().toISOString(),
        status,
        recordsAffected: totalRecords,
        errorMessage: errors > 0 ? `${errors} companies failed` : null,
      })
      .where(eq(syncLog.id, log.id))
      .run();

    console.log(
      `Financial sync complete: ${totalRecords} records, ${errors} errors`
    );
  } catch (error) {
    db.update(syncLog)
      .set({
        completedAt: new Date().toISOString(),
        status: "failed",
        errorMessage: error instanceof Error ? error.message : String(error),
      })
      .where(eq(syncLog.id, log.id))
      .run();
    throw error;
  }

  return totalRecords;
}
