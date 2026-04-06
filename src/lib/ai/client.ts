import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { aiCache } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

const MODEL = "claude-sonnet-4-20250514";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set in .env.local");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

function hashPrompt(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex").substring(0, 32);
}

interface AnalysisOptions {
  symbol: string;
  analysisType: string;
  prompt: string;
  cacheTTLDays?: number;
}

export async function runAnalysis({
  symbol,
  analysisType,
  prompt,
  cacheTTLDays = 7,
}: AnalysisOptions): Promise<{ text: string; cached: boolean }> {
  const promptHash = hashPrompt(prompt);

  // Check cache
  const cached = db
    .select()
    .from(aiCache)
    .where(
      and(
        eq(aiCache.symbol, symbol),
        eq(aiCache.analysisType, analysisType),
        eq(aiCache.promptHash, promptHash)
      )
    )
    .get();

  if (cached?.resultText && cached.expiresAt) {
    const expires = new Date(cached.expiresAt);
    if (expires > new Date()) {
      return { text: cached.resultText, cached: true };
    }
  }

  // Call Claude API
  const anthropic = getClient();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
    system:
      "You are a value investing analyst specializing in the Saudi Exchange (Tadawul). " +
      "You follow the principles of Benjamin Graham, Warren Buffett, and Charlie Munger. " +
      "IMPORTANT: Never provide investment advice. Always include a disclaimer that your analysis is for educational and research purposes only. " +
      "Never fabricate financial data. If you don't have enough information, clearly state what's missing. " +
      "Respond in the same language as the user's prompt.",
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Cache the result
  const now = new Date();
  const expiresAt = new Date(now.getTime() + cacheTTLDays * 24 * 60 * 60 * 1000);

  db.insert(aiCache)
    .values({
      symbol,
      analysisType,
      promptHash,
      resultText: text,
      modelUsed: MODEL,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    })
    .onConflictDoUpdate({
      target: [aiCache.symbol, aiCache.analysisType, aiCache.promptHash],
      set: {
        resultText: text,
        modelUsed: MODEL,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
    })
    .run();

  return { text, cached: false };
}
