/**
 * Seed the database with Tadawul company data.
 * Run with: npx tsx scripts/seed-companies.ts
 */
import { syncCompanies } from "../src/lib/pipeline/company-sync";

async function main() {
  console.log("=== Seeding Tadawul Companies ===");
  const count = await syncCompanies();
  console.log(`Done! ${count} companies seeded.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
