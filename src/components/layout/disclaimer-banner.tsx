"use client";

import { useTranslations } from "next-intl";

export function DisclaimerBanner() {
  const t = useTranslations();

  return (
    <footer className="bg-amber-50 border-t border-amber-200 py-3 px-4">
      <p className="text-center text-xs text-amber-800 max-w-4xl mx-auto">
        {t("disclaimer")}
      </p>
    </footer>
  );
}
