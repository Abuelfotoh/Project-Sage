import { db } from "@/db";
import { companies, syncLog } from "@/db/schema";
import { fetchTadawulCompanies } from "@/lib/data-sources/argaam";
import { eq } from "drizzle-orm";

export async function syncCompanies(): Promise<number> {
  const logEntry = {
    syncType: "companies",
    startedAt: new Date().toISOString(),
    status: "running",
  };

  const result = db.insert(syncLog).values(logEntry).returning().all();
  const log = result[0];
  let count = 0;

  try {
    const companyList = await fetchTadawulCompanies();

    for (const company of companyList) {
      const existing = db
        .select()
        .from(companies)
        .where(eq(companies.symbol, company.symbol))
        .get();

      if (existing) {
        db.update(companies)
          .set({
            nameEn: company.nameEn,
            nameAr: company.nameAr ?? existing.nameAr,
            sectorEn: company.sectorEn ?? existing.sectorEn,
            sectorAr: company.sectorAr ?? existing.sectorAr,
            market: company.market,
            isActive: 1,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(companies.symbol, company.symbol))
          .run();
      } else {
        db.insert(companies)
          .values({
            symbol: company.symbol,
            yahooTicker: `${company.symbol}.SR`,
            nameEn: company.nameEn,
            nameAr: company.nameAr,
            sectorEn: company.sectorEn,
            sectorAr: company.sectorAr,
            market: company.market,
            isActive: 1,
            updatedAt: new Date().toISOString(),
          })
          .run();
      }
      count++;
    }

    db.update(syncLog)
      .set({
        completedAt: new Date().toISOString(),
        status: "success",
        recordsAffected: count,
      })
      .where(eq(syncLog.id, log.id))
      .run();

    console.log(`Company sync complete: ${count} companies`);
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

  return count;
}
