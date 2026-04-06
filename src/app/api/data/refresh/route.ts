import { NextResponse } from "next/server";
import { syncCompanies } from "@/lib/pipeline/company-sync";
import { syncPrices } from "@/lib/pipeline/price-sync";
import { syncFinancials } from "@/lib/pipeline/financial-sync";
import { screenAllCompanies } from "@/lib/screening/sage-score";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const type = (body as { type?: string }).type ?? "all";

  try {
    const results: Record<string, number> = {};

    if (type === "companies" || type === "all") {
      results.companies = await syncCompanies();
    }

    if (type === "prices" || type === "all") {
      results.prices = await syncPrices();
    }

    if (type === "financials" || type === "all") {
      results.financials = await syncFinancials();
    }

    // Always re-run screening after any data sync
    if (type === "screen" || type === "all" || type === "prices" || type === "financials") {
      const screenResults = screenAllCompanies();
      results.screened = screenResults.length;
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Refresh failed" },
      { status: 500 }
    );
  }
}
