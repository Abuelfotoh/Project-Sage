/**
 * Test screening engine on a specific stock.
 * Run with: npx tsx scripts/test-screen.ts 2222
 */
import { runGrahamScreen } from "../src/lib/screening/graham";
import { runBuffettScreen } from "../src/lib/screening/buffett";
import { runDCF } from "../src/lib/screening/dcf";
import { computeSageScore } from "../src/lib/screening/sage-score";

const symbol = process.argv[2] || "2222";

console.log(`\n=== Screening ${symbol} ===\n`);

const graham = runGrahamScreen(symbol);
if (graham) {
  console.log("--- Graham Screen ---");
  console.log(`Score: ${graham.score}/100 (${graham.passedCount}/${graham.totalCriteria} criteria passed)`);
  for (const c of graham.criteria) {
    console.log(`  ${c.passed ? "✓" : "✗"} ${c.name}: ${c.value ?? "N/A"} (${c.threshold}) - ${c.description}`);
  }
} else {
  console.log("Graham Screen: No data available");
}

console.log("");

const buffett = runBuffettScreen(symbol);
if (buffett) {
  console.log("--- Buffett Screen ---");
  console.log(`Score: ${buffett.normalizedScore}/100 (${buffett.totalScore}/${buffett.maxScore})`);
  for (const c of buffett.criteria) {
    console.log(`  [${c.score}/10] ${c.name}: ${c.value ?? "N/A"} - ${c.description}`);
  }
} else {
  console.log("Buffett Screen: No data available");
}

console.log("");

const dcf = runDCF(symbol);
if (dcf) {
  console.log("--- DCF Model ---");
  console.log(`Intrinsic Value: ${dcf.intrinsicValue ?? "N/A"} SAR`);
  console.log(`Current Price: ${dcf.currentPrice} SAR`);
  console.log(`Margin of Safety: ${dcf.marginOfSafety ?? "N/A"}%`);
  console.log(`Fair Value (25% margin): ${dcf.fairValue ?? "N/A"} SAR`);
  console.log(`Bargain Value (50% margin): ${dcf.bargainValue ?? "N/A"} SAR`);
  console.log(`Growth Rate Used: ${dcf.growthRate}%`);
  console.log(`Score: ${dcf.score}/100`);
} else {
  console.log("DCF: No data available");
}

console.log("");

const sage = computeSageScore(symbol);
if (sage) {
  console.log("--- Sage Composite Score ---");
  console.log(`Composite: ${sage.composite}/100`);
  console.log(`Signal: ${sage.signal.toUpperCase()}`);
  console.log(`  Graham: ${sage.grahamScore} (weight: ${sage.weights.graham * 100}%)`);
  console.log(`  Buffett: ${sage.buffettScore} (weight: ${sage.weights.buffett * 100}%)`);
  console.log(`  DCF: ${sage.dcfScore} (weight: ${sage.weights.dcf * 100}%)`);
} else {
  console.log("Sage Score: No data available");
}
