/**
 * Discover all Tadawul-listed companies via Yahoo Finance.
 * Scans ticker range 1000-9999 with .SR suffix.
 * Covers Main Market, Nomu, REITs, and all segments.
 */

import YahooFinance from "yahoo-finance2";
import type { CompanyData } from "./types";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey", "ripHistorical"] });
const DELAY_MS = 150;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function classifyMarket(name: string, marketCap: number | null): string {
  const nameLower = (name || "").toLowerCase();
  if (nameLower.includes("reit") || nameLower.includes("ريت")) return "reit";
  if (marketCap && marketCap < 300_000_000) return "nomu";
  return "main";
}

/**
 * Scan a range of Tadawul tickers and return discovered companies.
 * @param onProgress - callback with (scanned, found) counts
 */
export async function discoverAllTadawulCompanies(
  onProgress?: (scanned: number, found: number) => void
): Promise<CompanyData[]> {
  const companies: CompanyData[] = [];
  let scanned = 0;

  for (let i = 1000; i <= 9999; i++) {
    const symbol = String(i);
    try {
      await sleep(DELAY_MS);
      const q = await yf.quote(symbol + ".SR");
      if (q && q.regularMarketPrice && q.regularMarketPrice > 0) {
        const name = q.shortName || q.longName || `Company ${symbol}`;
        companies.push({
          symbol,
          nameEn: name,
          nameAr: undefined,
          sectorEn: (q as Record<string, unknown>).sector as string || undefined,
          sectorAr: undefined,
          market: classifyMarket(name, q.marketCap ?? null) as "main" | "nomu",
        });
      }
    } catch {
      // Ticker doesn't exist
    }
    scanned++;
    if (onProgress && scanned % 100 === 0) {
      onProgress(scanned, companies.length);
    }
  }

  return companies;
}

/**
 * Quick scan: only check known Tadawul ticker ranges to save time.
 * Covers ~3000 tickers instead of 9000, finishing in ~8 minutes.
 */
export async function discoverTadawulCompaniesQuick(
  onProgress?: (scanned: number, found: number) => void
): Promise<CompanyData[]> {
  // Known active ranges on Tadawul
  const ranges: [number, number][] = [
    [1010, 1250],  // Banks, finance
    [1301, 1330],  // Misc finance
    [2001, 2400],  // Materials, industrials, energy
    [2050, 2100],  // Food, consumer
    [2150, 2400],  // Industrials, utilities
    [3001, 3100],  // Cement
    [4001, 4350],  // Retail, services, real estate
    [4700, 4750],  // Services
    [5110, 5120],  // Telecom
    [6001, 6100],  // Nomu range 1
    [6060, 6090],  // Additional Nomu
    [7010, 7210],  // Nomu range 2
    [7200, 7210],  // Additional
    [8010, 8315],  // Insurance
    [9XXX, 9600],  // Misc / newer listings
  ];

  // Simpler approach: scan dense ranges + sparse rest
  const tickersToCheck = new Set<number>();

  // Dense ranges where companies cluster
  for (let i = 1010; i <= 1330; i++) tickersToCheck.add(i);
  for (let i = 2001; i <= 2400; i++) tickersToCheck.add(i);
  for (let i = 3001; i <= 3100; i++) tickersToCheck.add(i);
  for (let i = 4001; i <= 4350; i++) tickersToCheck.add(i);
  for (let i = 4700; i <= 4780; i++) tickersToCheck.add(i);
  for (let i = 5110; i <= 5120; i++) tickersToCheck.add(i);
  for (let i = 6001; i <= 6100; i++) tickersToCheck.add(i);
  for (let i = 7010; i <= 7210; i++) tickersToCheck.add(i);
  for (let i = 8010; i <= 8315; i++) tickersToCheck.add(i);
  for (let i = 9500; i <= 9600; i++) tickersToCheck.add(i);

  const companies: CompanyData[] = [];
  let scanned = 0;
  const total = tickersToCheck.size;

  for (const num of tickersToCheck) {
    const symbol = String(num);
    try {
      await sleep(DELAY_MS);
      const q = await yf.quote(symbol + ".SR");
      if (q && q.regularMarketPrice && q.regularMarketPrice > 0) {
        companies.push({
          symbol,
          nameEn: q.shortName || q.longName || `Company ${symbol}`,
          nameAr: undefined,
          sectorEn: (q as Record<string, unknown>).sector as string || undefined,
          sectorAr: undefined,
          market: classifyMarket(
            q.shortName || "",
            q.marketCap ?? null
          ) as "main" | "nomu",
        });
      }
    } catch {
      // Ticker doesn't exist
    }
    scanned++;
    if (onProgress && scanned % 50 === 0) {
      onProgress(scanned, companies.length);
    }
  }

  return companies;
}
