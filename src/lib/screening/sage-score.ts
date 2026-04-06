/**
 * Composite Sage Score
 * Combines Graham, Buffett, and DCF screens into a weighted 0-100 score.
 */

import { db } from "@/db";
import { companies, screenResults } from "@/db/schema";
import { eq } from "drizzle-orm";
import { runGrahamScreen } from "./graham";
import { runBuffettScreen } from "./buffett";
import { runDCF } from "./dcf";
import type { SageScore } from "./types";

const DEFAULT_WEIGHTS = {
  graham: 0.30,
  buffett: 0.40,
  dcf: 0.30,
};

function getSignal(score: number): SageScore["signal"] {
  if (score >= 80) return "strong_buy";
  if (score >= 65) return "buy";
  if (score >= 45) return "watch";
  if (score >= 25) return "hold";
  return "avoid";
}

export function computeSageScore(
  symbol: string,
  weights = DEFAULT_WEIGHTS
): SageScore | null {
  const graham = runGrahamScreen(symbol);
  const buffett = runBuffettScreen(symbol);
  const dcf = runDCF(symbol);

  const grahamScore = graham?.score ?? 0;
  const buffettScore = buffett?.normalizedScore ?? 0;
  const dcfScore = dcf?.score ?? 0;

  // If we have no data at all, return null
  if (!graham && !buffett && !dcf) return null;

  const composite = Math.round(
    grahamScore * weights.graham +
    buffettScore * weights.buffett +
    dcfScore * weights.dcf
  );

  return {
    symbol,
    composite,
    grahamScore,
    buffettScore,
    dcfScore,
    signal: getSignal(composite),
    weights,
  };
}

/**
 * Run screening for all active companies and store results.
 */
export function screenAllCompanies(
  weights = DEFAULT_WEIGHTS
): SageScore[] {
  const activeCompanies = db
    .select()
    .from(companies)
    .where(eq(companies.isActive, 1))
    .all();

  const results: SageScore[] = [];
  const now = new Date().toISOString();

  for (const company of activeCompanies) {
    try {
      const graham = runGrahamScreen(company.symbol);
      const buffett = runBuffettScreen(company.symbol);
      const dcf = runDCF(company.symbol);

      // Store individual screen results
      if (graham) {
        db.insert(screenResults)
          .values({
            symbol: company.symbol,
            screenType: "graham",
            score: graham.score,
            detailsJson: JSON.stringify(graham),
            computedAt: now,
          })
          .onConflictDoUpdate({
            target: [screenResults.symbol, screenResults.screenType],
            set: {
              score: graham.score,
              detailsJson: JSON.stringify(graham),
              computedAt: now,
            },
          })
          .run();
      }

      if (buffett) {
        db.insert(screenResults)
          .values({
            symbol: company.symbol,
            screenType: "buffett",
            score: buffett.normalizedScore,
            detailsJson: JSON.stringify(buffett),
            computedAt: now,
          })
          .onConflictDoUpdate({
            target: [screenResults.symbol, screenResults.screenType],
            set: {
              score: buffett.normalizedScore,
              detailsJson: JSON.stringify(buffett),
              computedAt: now,
            },
          })
          .run();
      }

      if (dcf) {
        db.insert(screenResults)
          .values({
            symbol: company.symbol,
            screenType: "dcf",
            score: dcf.score,
            detailsJson: JSON.stringify(dcf),
            computedAt: now,
          })
          .onConflictDoUpdate({
            target: [screenResults.symbol, screenResults.screenType],
            set: {
              score: dcf.score,
              detailsJson: JSON.stringify(dcf),
              computedAt: now,
            },
          })
          .run();
      }

      // Compute and store composite
      const sage = computeSageScore(company.symbol, weights);
      if (sage) {
        db.insert(screenResults)
          .values({
            symbol: company.symbol,
            screenType: "composite",
            score: sage.composite,
            detailsJson: JSON.stringify(sage),
            computedAt: now,
          })
          .onConflictDoUpdate({
            target: [screenResults.symbol, screenResults.screenType],
            set: {
              score: sage.composite,
              detailsJson: JSON.stringify(sage),
              computedAt: now,
            },
          })
          .run();
        results.push(sage);
      }
    } catch (error) {
      console.error(`Error screening ${company.symbol}:`, error);
    }
  }

  // Sort by composite score descending
  results.sort((a, b) => b.composite - a.composite);
  return results;
}
