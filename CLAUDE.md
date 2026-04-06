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
npm run db:seed          # Seed company list (Argaam scraper with fallback list)
npm run db:discover      # Full Tadawul scan: discovers ALL tickers (1000-9999) via Yahoo Finance
npm run db:backfill      # Backfill 5 years of price data (slow, rate-limited)
npm run db:financials    # Sync income/balance/cashflow from Yahoo Finance
npm run setup            # db:migrate + db:seed

# Ad-hoc scripts (via tsx)
npx tsx scripts/run-screen.ts                 # Run screening engine, print ranked results
npx tsx scripts/test-screen.ts 2222           # Screen a single stock with detailed output
npx tsx scripts/backfill-prices.ts 2222 1180  # Backfill specific symbols only
npx tsx scripts/sync-financials.ts 2222       # Sync financials for specific symbols
npx tsx scripts/discover-all-tickers.ts       # Scan Yahoo Finance for all .SR tickers
```

## Architecture

**Stack:** Next.js 16 (App Router) + SQLite (better-sqlite3) + Drizzle ORM + Tailwind + next-intl (EN/AR bilingual)

### Data Flow

```
Yahoo Finance (prices, financials) / Saudi Exchange discovery (all tickers)
        ↓
  Pipeline (src/lib/pipeline/)     ← node-cron scheduler in instrumentation.ts
        ↓
  SQLite database (sage.db)        ← 9 tables defined in src/db/schema.ts
        ↓
  Screening Engine (src/lib/screening/)
        ↓
  Screen results cached in DB      ← auto re-screened after every data sync
        ↓
  Server Components query DB directly (synchronous better-sqlite3)
        ↓
  Client Components for interactive parts (charts, filters, watchlist actions)
```

### Market Coverage

Covers all Tadawul segments: **Main Market**, **Nomu** (parallel market), and **REITs**. Company discovery scans Yahoo Finance ticker range 1000-9999 with `.SR` suffix. Market classification uses name heuristics (REIT keyword) and market cap thresholds.

- `src/lib/data-sources/saudi-exchange.ts` — programmatic discovery (full and quick scan)
- `scripts/discover-all-tickers.ts` — CLI for full scan (~25-30 min)
- `src/lib/data-sources/argaam.ts` — Argaam scraper (fallback: hardcoded 54 majors)

### Screening Engine

Three independent screens combined into a **Sage Score** (0-100):
- **Graham** (30% weight) — `src/lib/screening/graham.ts` — 8 pass/fail criteria (P/E, P/B, current ratio, earnings stability, dividends, growth, debt/equity, NCAV)
- **Buffett** (40% weight) — `src/lib/screening/buffett.ts` — 8 criteria scored 0-10 each (ROE, owner earnings, margins, capex ratio, predictability, debt payoff, management quality)
- **DCF** (30% weight) — `src/lib/screening/dcf.ts` — Two-stage model (5yr growth + 5yr fade + terminal value), 10% discount rate, 3% terminal growth

Signal mapping: ≥80 strong_buy, ≥65 buy, ≥45 watch, ≥25 hold, <25 avoid.

`screenAllCompanies()` in `sage-score.ts` runs all three and stores results in the `screen_results` table.

### Auto-Refresh & Scheduler

The scheduler (`src/lib/pipeline/scheduler.ts`) initializes via `src/instrumentation.ts` on server start. After every price or financial sync, it automatically re-runs the screening engine.

- **Prices**: Daily at 4:30 PM AST (Sun-Thu, after Tadawul market close)
- **Financials**: Twice weekly (Sun + Wed at 8 PM AST) to catch new filings
- **Companies**: Monthly on the 1st at 9:00 AM AST

The UI also supports manual sync via the "Sync Data" dropdown on the screener page, and a live sync status dashboard at `/[locale]/sync`.

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

Key tables: `companies` (PK: symbol, has `market` field for main/nomu/reit), `prices` (unique: symbol+date), `incomeStatements`, `balanceSheets`, `cashFlows` (all with unique: symbol+periodEnd+periodType), `screenResults` (unique: symbol+screenType), `watchlist`, `aiCache`, `syncLog`.

After changing schema: run `npx drizzle-kit generate` then `npm run db:migrate`.

### Key Patterns

- **better-sqlite3 is synchronous** — DB queries in Server Components run synchronously, no `await` needed. Functions returning DB data should NOT be marked `async`.
- **`params` is a Promise in Next.js 16** — Always `const { locale } = await params` in page/layout components.
- **Drizzle `.returning()`** — Use `.returning().all()` then index into the array; destructuring directly doesn't work.
- **Yahoo Finance v3** — Must instantiate: `const yahooFinance = new YahooFinance()`. The `quoteSummary` submodules return sparse data since Nov 2024; `fundamentalsTimeSeries` is the preferred alternative.
- **Auto re-screen** — After any data sync (prices or financials), always call `screenAllCompanies()` so scores stay current.
- **`serverExternalPackages`** — `better-sqlite3` is listed in `next.config.ts` to prevent bundling into client.
