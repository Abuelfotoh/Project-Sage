import cron from "node-cron";
import { syncPrices } from "./price-sync";
import { syncFinancials } from "./financial-sync";
import { syncCompanies } from "./company-sync";

let initialized = false;

/**
 * Initialize all scheduled jobs.
 * Tadawul market closes at 3:00 PM AST (UTC+3).
 * We schedule price sync at 4:30 PM AST = 1:30 PM UTC.
 */
export function initScheduler() {
  if (initialized) return;
  initialized = true;

  console.log("Initializing Sage data scheduler...");

  // Daily price sync at 4:30 PM AST (13:30 UTC) on Sun-Thu
  cron.schedule(
    "30 13 * * 0-4",
    async () => {
      console.log("[Scheduler] Starting daily price sync...");
      try {
        await syncPrices();
      } catch (error) {
        console.error("[Scheduler] Price sync failed:", error);
      }
    },
    { timezone: "UTC" }
  );

  // Weekly financial sync on Thursday at 6:00 PM AST (15:00 UTC)
  cron.schedule(
    "0 15 * * 4",
    async () => {
      console.log("[Scheduler] Starting weekly financial sync...");
      try {
        await syncFinancials();
      } catch (error) {
        console.error("[Scheduler] Financial sync failed:", error);
      }
    },
    { timezone: "UTC" }
  );

  // Monthly company list sync on the 1st at 9:00 AM AST (06:00 UTC)
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

  console.log("Scheduler initialized with jobs:");
  console.log("  - Price sync: Daily at 4:30 PM AST (Sun-Thu)");
  console.log("  - Financial sync: Weekly on Thursday at 6:00 PM AST");
  console.log("  - Company sync: Monthly on 1st at 9:00 AM AST");
}
