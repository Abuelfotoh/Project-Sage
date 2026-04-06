"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { LocaleSwitcher } from "./locale-switcher";

export function Header({ locale }: { locale: string }) {
  const t = useTranslations();

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo & App Name */}
          <Link
            href={`/${locale}`}
            className="flex items-center gap-2 text-xl font-bold text-emerald-700"
          >
            <span className="text-2xl">📊</span>
            <span>{t("common.appName")}</span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-6">
            <Link
              href={`/${locale}`}
              className="text-sm font-medium text-gray-600 hover:text-emerald-700 transition-colors"
            >
              {t("nav.screener")}
            </Link>
            <Link
              href={`/${locale}/watchlist`}
              className="text-sm font-medium text-gray-600 hover:text-emerald-700 transition-colors"
            >
              {t("nav.watchlist")}
            </Link>
            <LocaleSwitcher currentLocale={locale} />
          </nav>
        </div>
      </div>
    </header>
  );
}
