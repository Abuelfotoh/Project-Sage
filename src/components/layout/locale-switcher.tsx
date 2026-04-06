"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

export function LocaleSwitcher({ currentLocale }: { currentLocale: string }) {
  const pathname = usePathname();

  const targetLocale = currentLocale === "en" ? "ar" : "en";
  const targetLabel = currentLocale === "en" ? "العربية" : "English";

  // Replace the locale in the current path
  const newPath = pathname.replace(`/${currentLocale}`, `/${targetLocale}`);

  return (
    <Link
      href={newPath}
      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
    >
      <span className="text-base">{currentLocale === "en" ? "🇸🇦" : "🇬🇧"}</span>
      <span>{targetLabel}</span>
    </Link>
  );
}
