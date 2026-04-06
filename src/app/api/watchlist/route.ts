import { NextResponse } from "next/server";
import { db } from "@/db";
import { watchlist, companies, prices, screenResults } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
  const items = db.select().from(watchlist).all();

  const enriched = items.map((item) => {
    const company = db
      .select()
      .from(companies)
      .where(eq(companies.symbol, item.symbol))
      .get();

    const latestPrice = db
      .select()
      .from(prices)
      .where(eq(prices.symbol, item.symbol))
      .orderBy(desc(prices.date))
      .limit(1)
      .get();

    const composite = db
      .select()
      .from(screenResults)
      .where(
        and(
          eq(screenResults.symbol, item.symbol),
          eq(screenResults.screenType, "composite")
        )
      )
      .get();

    return {
      ...item,
      nameEn: company?.nameEn,
      nameAr: company?.nameAr,
      sectorEn: company?.sectorEn,
      currentPrice: latestPrice?.close ?? null,
      sageScore: composite?.score ?? null,
    };
  });

  return NextResponse.json(enriched);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { symbol, targetPrice, notes } = body as {
    symbol: string;
    targetPrice?: number;
    notes?: string;
  };

  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
  }

  // Check if already in watchlist
  const existing = db
    .select()
    .from(watchlist)
    .where(eq(watchlist.symbol, symbol))
    .get();

  if (existing) {
    return NextResponse.json({ error: "Already in watchlist" }, { status: 409 });
  }

  const result = db
    .insert(watchlist)
    .values({
      symbol,
      addedAt: new Date().toISOString(),
      targetPrice: targetPrice ?? null,
      notes: notes ?? null,
      alertEnabled: targetPrice ? 1 : 0,
    })
    .returning()
    .all();

  return NextResponse.json(result[0], { status: 201 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
  }

  db.delete(watchlist).where(eq(watchlist.symbol, symbol)).run();
  return NextResponse.json({ success: true });
}
