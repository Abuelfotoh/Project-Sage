/**
 * Discover ALL Tadawul-listed companies by scanning Yahoo Finance.
 * Tadawul tickers are numeric (1xxx-9xxx) with .SR suffix.
 * This covers Main Market, Nomu, REITs, and all segments.
 *
 * Run with: npx tsx scripts/discover-all-tickers.ts
 */
import YahooFinance from "yahoo-finance2";
import { db } from "../src/db";
import { companies, syncLog } from "../src/db/schema";
import { eq } from "drizzle-orm";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey", "ripHistorical"] });
const DELAY_MS = 150;
const BATCH_SIZE = 20;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Known Tadawul ticker ranges (Main Market, Nomu, REITs, etc.)
// Main Market:      1xxx, 2xxx, 3xxx, 4xxx, 5xxx, 6xxx, 7xxx, 8xxx, 9xxx
// Nomu:             various ranges, often 6xxx, 7xxx, 9xxx, also 43xx, 73xx etc.
// REITs:            41xx range
// We'll scan the full 1000-9999 range in batches

function generateAllTickers(): string[] {
  const tickers: string[] = [];
  for (let i = 1000; i <= 9999; i++) {
    tickers.push(String(i));
  }
  return tickers;
}

interface DiscoveredCompany {
  symbol: string;
  name: string;
  price: number;
  marketCap: number | null;
  sector: string;
  industry: string;
  exchange: string;
  quoteType: string;
  market: string; // "main", "nomu", "reit", etc.
}

function classifyMarket(symbol: string, name: string, quoteType: string, marketCap: number | null): string {
  const num = parseInt(symbol);
  const nameLower = (name || "").toLowerCase();

  // REITs typically have "reit" in name or are in 41xx range
  if (nameLower.includes("reit") || nameLower.includes("ريت")) return "reit";

  // Nomu parallel market - typically smaller companies
  // Nomu tickers are often in specific ranges or have smaller market caps
  // Saudi Exchange marks Nomu companies differently
  // We'll use a heuristic: if market cap < 1B SAR and in certain ranges
  if (marketCap && marketCap < 300_000_000) return "nomu"; // Very small cap likely Nomu

  return "main";
}

async function discoverBatch(tickers: string[]): Promise<DiscoveredCompany[]> {
  const found: DiscoveredCompany[] = [];

  for (const symbol of tickers) {
    try {
      await sleep(DELAY_MS);
      const q = await yf.quote(symbol + ".SR");
      if (q && q.regularMarketPrice && q.regularMarketPrice > 0) {
        const company: DiscoveredCompany = {
          symbol,
          name: q.shortName || q.longName || `Company ${symbol}`,
          price: q.regularMarketPrice,
          marketCap: q.marketCap ?? null,
          sector: (q as Record<string, unknown>).sector as string || "",
          industry: (q as Record<string, unknown>).industry as string || "",
          exchange: q.exchange || "",
          quoteType: q.quoteType || "",
          market: classifyMarket(symbol, q.shortName || "", q.quoteType || "", q.marketCap ?? null),
        };
        found.push(company);
        process.stdout.write(`  ✓ ${symbol} - ${company.name} (${company.market}) ${company.price} SAR\n`);
      }
    } catch {
      // Ticker doesn't exist, skip silently
    }
  }

  return found;
}

async function main() {
  console.log("=== Discovering ALL Tadawul-Listed Companies ===");
  console.log("Scanning ticker range 1000-9999 on Yahoo Finance...\n");

  const logResult = db.insert(syncLog).values({
    syncType: "companies",
    startedAt: new Date().toISOString(),
    status: "running",
  }).returning().all();
  const log = logResult[0];

  const allTickers = generateAllTickers();
  const allFound: DiscoveredCompany[] = [];
  let scanned = 0;

  // Process in batches
  for (let i = 0; i < allTickers.length; i += BATCH_SIZE) {
    const batch = allTickers.slice(i, i + BATCH_SIZE);
    const found = await discoverBatch(batch);
    allFound.push(...found);
    scanned += batch.length;

    if (scanned % 200 === 0) {
      console.log(`\n--- Progress: ${scanned}/${allTickers.length} scanned, ${allFound.length} found ---\n`);
    }
  }

  console.log(`\n=== Scan Complete ===`);
  console.log(`Total scanned: ${scanned}`);
  console.log(`Total found: ${allFound.length}`);

  // Categorize
  const mainCount = allFound.filter((c) => c.market === "main").length;
  const nomuCount = allFound.filter((c) => c.market === "nomu").length;
  const reitCount = allFound.filter((c) => c.market === "reit").length;
  console.log(`  Main Market: ${mainCount}`);
  console.log(`  Nomu: ${nomuCount}`);
  console.log(`  REITs: ${reitCount}`);

  // Upsert all into database
  console.log(`\nSaving to database...`);
  for (const company of allFound) {
    const existing = db.select().from(companies).where(eq(companies.symbol, company.symbol)).get();

    if (existing) {
      db.update(companies)
        .set({
          nameEn: company.name,
          sectorEn: company.sector || existing.sectorEn,
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
          nameEn: company.name,
          nameAr: null, // Will be enriched later
          sectorEn: company.sector || null,
          sectorAr: null,
          market: company.market,
          isActive: 1,
          updatedAt: new Date().toISOString(),
        })
        .run();
    }
  }

  // Mark companies not found as inactive
  const foundSymbols = new Set(allFound.map((c) => c.symbol));
  const allDB = db.select().from(companies).all();
  for (const c of allDB) {
    if (!foundSymbols.has(c.symbol)) {
      db.update(companies)
        .set({ isActive: 0, updatedAt: new Date().toISOString() })
        .where(eq(companies.symbol, c.symbol))
        .run();
    }
  }

  db.update(syncLog)
    .set({
      completedAt: new Date().toISOString(),
      status: "success",
      recordsAffected: allFound.length,
    })
    .where(eq(syncLog.id, log.id))
    .run();

  console.log(`Done! ${allFound.length} companies saved to database.`);

  // Print summary table
  console.log("\n=== All Companies by Market ===\n");
  for (const market of ["main", "nomu", "reit"]) {
    const group = allFound.filter((c) => c.market === market);
    if (group.length > 0) {
      console.log(`--- ${market.toUpperCase()} (${group.length}) ---`);
      group.sort((a, b) => a.symbol.localeCompare(b.symbol));
      for (const c of group) {
        console.log(`  ${c.symbol}  ${c.name.padEnd(45)} ${c.price.toFixed(2)} SAR`);
      }
      console.log("");
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Discovery failed:", err);
  process.exit(1);
});
