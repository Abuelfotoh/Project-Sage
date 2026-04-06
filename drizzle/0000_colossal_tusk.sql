CREATE TABLE `ai_cache` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`symbol` text NOT NULL,
	`analysis_type` text NOT NULL,
	`prompt_hash` text NOT NULL,
	`result_text` text,
	`model_used` text,
	`created_at` text NOT NULL,
	`expires_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_cache_hash_idx` ON `ai_cache` (`symbol`,`analysis_type`,`prompt_hash`);--> statement-breakpoint
CREATE TABLE `balance_sheets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`symbol` text NOT NULL,
	`period_end` text NOT NULL,
	`period_type` text NOT NULL,
	`total_assets` real,
	`current_assets` real,
	`total_liabilities` real,
	`current_liabilities` real,
	`total_debt` real,
	`long_term_debt` real,
	`total_equity` real,
	`book_value_per_share` real,
	`cash_and_equivalents` real,
	`net_current_assets` real,
	`raw_json` text,
	FOREIGN KEY (`symbol`) REFERENCES `companies`(`symbol`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `balance_symbol_period_idx` ON `balance_sheets` (`symbol`,`period_end`,`period_type`);--> statement-breakpoint
CREATE TABLE `cash_flows` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`symbol` text NOT NULL,
	`period_end` text NOT NULL,
	`period_type` text NOT NULL,
	`operating_cash_flow` real,
	`capital_expenditure` real,
	`free_cash_flow` real,
	`dividends_paid` real,
	`depreciation` real,
	`raw_json` text,
	FOREIGN KEY (`symbol`) REFERENCES `companies`(`symbol`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cashflow_symbol_period_idx` ON `cash_flows` (`symbol`,`period_end`,`period_type`);--> statement-breakpoint
CREATE TABLE `companies` (
	`symbol` text PRIMARY KEY NOT NULL,
	`yahoo_ticker` text NOT NULL,
	`name_en` text NOT NULL,
	`name_ar` text,
	`sector_en` text,
	`sector_ar` text,
	`market` text DEFAULT 'main',
	`listing_date` text,
	`is_active` integer DEFAULT 1,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `income_statements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`symbol` text NOT NULL,
	`period_end` text NOT NULL,
	`period_type` text NOT NULL,
	`revenue` real,
	`cost_of_revenue` real,
	`gross_profit` real,
	`operating_income` real,
	`net_income` real,
	`ebit` real,
	`ebitda` real,
	`eps` real,
	`shares_outstanding` integer,
	`currency` text DEFAULT 'SAR',
	`raw_json` text,
	FOREIGN KEY (`symbol`) REFERENCES `companies`(`symbol`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `income_symbol_period_idx` ON `income_statements` (`symbol`,`period_end`,`period_type`);--> statement-breakpoint
CREATE TABLE `prices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`symbol` text NOT NULL,
	`date` text NOT NULL,
	`open` real,
	`high` real,
	`low` real,
	`close` real,
	`volume` integer,
	`adjusted_close` real,
	FOREIGN KEY (`symbol`) REFERENCES `companies`(`symbol`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `prices_symbol_date_idx` ON `prices` (`symbol`,`date`);--> statement-breakpoint
CREATE TABLE `screen_results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`symbol` text NOT NULL,
	`screen_type` text NOT NULL,
	`score` real,
	`details_json` text,
	`computed_at` text NOT NULL,
	FOREIGN KEY (`symbol`) REFERENCES `companies`(`symbol`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `screen_symbol_type_idx` ON `screen_results` (`symbol`,`screen_type`);--> statement-breakpoint
CREATE TABLE `sync_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sync_type` text NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	`status` text NOT NULL,
	`records_affected` integer DEFAULT 0,
	`error_message` text
);
--> statement-breakpoint
CREATE TABLE `watchlist` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`symbol` text NOT NULL,
	`added_at` text NOT NULL,
	`notes` text,
	`target_price` real,
	`alert_enabled` integer DEFAULT 0,
	FOREIGN KEY (`symbol`) REFERENCES `companies`(`symbol`) ON UPDATE no action ON DELETE no action
);
