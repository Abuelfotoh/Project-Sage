import { db } from "@/db";
import { companies, prices, syncLog } from "@/db/schema";
import { fetchHistoricalPrices } from "@/lib/data-sources/yahoo";
import { eq, and, desc } from "drizzle-orm";

const BACKFILL_YEARS = 5;

export async function syncPrices(symbols?: string[]): Promise<number> {
  const logEntry = {
    syncType: "prices",
    startedAt: new Date().toISOString(),
    status: "running",
  };

  const result = db.insert(syncLog).values(logEntry).returning().all();
  const log = result[0];
  let totalRecords = 0;
  let errors = 0;

  try {
    // Get all active companies or the specified subset
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

    console.log(`Syncing prices for ${companyList.length} companies...`);

    for (const company of companyList) {
      try {
        // Find the latest price we have for this company
        const latestPrice = db
          .select()
          .from(prices)
          .where(eq(prices.symbol, company.symbol))
          .orderBy(desc(prices.date))
          .limit(1)
          .get();

        let startDate: Date;
        if (latestPrice) {
          // Fetch from the day after the latest price
          startDate = new Date(latestPrice.date);
          startDate.setDate(startDate.getDate() + 1);
        } else {
          // Backfill from BACKFILL_YEARS ago
          startDate = new Date();
          startDate.setFullYear(startDate.getFullYear() - BACKFILL_YEARS);
        }

        const endDate = new Date();

        // Skip if start date is today or later
        if (startDate >= endDate) {
          continue;
        }

        const priceBars = await fetchHistoricalPrices(
          company.symbol,
          startDate,
          endDate
        );

        if (priceBars.length === 0) continue;

        // Batch insert prices
        for (const bar of priceBars) {
          try {
            db.insert(prices)
              .values({
                symbol: company.symbol,
                date: bar.date,
                open: bar.open,
                high: bar.high,
                low: bar.low,
                close: bar.close,
                volume: bar.volume,
                adjustedClose: bar.adjustedClose,
              })
              .onConflictDoUpdate({
                target: [prices.symbol, prices.date],
                set: {
                  open: bar.open,
                  high: bar.high,
                  low: bar.low,
                  close: bar.close,
                  volume: bar.volume,
                  adjustedClose: bar.adjustedClose,
                },
              })
              .run();
          } catch {
            // Skip duplicate entries silently
          }
        }

        totalRecords += priceBars.length;
        console.log(
          `  ${company.symbol} (${company.nameEn}): ${priceBars.length} price bars`
        );
      } catch (error) {
        errors++;
        console.error(
          `  Error fetching prices for ${company.symbol}:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    const status = errors === 0 ? "success" : errors < companyList.length ? "partial" : "failed";
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
      `Price sync complete: ${totalRecords} records, ${errors} errors`
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
