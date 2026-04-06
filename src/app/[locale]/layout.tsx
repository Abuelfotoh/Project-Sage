import type { Metadata } from "next";
import { NextIntlClientProvider, useMessages } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/layout/header";
import { DisclaimerBanner } from "@/components/layout/disclaimer-banner";

export const metadata: Metadata = {
  title: "Project Sage - Tadawul Value Investing Intelligence",
  description:
    "Personal value investing dashboard for the Saudi Exchange (Tadawul)",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "en" | "ar")) {
    notFound();
  }

  const messages = await getMessages();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} className="h-full">
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <NextIntlClientProvider messages={messages}>
          <Header locale={locale} />
          <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
            {children}
          </main>
          <DisclaimerBanner />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
