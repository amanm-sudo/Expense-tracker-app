/**
 * Auto-categorization engine for imported UPI transactions.
 *
 * Priority order:
 *   1. User's saved MerchantRules (highest confidence, personalised)
 *   2. VPA/keyword lookup table (instant, no DB needed)
 *   3. Gemini flash (fallback for unknowns)
 */

import { db } from "@/lib/db";
import { geminiGenerate } from "@/lib/gemini";

export interface CategoryResult {
  category: string;
  confidence: number;             // 0–1
  source: "rule" | "keyword" | "gemini" | "default";
}

// ─── Valid categories (must match types/index.ts) ────────────────────────────

export const EXPENSE_CATEGORIES = [
  "Housing", "Food", "Transport", "Leisure", "Groceries",
  "Health", "Dining", "Utilities", "Entertainment", "Shopping",
  "Wellness", "Other",
] as const;

export const CREDIT_CATEGORIES = [
  "Salary", "Freelance", "Gift", "Refund", "Investment", "Bonus", "Other",
] as const;

const ALL_EXPENSE_CATEGORIES_STR = EXPENSE_CATEGORIES.join(", ");

// ─── VPA prefix → category map ───────────────────────────────────────────────

const VPA_CATEGORY_MAP: Record<string, string> = {
  // Dining
  zomato: "Dining",
  swiggy: "Dining",
  eatsure: "Dining",
  dominos: "Dining",
  mcdonalds: "Dining",
  kfc: "Dining",
  // Transport
  uber: "Transport",
  ola: "Transport",
  rapido: "Transport",
  irctc: "Transport",
  redbus: "Transport",
  mmt: "Leisure",
  makemytrip: "Leisure",
  yatra: "Leisure",
  // Groceries
  bigbasket: "Groceries",
  blinkit: "Groceries",
  dunzo: "Groceries",
  jiomart: "Groceries",
  zepto: "Groceries",
  dmart: "Groceries",
  bigbazaar: "Groceries",
  // Shopping
  amazon: "Shopping",
  flipkart: "Shopping",
  myntra: "Shopping",
  meesho: "Shopping",
  nykaa: "Shopping",
  ajio: "Shopping",
  snapdeal: "Shopping",
  // Health
  netmeds: "Health",
  pharmeasy: "Health",
  practo: "Health",
  apollo: "Health",
  medplus: "Health",
  // Wellness
  cult: "Wellness",
  curefit: "Wellness",
  healthifyme: "Wellness",
  // Entertainment
  hotstar: "Entertainment",
  netflix: "Entertainment",
  spotify: "Entertainment",
  gaana: "Entertainment",
  jiosaavn: "Entertainment",
  bookmyshow: "Entertainment",
  pvr: "Entertainment",
  inox: "Entertainment",
  youtube: "Entertainment",
  // Utilities
  airtel: "Utilities",
  jio: "Utilities",
  bsnl: "Utilities",
  vodafone: "Utilities",
  vi: "Utilities",
  tatapower: "Utilities",
  bescom: "Utilities",
  mseb: "Utilities",
  mahadiscom: "Utilities",
  // Food
  starbucks: "Food",
  barista: "Food",
  bluebottle: "Food",
  cafecoffeeday: "Food",
  // Leisure
  gymkhana: "Leisure",
  clubmahindra: "Leisure",
};

// ─── Keyword search in merchant name ─────────────────────────────────────────

const KEYWORD_CATEGORY_MAP: [RegExp, string][] = [
  [/zomato|swiggy|food|restaurant|cafe|dhaba|biryani|pizza|burger/i, "Dining"],
  [/uber|ola|rapido|cab|taxi|metro|bus|train|irctc|redbus/i, "Transport"],
  [/bigbasket|blinkit|grocer|dmart|zepto|vegetables|fruits|milk/i, "Groceries"],
  [/amazon|flipkart|myntra|meesho|nykaa|ajio|shopping|mart|store/i, "Shopping"],
  [/pharmacy|medical|hospital|clinic|doctor|health|netmeds|apollo/i, "Health"],
  [/gym|fitness|yoga|cult|wellness/i, "Wellness"],
  [/netflix|hotstar|spotify|movie|cinema|pvr|inox|bookmyshow/i, "Entertainment"],
  [/airtel|jio|bsnl|electricity|water|gas|broadband|wifi|internet/i, "Utilities"],
  [/rent|housing|maintenance|society|flat|apartment/i, "Housing"],
  [/hotel|resort|travel|flight|holiday/i, "Leisure"],
  [/salary|transfer|payment/i, "Other"],
];

// ─── Credit keyword map ─────────────────────────────────────────────────────

const CREDIT_KEYWORD_MAP: [RegExp, string][] = [
  [/salary|payroll|sal\s*cr/i, "Salary"],
  [/freelanc|invoice|consult|professional/i, "Freelance"],
  [/refund|reversal|return(?:ed)?/i, "Refund"],
  [/cashback|reward|bonus/i, "Bonus"],
  [/interest|dividend|mutual\s*fund|\bsip\b|investment/i, "Investment"],
  [/gift/i, "Gift"],
];

// ─── Step 1: Check saved MerchantRules ───────────────────────────────────────

async function checkMerchantRules(
  userId: string,
  vpa: string | null,
  merchant: string | null,
): Promise<CategoryResult | null> {
  const rules = await db.merchantRule.findMany({ where: { userId } });
  if (!rules.length) return null;

  const candidates = [vpa, merchant].filter(Boolean) as string[];

  for (const candidate of candidates) {
    for (const rule of rules) {
      if (candidate.toLowerCase().includes(rule.pattern.toLowerCase())) {
        return { category: rule.category, confidence: 1.0, source: "rule" };
      }
    }
  }
  return null;
}

// ─── Step 2: VPA/keyword lookup ──────────────────────────────────────────────

function checkKeywords(
  vpa: string | null,
  merchant: string | null,
): CategoryResult | null {
  // VPA prefix check first
  if (vpa) {
    const prefix = vpa.split("@")[0].toLowerCase().replace(/\d+$/, "");
    for (const [key, cat] of Object.entries(VPA_CATEGORY_MAP)) {
      if (prefix.includes(key)) {
        return { category: cat, confidence: 0.9, source: "keyword" };
      }
    }
  }

  // Merchant name keyword check
  if (merchant) {
    for (const [regex, cat] of KEYWORD_CATEGORY_MAP) {
      if (regex.test(merchant)) {
        return { category: cat, confidence: 0.75, source: "keyword" };
      }
    }
  }

  return null;
}

// ─── Step 3: Gemini categorization ───────────────────────────────────────────

async function geminiCategorize(
  merchant: string | null,
  vpa: string | null,
): Promise<CategoryResult> {
  const hint = [merchant, vpa].filter(Boolean).join(" / ");
  const prompt = `You are a financial categorization assistant. Given a UPI merchant name or VPA, return exactly ONE category from this list (and nothing else):
${ALL_EXPENSE_CATEGORIES_STR}

Merchant/VPA: "${hint}"

Reply with just the category name, no punctuation, no explanation.`;

  const raw = await geminiGenerate(prompt, "gemini-2.0-flash");
  if (raw) {
    const cleaned = raw.trim().replace(/[^a-zA-Z& ]/g, "");
    const matched = EXPENSE_CATEGORIES.find(
      (c) => c.toLowerCase() === cleaned.toLowerCase(),
    );
    if (matched) return { category: matched, confidence: 0.8, source: "gemini" };
  }

  return { category: "Other", confidence: 0.4, source: "default" };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Determine the best expense category for an imported UPI transaction.
 * Runs: MerchantRule → keyword map → Gemini flash fallback.
 */
export async function categorize(
  userId: string,
  vpa: string | null,
  merchant: string | null,
  txnType: "expense" | "credit",
  hintText?: string,
): Promise<CategoryResult> {
  // Credits use their own category list — bank SMS often has no VPA, so the
  // raw message text is the best signal for salary/refund/cashback wording.
  if (txnType === "credit") {
    const text = [merchant, vpa, hintText].filter(Boolean).join(" ");
    for (const [regex, category] of CREDIT_KEYWORD_MAP) {
      if (regex.test(text)) {
        return { category, confidence: 0.75, source: "keyword" };
      }
    }
    return { category: "Other", confidence: 0.5, source: "default" };
  }

  // 1. User's saved rules
  const ruleResult = await checkMerchantRules(userId, vpa, merchant);
  if (ruleResult) return ruleResult;

  // 2. VPA / keyword lookup
  const kwResult = checkKeywords(vpa, merchant);
  if (kwResult) return kwResult;

  // 3. Gemini fallback
  return geminiCategorize(merchant, vpa);
}
