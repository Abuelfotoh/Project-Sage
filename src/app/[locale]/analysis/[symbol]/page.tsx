import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { AnalysisPanel } from "@/components/ai/analysis-panel";
import Link from "next/link";

export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ locale: string; symbol: string }>;
}) {
  const { locale, symbol } = await params;
  const t = await getTranslations();

  const company = db
    .select()
    .from(companies)
    .where(eq(companies.symbol, symbol))
    .get();

  if (!company) notFound();

  const isAr = locale === "ar";
  const name = isAr ? (company.nameAr || company.nameEn) : company.nameEn;

  return (
    <div>
      <Link
        href={`/${locale}/stock/${symbol}`}
        className="text-sm text-emerald-600 hover:text-emerald-800 mb-4 inline-block"
      >
        &larr; {t("common.back")}
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        {t("ai.generateMemo")} - {name} ({symbol})
      </h1>
      <p className="text-sm text-amber-600 mb-6">{t("ai.costWarning")}</p>

      <AnalysisPanel symbol={symbol} locale={locale} />
    </div>
  );
}
