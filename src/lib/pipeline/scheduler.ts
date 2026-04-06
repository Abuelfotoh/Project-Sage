import cron from "node-cron";
import { syncPrices } from "./price-sync";
import { syncFinancials } from "./financial-sync";
import { syncCompanies } from "./company-sync";
import { screenAllCompanies } from "../screening/sage-score";

let initialized = false;

/**
 * Initialize all scheduled jobs.
 * Tadawul market closes at 3:00 PM AST (UTC+3).
 *
 * Schedule:
 * - Prices: Daily at 4:30 PM AST (after market close) Sun-Thu
 * - Financials: Twice weekly (Sun + Wed at 8 PM AST) to catch new filings
 * - Re-screen: After each data sync completes
 * - Company discovery: Monthly on the 1st
 */
export function initScheduler() {
  if (initialized) return;
  initialized = true;

  console.log("[Sage] Initializing data scheduler...");

  // Daily price sync at 4:30 PM AST (13:30 UTC) on Sun-Thu
  // After prices sync, re-run screening
  cron.schedule(
    "30 13 * * 0-4",
    async () => {
      console.log("[Scheduler] Starting daily price sync...");
      try {
        const count = await syncPrices();
        console.log(`[Scheduler] Price sync complete: ${count} records`);
        // Re-screen with fresh price data
        console.log("[Scheduler] Re-running screening engine...");
        const results = screenAllCompanies();
        console.log(`[Scheduler] Screening complete: ${results.length} companies scored`);
      } catch (error) {
        console.error("[Scheduler] Price sync failed:", error);
      }
    },
    { timezone: "UTC" }
  );

  // Financial sync twice weekly: Sunday + Wednesday at 8:00 PM AST (17:00 UTC)
  // This catches quarterly reports, annual reports, and interim announcements
  cron.schedule(
    "0 17 * * 0,3",
    async () => {
      console.log("[Scheduler] Starting financial sync...");
      try {
        const count = await syncFinancials();
        console.log(`[Scheduler] Financial sync complete: ${count} records`);
        // Re-screen with fresh financial data
        console.log("[Scheduler] Re-running screening engine...");
        const results = screenAllCompanies();
        console.log(`[Scheduler] Screening complete: ${results.length} companies scored`);
      } catch (error) {
        console.error("[Scheduler] Financial sync failed:", error);
      }
    },
    { timezone: "UTC" }
  );

  // Monthly company discovery on the 1st at 9:00 AM AST (06:00 UTC)
  // Picks up new IPOs, delistings, market segment changes
  cron.schedule(
    "0 6 1 * *",
    async () => {
      console.log("[Scheduler] Starting monthly company sync...");
      try {
        await syncCompanies();
      } catch (error) {
        console.error("[Scheduler] Company sync failed:", error);
      }
    },
    { timezone: "UTC" }
  );

  console.log("[Sage] Scheduler active:");
  console.log("  Prices:     Daily 4:30 PM AST (Sun-Thu) + auto re-screen");
  console.log("  Financials: Sun + Wed 8:00 PM AST + auto re-screen");
  console.log("  Companies:  Monthly 1st at 9:00 AM AST");
}
