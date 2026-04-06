interface FinancialContext {
  symbol: string;
  nameEn: string;
  nameAr?: string | null;
  sector?: string | null;
  currentPrice: number | null;
  sageScore: number | null;
  incomeData: string; // JSON string of income statements
  balanceData: string; // JSON string of balance sheets
  cashFlowData: string; // JSON string of cash flows
  screenResults: string; // JSON string of screening results
}

export function buildMemoPrompt(ctx: FinancialContext, locale: string): string {
  const lang = locale === "ar" ? "Arabic" : "English";
  return `Analyze ${ctx.nameEn} (${ctx.symbol}.SR) on the Saudi Exchange (Tadawul) and generate a structured investment memo.

Company: ${ctx.nameEn}${ctx.nameAr ? ` / ${ctx.nameAr}` : ""}
Sector: ${ctx.sector || "Unknown"}
Current Price: ${ctx.currentPrice ? `${ctx.currentPrice} SAR` : "Unknown"}
Sage Score: ${ctx.sageScore ?? "Not computed"}

FINANCIAL DATA:
Income Statements: ${ctx.incomeData}
Balance Sheets: ${ctx.balanceData}
Cash Flows: ${ctx.cashFlowData}

SCREENING RESULTS:
${ctx.screenResults}

Please write the memo in ${lang} with these sections:
1. **Executive Summary**: One-paragraph thesis on whether this stock appears undervalued.
2. **Business Quality Assessment**: Competitive advantages, market position, industry context.
3. **Financial Strength**: Balance sheet analysis, earnings quality, cash flow trends.
4. **Valuation**: Summary of the DCF model, comparable analysis, historical valuation context.
5. **Risks**: Key risks and what could make the thesis wrong.
6. **The Buffett Test**: Would Warren Buffett buy this at the current price? Why or why not, grounded in his principles from the Berkshire Hathaway shareholder letters.

DISCLAIMER: Include at the end that this is for educational and research purposes only.`;
}

export function buildStatementAnalysisPrompt(ctx: FinancialContext, locale: string): string {
  const lang = locale === "ar" ? "Arabic" : "English";
  return `Analyze the financial statements of ${ctx.nameEn} (${ctx.symbol}.SR) on Tadawul.

Income Statements: ${ctx.incomeData}
Balance Sheets: ${ctx.balanceData}
Cash Flows: ${ctx.cashFlowData}

Please provide in ${lang}:
1. **Trend Analysis**: Key trends in revenue, margins, and cash flows.
2. **Red Flags**: Any accounting irregularities, unusual items, or concerning patterns.
3. **Hidden Strengths**: Positive signals the numbers might reveal.
4. **Quality of Earnings**: How sustainable are the reported earnings?

Base your analysis on the actual data provided. If data is insufficient, state what's missing.`;
}

export function buildBuffettLensPrompt(ctx: FinancialContext, locale: string): string {
  const lang = locale === "ar" ? "Arabic" : "English";
  return `Evaluate ${ctx.nameEn} (${ctx.symbol}.SR) through the lens of Warren Buffett's investment principles.

Current Price: ${ctx.currentPrice ? `${ctx.currentPrice} SAR` : "Unknown"}
Financial Data: ${ctx.incomeData}
Balance Sheet: ${ctx.balanceData}
Cash Flow: ${ctx.cashFlowData}
Screening Results: ${ctx.screenResults}

Using Buffett's known principles from his Berkshire Hathaway shareholder letters, answer in ${lang}:

1. **Circle of Competence**: Is this business easy to understand? Does it have predictable economics?
2. **Economic Moat**: Does this company have durable competitive advantages? What kind (brand, switching costs, network effects, cost advantages)?
3. **Management Quality**: Based on the financial data, does management appear rational in capital allocation?
4. **Margin of Safety**: At the current price, is there a sufficient margin of safety?
5. **The Verdict**: Would Buffett buy this company today? Reference specific principles from his letters.

Remember: Buffett prefers businesses with consistent earnings, high ROE with low debt, honest/able management, and available at a fair price.`;
}
