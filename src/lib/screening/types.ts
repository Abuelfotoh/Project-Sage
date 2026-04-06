export interface CriterionResult {
  name: string;
  passed: boolean;
  value: number | null;
  threshold: number | string | null;
  description: string;
}

export interface GrahamScreenResult {
  symbol: string;
  criteria: CriterionResult[];
  passedCount: number;
  totalCriteria: number;
  score: number; // 0-100
}

export interface BuffettScreenResult {
  symbol: string;
  criteria: {
    name: string;
    score: number; // 0-10
    value: number | null;
    description: string;
  }[];
  totalScore: number;
  maxScore: number;
  normalizedScore: number; // 0-100
}

export interface DCFResult {
  symbol: string;
  intrinsicValue: number | null;
  currentPrice: number | null;
  marginOfSafety: number | null; // percentage
  fairValue: number | null; // 25% margin
  bargainValue: number | null; // 50% margin
  ownerEarnings: number | null;
  growthRate: number | null;
  discountRate: number;
  terminalGrowthRate: number;
  score: number; // 0-100 based on margin of safety
}

export interface SageScore {
  symbol: string;
  composite: number; // 0-100
  grahamScore: number;
  buffettScore: number;
  dcfScore: number;
  signal: "strong_buy" | "buy" | "watch" | "hold" | "avoid";
  weights: {
    graham: number;
    buffett: number;
    dcf: number;
  };
}
