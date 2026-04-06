/**
 * SAR currency formatting utilities.
 */

export function formatSAR(amount: number, locale: string = "en"): string {
  if (locale === "ar") {
    return new Intl.NumberFormat("ar-SA", {
      style: "currency",
      currency: "SAR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(value: number, locale: string = "en"): string {
  const l = locale === "ar" ? "ar-SA" : "en-SA";
  return new Intl.NumberFormat(l, {
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number, locale: string = "en"): string {
  const l = locale === "ar" ? "ar-SA" : "en-SA";
  return new Intl.NumberFormat(l, {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

export function formatLargeNumber(value: number, locale: string = "en"): string {
  const abs = Math.abs(value);
  if (abs >= 1e9) {
    return `${formatNumber(value / 1e9, locale)}${locale === "ar" ? " مليار" : "B"}`;
  }
  if (abs >= 1e6) {
    return `${formatNumber(value / 1e6, locale)}${locale === "ar" ? " مليون" : "M"}`;
  }
  if (abs >= 1e3) {
    return `${formatNumber(value / 1e3, locale)}${locale === "ar" ? " ألف" : "K"}`;
  }
  return formatNumber(value, locale);
}
