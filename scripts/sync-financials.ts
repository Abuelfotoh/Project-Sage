/**
 * Sync financial data for all companies.
 * Run with: npx tsx scripts/sync-financials.ts
 *
 * Optional: pass ticker symbols as arguments.
 * Example: npx tsx scripts/sync-financials.ts 2222 1180
 */
import { syncFinancials } from "../src/lib/pipeline/financial-sync";

async function main() {
  const symbols = process.argv.slice(2);

  if (symbols.length > 0) {
    console.log(`=== Syncing financials for: ${symbols.join(", ")} ===`);
    await syncFinancials(symbols);
  } else {
    console.log("=== Syncing financials for ALL companies ===");
    console.log("This may take a while due to rate limiting...");
    await syncFinancials();
  }

  console.log("Done!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});
