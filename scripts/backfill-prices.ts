/**
 * Backfill historical price data for all companies.
 * Run with: npx tsx scripts/backfill-prices.ts
 *
 * Optional: pass ticker symbols as arguments to backfill specific companies.
 * Example: npx tsx scripts/backfill-prices.ts 2222 1180 2010
 */
import { syncPrices } from "../src/lib/pipeline/price-sync";

async function main() {
  const symbols = process.argv.slice(2);

  if (symbols.length > 0) {
    console.log(`=== Backfilling prices for: ${symbols.join(", ")} ===`);
    await syncPrices(symbols);
  } else {
    console.log("=== Backfilling prices for ALL companies ===");
    console.log("This may take a while due to rate limiting...");
    await syncPrices();
  }

  console.log("Done!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
