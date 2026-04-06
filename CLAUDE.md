# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build (uses Turbopack)
npm run lint             # ESLint
npm run test             # Vitest (no tests written yet)

# Database
npm run db:migrate       # Run Drizzle migrations after schema changes
npm run db:seed          # Seed company list from Argaam (fallback: hardcoded 54 stocks)
npm run db:backfill      # Backfill 5 years of price data (slow, rate-limited)
npm run db:financials    # Sync income/balance/cashflow from Yahoo Finance
npm run setup            # db:migrate + db:seed

# Ad-hoc scripts (via tsx)
npx tsx scripts/run-screen.ts          # Run screening engine, print ranked results
npx tsx scripts/test-screen.ts 2222    # Screen a single stock with detailed output
npx tsx scripts/backfill-prices.ts 2222 1180  # Backfill specific symbols only
npx tsx scripts/sync-financials.ts 2222       # Sync financials for specific symbols
```

## Architecture

**Stack:** Next.js 16 (App Router) + SQLite (better-sqlite3) + Drizzle ORM + Tailwind + next-intl (EN/AR bilingual)

### Data Flow

```
Yahoo Finance / Argaam scraper
        ↓
  Pipeline (src/lib/pipeline/)     ← node-cron scheduler runs in instrumentation.ts
        ↓
  SQLite database (sage.db)        ← 9 tables defined in src/db/schema.ts
        ↓
  Screening Engine (src/lib/screening/)
        ↓
  Screen results cached in DB (screen_results table)
        ↓
  Server Components query DB directly (synchronous better-sqlite3)
        ↓
  Client Components for interactive parts (charts, filters, watchlist actions)
```

### Screening Engine

Three independent screens combined into a **Sage Score** (0-100):
- **Graham** (30% weight) — `src/lib/screening/graham.ts` — 8 pass/fail criteria (P/E, P/B, current ratio, earnings stability, dividends, growth, debt/equity, NCAV)
- **Buffett** (40% weight) — `src/lib/screening/buffett.ts` — 8 criteria scored 0-10 each (ROE, owner earnings, margins, capex ratio, predictability, debt payoff, management quality)
- **DCF** (30% weight) — `src/lib/screening/dcf.ts` — Two-stage model (5yr growth + 5yr fade + terminal value), 10% discount rate, 3% terminal growth

Signal mapping: ≥80 strong_buy, ≥65 buy, ≥45 watch, ≥25 hold, <25 avoid.

`screenAllCompanies()` in `sage-score.ts` runs all three and stores results in the `screen_results` table.

### i18n / Bilingual

- Locale routing via `src/app/[locale]/` dynamic segment
- `src/middleware.ts` handles locale detection (next-intl middleware)
- Messages in `messages/en.json` and `messages/ar.json`
- Root layout sets `dir="rtl"` for Arabic; use CSS logical properties (`ms-`, `me-`, `ps-`, `pe-`)
- Server Components: `getTranslations()` from `next-intl/server`
- Client Components: `useTranslations()` from `next-intl`
- Every user-visible string must exist in both message files

### AI Analysis (Claude API)

- `src/lib/ai/client.ts` — wrapper with SHA256-based cache in `ai_cache` table (7-30 day TTL)
- `src/lib/ai/prompts.ts` — three prompt builders: memo, statement analysis, Buffett lens
- Uses `claude-sonnet-4-20250514`; requires `ANTHROPIC_API_KEY` in `.env.local`
- API route: `POST /api/ai/memo` with `{ symbol, type, locale }`

### Database

SQLite file at `sage.db` (gitignored). WAL mode enabled. Schema in `src/db/schema.ts`.

Key tables: `companies` (PK: symbol), `prices` (unique: symbol+date), `incomeStatements`, `balanceSheets`, `cashFlows` (all with unique: symbol+periodEnd+periodType), `screenResults` (unique: symbol+screenType), `watchlist`, `aiCache`, `syncLog`.

After changing schema: run `npx drizzle-kit generate` then `npm run db:migrate`.

### Key Patterns

- **better-sqlite3 is synchronous** — DB queries in Server Components run synchronously, no `await` needed. Functions returning DB data should NOT be marked `async`.
- **`params` is a Promise in Next.js 16** — Always `const { locale } = await params` in page/layout components.
- **Drizzle `.returning()`** — Use `.returning().all()` then index into the array; destructuring directly doesn't work.
- **Yahoo Finance v3** — Must instantiate: `const yahooFinance = new YahooFinance()`. The `quoteSummary` submodules return sparse data since Nov 2024; `fundamentalsTimeSeries` is the preferred alternative.
- **Scheduler** — Initialized once via `src/instrumentation.ts` on server start. Runs price sync daily at 4:30 PM AST (Sun-Thu), financials weekly, companies monthly.
- **`serverExternalPackages`** — `better-sqlite3` is listed in `next.config.ts` to prevent bundling into client.
