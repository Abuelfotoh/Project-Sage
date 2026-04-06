import * as cheerio from "cheerio";
import { CompanySchema, type CompanyData } from "./types";

const ARGAAM_URL = "https://www.argaam.com/en/tadawul/company-prices";
const ARGAAM_AR_URL = "https://www.argaam.com/ar/tadawul/company-prices";

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

interface ArgaamRow {
  symbol: string;
  nameEn: string;
  sectorEn: string;
}

interface ArgaamArRow {
  symbol: string;
  nameAr: string;
  sectorAr: string;
}

function parseEnglishPage(html: string): ArgaamRow[] {
  const $ = cheerio.load(html);
  const rows: ArgaamRow[] = [];

  $("table tbody tr").each((_, tr) => {
    const cells = $(tr).find("td");
    if (cells.length < 2) return;

    const symbolText = $(cells[0]).text().trim();
    const nameText = $(cells[1]).text().trim();

    // Try to find sector from parent section or table header
    const sectionHeader = $(tr).closest("table").prev("h2, h3, .section-title").text().trim();

    if (symbolText && nameText && /^\d+$/.test(symbolText)) {
      rows.push({
        symbol: symbolText,
        nameEn: nameText,
        sectorEn: sectionHeader || "Unknown",
      });
    }
  });

  return rows;
}

function parseArabicPage(html: string): ArgaamArRow[] {
  const $ = cheerio.load(html);
  const rows: ArgaamArRow[] = [];

  $("table tbody tr").each((_, tr) => {
    const cells = $(tr).find("td");
    if (cells.length < 2) return;

    const symbolText = $(cells[0]).text().trim();
    const nameText = $(cells[1]).text().trim();
    const sectionHeader = $(tr).closest("table").prev("h2, h3, .section-title").text().trim();

    if (symbolText && nameText && /^\d+$/.test(symbolText)) {
      rows.push({
        symbol: symbolText,
        nameAr: nameText,
        sectorAr: sectionHeader || "",
      });
    }
  });

  return rows;
}

export async function fetchTadawulCompanies(): Promise<CompanyData[]> {
  console.log("Fetching Tadawul companies from Argaam...");

  let enRows: ArgaamRow[] = [];
  let arRows: ArgaamArRow[] = [];

  try {
    const [enHtml, arHtml] = await Promise.all([
      fetchPage(ARGAAM_URL),
      fetchPage(ARGAAM_AR_URL),
    ]);

    enRows = parseEnglishPage(enHtml);
    arRows = parseArabicPage(arHtml);
  } catch (error) {
    console.warn("Argaam scraping failed, falling back to hardcoded major companies:", error);
    return getFallbackCompanies();
  }

  if (enRows.length === 0) {
    console.warn("No companies parsed from Argaam, using fallback list");
    return getFallbackCompanies();
  }

  // Merge EN and AR data by symbol
  const arMap = new Map(arRows.map((r) => [r.symbol, r]));

  const companies: CompanyData[] = [];
  for (const en of enRows) {
    const ar = arMap.get(en.symbol);
    const parsed = CompanySchema.safeParse({
      symbol: en.symbol,
      nameEn: en.nameEn,
      nameAr: ar?.nameAr,
      sectorEn: en.sectorEn,
      sectorAr: ar?.sectorAr,
      market: "main",
    });
    if (parsed.success) {
      companies.push(parsed.data);
    }
  }

  console.log(`Parsed ${companies.length} companies from Argaam`);
  return companies;
}

function getFallbackCompanies(): CompanyData[] {
  // Major Tadawul companies as a fallback when scraping fails
  const majors: CompanyData[] = [
    { symbol: "2222", nameEn: "Saudi Aramco", nameAr: "أرامكو السعودية", sectorEn: "Energy", sectorAr: "الطاقة", market: "main" },
    { symbol: "1180", nameEn: "Al Rajhi Bank", nameAr: "مصرف الراجحي", sectorEn: "Banks", sectorAr: "البنوك", market: "main" },
    { symbol: "2010", nameEn: "SABIC", nameAr: "سابك", sectorEn: "Materials", sectorAr: "المواد الأساسية", market: "main" },
    { symbol: "1010", nameEn: "Riyad Bank", nameAr: "بنك الرياض", sectorEn: "Banks", sectorAr: "البنوك", market: "main" },
    { symbol: "1060", nameEn: "Saudi Investment Bank", nameAr: "البنك السعودي للاستثمار", sectorEn: "Banks", sectorAr: "البنوك", market: "main" },
    { symbol: "1120", nameEn: "Al Jazira Bank", nameAr: "بنك الجزيرة", sectorEn: "Banks", sectorAr: "البنوك", market: "main" },
    { symbol: "1140", nameEn: "Bank AlBilad", nameAr: "بنك البلاد", sectorEn: "Banks", sectorAr: "البنوك", market: "main" },
    { symbol: "1150", nameEn: "Alinma Bank", nameAr: "مصرف الإنماء", sectorEn: "Banks", sectorAr: "البنوك", market: "main" },
    { symbol: "1211", nameEn: "Saudi National Bank (SNB)", nameAr: "البنك الأهلي السعودي", sectorEn: "Banks", sectorAr: "البنوك", market: "main" },
    { symbol: "2020", nameEn: "SAFCO", nameAr: "صافولا", sectorEn: "Materials", sectorAr: "المواد الأساسية", market: "main" },
    { symbol: "2030", nameEn: "Saudi Cement (Sarouji)", nameAr: "المصنعة", sectorEn: "Materials", sectorAr: "المواد الأساسية", market: "main" },
    { symbol: "2050", nameEn: "Savola Group", nameAr: "مجموعة صافولا", sectorEn: "Food & Staples Retailing", sectorAr: "إنتاج الأغذية", market: "main" },
    { symbol: "2060", nameEn: "National Industrialization (Tasnee)", nameAr: "التصنيع الوطنية", sectorEn: "Materials", sectorAr: "المواد الأساسية", market: "main" },
    { symbol: "2070", nameEn: "Saudi Chemical", nameAr: "الكيميائية السعودية", sectorEn: "Materials", sectorAr: "المواد الأساسية", market: "main" },
    { symbol: "2080", nameEn: "NAMA Chemicals", nameAr: "كيميائيات الميثانول", sectorEn: "Materials", sectorAr: "المواد الأساسية", market: "main" },
    { symbol: "2110", nameEn: "Saudi Cable", nameAr: "الكابلات السعودية", sectorEn: "Capital Goods", sectorAr: "السلع الرأسمالية", market: "main" },
    { symbol: "2150", nameEn: "Saudi Electricity (SEC)", nameAr: "الكهرباء السعودية", sectorEn: "Utilities", sectorAr: "المرافق العامة", market: "main" },
    { symbol: "2170", nameEn: "Almarai", nameAr: "المراعي", sectorEn: "Food & Beverages", sectorAr: "إنتاج الأغذية", market: "main" },
    { symbol: "2180", nameEn: "Al Faisaliah Group (Filing)", nameAr: "الفيصلية", sectorEn: "Diversified Financials", sectorAr: "التمويل", market: "main" },
    { symbol: "2190", nameEn: "Saudi Industrial Services (SISCO)", nameAr: "سيسكو", sectorEn: "Transportation", sectorAr: "النقل", market: "main" },
    { symbol: "2210", nameEn: "Nama Chemicals", nameAr: "نماء للكيماويات", sectorEn: "Materials", sectorAr: "المواد الأساسية", market: "main" },
    { symbol: "2240", nameEn: "Zamil Industrial", nameAr: "الزامل للصناعة", sectorEn: "Capital Goods", sectorAr: "السلع الرأسمالية", market: "main" },
    { symbol: "2250", nameEn: "Saudi Dairy & Foodstuff (SADAFCO)", nameAr: "السعودية للصناعات الغذائية", sectorEn: "Food & Beverages", sectorAr: "إنتاج الأغذية", market: "main" },
    { symbol: "2270", nameEn: "Saudi Pharmaceutical (SPIMACO)", nameAr: "سبيماكو الدوائية", sectorEn: "Pharma & Biotech", sectorAr: "الأدوية", market: "main" },
    { symbol: "2280", nameEn: "Almarai", nameAr: "المراعي", sectorEn: "Food & Beverages", sectorAr: "إنتاج الأغذية", market: "main" },
    { symbol: "2310", nameEn: "STC", nameAr: "الاتصالات السعودية", sectorEn: "Telecommunication Services", sectorAr: "الاتصالات", market: "main" },
    { symbol: "2350", nameEn: "Saudi Kayan", nameAr: "كيان السعودية", sectorEn: "Materials", sectorAr: "المواد الأساسية", market: "main" },
    { symbol: "2380", nameEn: "Petrochemical (PETRORABI)", nameAr: "بتروكيم", sectorEn: "Materials", sectorAr: "المواد الأساسية", market: "main" },
    { symbol: "4001", nameEn: "Abdullah Al Othaim Markets", nameAr: "العثيم", sectorEn: "Food & Staples Retailing", sectorAr: "تجارة التجزئة", market: "main" },
    { symbol: "4002", nameEn: "Mouwasat Medical", nameAr: "المواساة", sectorEn: "Health Care", sectorAr: "الرعاية الصحية", market: "main" },
    { symbol: "4003", nameEn: "Extra", nameAr: "إكسترا", sectorEn: "Retailing", sectorAr: "تجارة التجزئة", market: "main" },
    { symbol: "4005", nameEn: "Saudi Airlines Catering (SACC)", nameAr: "الخطوط السعودية للتموين", sectorEn: "Consumer Services", sectorAr: "الخدمات الاستهلاكية", market: "main" },
    { symbol: "4007", nameEn: "Al-Dawaa Medical Services", nameAr: "الدواء", sectorEn: "Health Care", sectorAr: "الرعاية الصحية", market: "main" },
    { symbol: "4030", nameEn: "Al Babtain Power & Telecom", nameAr: "البابطين", sectorEn: "Capital Goods", sectorAr: "السلع الرأسمالية", market: "main" },
    { symbol: "4050", nameEn: "Saudi Automotive Services (SOAS)", nameAr: "ساسكو", sectorEn: "Energy", sectorAr: "الطاقة", market: "main" },
    { symbol: "4070", nameEn: "Tihama Advertising", nameAr: "تهامة", sectorEn: "Media", sectorAr: "الإعلام", market: "main" },
    { symbol: "4080", nameEn: "Sinad Holding", nameAr: "سناد القابضة", sectorEn: "Capital Goods", sectorAr: "السلع الرأسمالية", market: "main" },
    { symbol: "4190", nameEn: "Jarir Marketing", nameAr: "جرير", sectorEn: "Retailing", sectorAr: "تجارة التجزئة", market: "main" },
    { symbol: "4200", nameEn: "Saudi Research & Marketing Group (SRMG)", nameAr: "المجموعة السعودية", sectorEn: "Media", sectorAr: "الإعلام", market: "main" },
    { symbol: "4210", nameEn: "Saudi Paper Manufacturing (SPM)", nameAr: "الورق", sectorEn: "Materials", sectorAr: "المواد الأساسية", market: "main" },
    { symbol: "4240", nameEn: "Fawaz Alhokair Group", nameAr: "الحكير", sectorEn: "Retailing", sectorAr: "تجارة التجزئة", market: "main" },
    { symbol: "4260", nameEn: "Budget Saudi", nameAr: "بدجت السعودية", sectorEn: "Transportation", sectorAr: "النقل", market: "main" },
    { symbol: "4261", nameEn: "Theeb Rent a Car", nameAr: "ذيب", sectorEn: "Transportation", sectorAr: "النقل", market: "main" },
    { symbol: "4270", nameEn: "Saudi Enaya Cooperative Insurance", nameAr: "العناية", sectorEn: "Insurance", sectorAr: "التأمين", market: "main" },
    { symbol: "4300", nameEn: "Dar Al Arkan Real Estate", nameAr: "دار الأركان", sectorEn: "Real Estate Mgmt & Dev", sectorAr: "التطوير العقاري", market: "main" },
    { symbol: "4310", nameEn: "Knowledge Economic City (KEC)", nameAr: "مدينة المعرفة", sectorEn: "Real Estate Mgmt & Dev", sectorAr: "التطوير العقاري", market: "main" },
    { symbol: "4320", nameEn: "Saudi Arabian Amiantit", nameAr: "أميانتيت", sectorEn: "Capital Goods", sectorAr: "السلع الرأسمالية", market: "main" },
    { symbol: "4321", nameEn: "Retal Urban Development", nameAr: "ريتال", sectorEn: "Real Estate Mgmt & Dev", sectorAr: "التطوير العقاري", market: "main" },
    { symbol: "8010", nameEn: "Tawuniya", nameAr: "التعاونية", sectorEn: "Insurance", sectorAr: "التأمين", market: "main" },
    { symbol: "8020", nameEn: "Malath Insurance", nameAr: "ملاذ للتأمين", sectorEn: "Insurance", sectorAr: "التأمين", market: "main" },
    { symbol: "8030", nameEn: "Mediterranean & Gulf Insurance (MEDGULF)", nameAr: "ميدغلف", sectorEn: "Insurance", sectorAr: "التأمين", market: "main" },
    { symbol: "8040", nameEn: "SABB Takaful (Allianz)", nameAr: "أليانز إس إف", sectorEn: "Insurance", sectorAr: "التأمين", market: "main" },
    { symbol: "8050", nameEn: "Salama Cooperative Insurance", nameAr: "سلامة", sectorEn: "Insurance", sectorAr: "التأمين", market: "main" },
    { symbol: "1111", nameEn: "Tadawul Group (Saudi Exchange)", nameAr: "مجموعة تداول", sectorEn: "Diversified Financials", sectorAr: "التمويل", market: "main" },
  ];

  return majors;
}
