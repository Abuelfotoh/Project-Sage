/**
 * Saudi Exchange (Tadawul) trading calendar.
 * Trading days: Sunday through Thursday.
 * Closed: Friday, Saturday, and Saudi holidays.
 */

// Saudi public holidays (approximate - dates shift with Hijri calendar)
// These are approximate Gregorian dates and should be updated annually
const SAUDI_HOLIDAYS_2024 = [
  "2024-02-22", // Founding Day
  "2024-04-09", "2024-04-10", "2024-04-11", "2024-04-12", // Eid Al-Fitr (approx)
  "2024-06-15", "2024-06-16", "2024-06-17", "2024-06-18", "2024-06-19", // Eid Al-Adha (approx)
  "2024-09-22", "2024-09-23", // National Day
];

const SAUDI_HOLIDAYS_2025 = [
  "2025-02-22", // Founding Day
  "2025-03-29", "2025-03-30", "2025-03-31", "2025-04-01", // Eid Al-Fitr (approx)
  "2025-06-05", "2025-06-06", "2025-06-07", "2025-06-08", "2025-06-09", // Eid Al-Adha (approx)
  "2025-09-22", "2025-09-23", // National Day
];

const SAUDI_HOLIDAYS_2026 = [
  "2026-02-22", // Founding Day
  "2026-03-19", "2026-03-20", "2026-03-21", "2026-03-22", // Eid Al-Fitr (approx)
  "2026-05-26", "2026-05-27", "2026-05-28", "2026-05-29", "2026-05-30", // Eid Al-Adha (approx)
  "2026-09-22", "2026-09-23", // National Day
];

const ALL_HOLIDAYS = new Set([
  ...SAUDI_HOLIDAYS_2024,
  ...SAUDI_HOLIDAYS_2025,
  ...SAUDI_HOLIDAYS_2026,
]);

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

/**
 * Check if a given date is a Tadawul trading day.
 * Trading days are Sunday (0) through Thursday (4).
 */
export function isTradingDay(date: Date): boolean {
  const day = date.getDay();
  // Friday = 5, Saturday = 6 are weekends
  if (day === 5 || day === 6) return false;
  // Check Saudi holidays
  if (ALL_HOLIDAYS.has(formatDate(date))) return false;
  return true;
}

/** Get the next trading day after a given date. */
export function nextTradingDay(date: Date): Date {
  const next = new Date(date);
  do {
    next.setDate(next.getDate() + 1);
  } while (!isTradingDay(next));
  return next;
}

/** Get the previous trading day before a given date. */
export function previousTradingDay(date: Date): Date {
  const prev = new Date(date);
  do {
    prev.setDate(prev.getDate() - 1);
  } while (!isTradingDay(prev));
  return prev;
}

/** Get all trading days between two dates (inclusive). */
export function tradingDaysBetween(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(start);
  while (current <= end) {
    if (isTradingDay(current)) {
      days.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  return days;
}

/** Tadawul market hours: 10:00 AM - 3:00 PM AST (UTC+3). */
export const MARKET_OPEN_HOUR = 10;
export const MARKET_CLOSE_HOUR = 15;
export const TIMEZONE = "Asia/Riyadh";
