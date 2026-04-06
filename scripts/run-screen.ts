/**
 * Run the full screening engine on all companies with data.
 * Run with: npx tsx scripts/run-screen.ts
 */
import { screenAllCompanies } from "../src/lib/screening/sage-score";

console.log("=== Running Sage Screening Engine ===\n");

const results = screenAllCompanies();

console.log(`\nScreened ${results.length} companies.\n`);
console.log("Top scores:");
console.log("─".repeat(80));
console.log(
  "Symbol".padEnd(10) +
  "Score".padEnd(8) +
  "Graham".padEnd(10) +
  "Buffett".padEnd(10) +
  "DCF".padEnd(8) +
  "Signal"
);
console.log("─".repeat(80));

for (const r of results.slice(0, 20)) {
  console.log(
    r.symbol.padEnd(10) +
    String(r.composite).padEnd(8) +
    String(r.grahamScore).padEnd(10) +
    String(r.buffettScore).padEnd(10) +
    String(r.dcfScore).padEnd(8) +
    r.signal.toUpperCase()
  );
}

process.exit(0);
