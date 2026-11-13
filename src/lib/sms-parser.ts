/**
 * SMS Parser — Canara Bank, Union Bank of India, and a generic UPI fallback.
 *
 * Bank SMS wording changes over time and each bank has several variants, so the
 * parser pulls the transaction facts with one shared extraction engine and uses
 * bank profiles only to label the sender + adjust confidence. If a bank changes
 * its format, the generic path still captures the amount, direction, date, VPA
 * and reference instead of silently dropping the transaction.
 */

export type SmsBank = "canara" | "ubi" | "generic" | "unknown";

export interface ParsedSms {
  amount: number;
  txnType: "expense" | "credit"; // debit → expense, credit → credit
  merchant: string | null;       // human-readable merchant name
  vpa: string | null;            // UPI VPA e.g. "zomato@okaxis"
  upiRef: string | null;         // UPI reference / transaction ID
  date: string;                  // ISO YYYY-MM-DD
  bank: SmsBank;
  confidence: number;            // 0–1 parse confidence
  hasExplicitDate: boolean;
  isUpi: boolean;
}

// ─── Bank profiles ──────────────────────────────────────────────────────────

interface BankProfile {
  name: "canara" | "ubi";
  senders: string[];
  bodyMarkers: RegExp[];
}

const BANK_PROFILES: BankProfile[] = [
  {
    name: "canara",
    senders: ["CANBNK", "CANARA", "CNRB"],
    bodyMarkers: [/CANARA\s*BANK/i],
  },
  {
    name: "ubi",
    senders: ["UBIBNK", "UNIONB", "UBIN"],
    bodyMarkers: [/UNION\s*BANK/i, /UBI\s*CUSTOMER/i],
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

const MONTH_MAP: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

const VPA_PATTERN = /\b([a-z0-9][a-z0-9._-]{1,}@[a-z][a-z0-9.-]{1,})\b/i;

/** Figure out which bank sent the SMS (sender id first, then body markers). */
function detectBank(smsFrom: string, smsBody: string): SmsBank {
  const from = smsFrom.toUpperCase();
  for (const profile of BANK_PROFILES) {
    if (profile.senders.some((s) => from.includes(s))) return profile.name;
  }
  for (const profile of BANK_PROFILES) {
    if (profile.bodyMarkers.some((m) => m.test(smsBody))) return profile.name;
  }
  return "unknown";
}

/**
 * Find the transaction amount — not the available balance or credit limit.
 * Returns the value and its position so direction detection can pick the word
 * nearest to the amount.
 */
function findTransactionAmount(body: string): { amount: number; index: number } | null {
  const re = /(?:Rs\.?|₹|INR)\s*([\d,]+(?:\.\d{1,2})?)/gi;
  let match: RegExpExecArray | null;

  while ((match = re.exec(body)) !== null) {
    const before = body.slice(Math.max(0, match.index - 28), match.index).toLowerCase();
    // Skip closing/available balance and limit figures.
    if (/(avl|available|bal|balance|closing|limit|due|outstanding)/.test(before)) continue;

    const amount = parseFloat(match[1].replace(/,/g, ""));
    if (Number.isFinite(amount) && amount > 0) {
      return { amount, index: match.index };
    }
  }
  return null;
}

/**
 * Decide debit vs credit. Picks the keyword closest to the amount so phrases
 * like "debited using Credit Card" are not misread as a credit.
 */
function detectDirection(body: string, amountIndex: number): "expense" | "credit" | null {
  const re =
    /\b(debited|debit|withdrawn|withdrawal|credited|credit(?!\s*card)|deposited|deposit)\b/gi;
  let best: "expense" | "credit" | null = null;
  let bestDistance = Infinity;
  let match: RegExpExecArray | null;

  while ((match = re.exec(body)) !== null) {
    const word = match[1].toLowerCase();
    const direction: "expense" | "credit" =
      word.startsWith("credit") || word.startsWith("deposit") ? "credit" : "expense";
    const distance = Math.abs(match.index - amountIndex);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = direction;
    }
  }
  return best;
}

/** Normalise DD-Mon-YY, DD-Mon-YYYY, DD-MM-YY, DD/MM/YYYY to ISO. */
/** Validate a full date so an impossible SMS date never enters the ledger. */
function calendarDate(year: number, month: number, day: number): boolean {
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;
}

function normaliseDate(raw: string): string | null {
  const value = raw.trim();

  // DD-Mon-YY / DD-Mon-YYYY, with either '-' or whitespace
  const named = value.match(/^(\d{1,2})[-\s/]([A-Za-z]{3,9})[-\s/](\d{2,4})$/);
  if (named) {
    const day = parseInt(named[1], 10);
    const month = MONTH_MAP[named[2].slice(0, 3).toLowerCase()];
    const year = named[3].length === 2 ? 2000 + parseInt(named[3], 10) : parseInt(named[3], 10);
    if (month && calendarDate(year, Number(month), day)) {
      return `${year}-${month}-${String(day).padStart(2, "0")}`;
    }
  }

  // DD-MM-YYYY / DD/MM/YYYY (Indian day-first order)
  const numeric = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (numeric) {
    const day = parseInt(numeric[1], 10);
    const month = parseInt(numeric[2], 10);
    const year = numeric[3].length === 2 ? 2000 + parseInt(numeric[3], 10) : parseInt(numeric[3], 10);
    if (calendarDate(year, month, day)) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return calendarDate(year, month, day) ? value : null;
  }
  return null;
}

/** Extract the transaction date, ignoring any trailing time component. */
function findDate(body: string): string | null {
  const re =
    /(?:on|dated|dt\.?)\s*[:\s]\s*(\d{1,2}[-\s/][A-Za-z]{3,9}[-\s/]\d{2,4}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i;
  const match = body.match(re);
  return match ? normaliseDate(match[1]) : null;
}

function findVpa(body: string): string | null {
  const match = body.match(VPA_PATTERN);
  return match ? match[1] : null;
}

/** Extract the UPI reference / transaction id. */
function findUpiRef(body: string): string | null {
  const patterns = [
    /(?:UPI\s*Ref(?:erence)?(?:\s*No\.?)?|UPI\s*Txn(?:\s*(?:ID|No\.?))?|Txn\s*(?:ID|No\.?)|Transaction\s*(?:ID|No\.?))\s*[:\-]?\s*(\d{6,})/i,
    /UPI\s*[/\s]\s*(?:P2M|P2A|P2P)\s*[/\s]\s*(\d{6,})/i,
    /UPI\s*[/\s]\s*(\d{9,})/i,
  ];
  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/** Pull a merchant hint from "Info:", "Payee:" or "Beneficiary:" fields. */
function findMerchantHint(body: string): string | null {
  const match = body.match(
    /(?:Info|Payee|Beneficiary|Merchant)\s*[:\-]\s*([A-Za-z0-9 ._&'-]{2,40})/i,
  );
  if (!match) return null;
  const hint = match[1].replace(/\s+/g, " ").trim();
  return hint || null;
}

// ─── VPA → friendly merchant name map ───────────────────────────────────────

const VPA_MERCHANT_MAP: Record<string, string> = {
  zomato: "Zomato",
  swiggy: "Swiggy",
  uber: "Uber",
  ola: "Ola Cabs",
  rapido: "Rapido",
  amazon: "Amazon",
  flipkart: "Flipkart",
  myntra: "Myntra",
  bigbasket: "BigBasket",
  blinkit: "Blinkit",
  dunzo: "Dunzo",
  jiomart: "JioMart",
  dmart: "D-Mart",
  nykaa: "Nykaa",
  meesho: "Meesho",
  netmeds: "Netmeds",
  pharmeasy: "PharmEasy",
  practo: "Practo",
  cult: "Cult.fit",
  hotstar: "Hotstar",
  netflix: "Netflix",
  spotify: "Spotify",
  bookmyshow: "BookMyShow",
  irctc: "IRCTC",
  mmt: "MakeMyTrip",
  airtel: "Airtel",
  jio: "Jio",
  bsnl: "BSNL",
  vodafone: "Vodafone",
  tatapower: "Tata Power",
  bescom: "BESCOM",
  phonepe: "PhonePe",
  paytm: "Paytm",
  gpay: "Google Pay",
};

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (c) => c.toUpperCase());
}

function resolveMerchant(vpa: string | null, hint: string | null): string | null {
  if (vpa) {
    const prefix = vpa.split("@")[0].toLowerCase().replace(/\d+$/, "");
    for (const [key, name] of Object.entries(VPA_MERCHANT_MAP)) {
      if (prefix.includes(key)) return name;
    }
    const human = vpa.split("@")[0].replace(/\d+$/, "").replace(/[._-]+/g, " ").trim();
    if (human.length >= 2) return titleCase(human);
  }
  if (hint) return titleCase(hint);
  return null;
}

/** Use Indian local date if the bank SMS does not include a date. */
function indiaDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return [values.year, values.month, values.day].join("-");
}

// ─── Extraction ─────────────────────────────────────────────────────────────

function scoreConfidence(opts: {
  hasVpa: boolean;
  hasRef: boolean;
  hasDate: boolean;
  bank: SmsBank;
}): number {
  let score = 0.6;
  if (opts.hasVpa) score += 0.15;
  if (opts.hasRef) score += 0.15;
  if (opts.hasDate) score += 0.05;
  if (opts.bank === "unknown" || opts.bank === "generic") score -= 0.1;
  return Math.round(Math.max(0.4, Math.min(0.95, score)) * 100) / 100;
}

function buildParsed(body: string, bank: SmsBank, receivedAt: Date): ParsedSms | null {
  const amountInfo = findTransactionAmount(body);
  if (!amountInfo) return null;

  const txnType = detectDirection(body, amountInfo.index);
  if (!txnType) return null;

  const date = findDate(body);
  const vpa = findVpa(body);
  const upiRef = findUpiRef(body);
  const merchant = resolveMerchant(vpa, findMerchantHint(body));

  return {
    amount: amountInfo.amount,
    txnType,
    merchant,
    vpa,
    upiRef,
    date: date ?? indiaDate(receivedAt),
    hasExplicitDate: Boolean(date),
    isUpi: /\b(?:UPI|VPA)\b|[a-z0-9._-]+@[a-z][a-z0-9.-]+/i.test(body),
    bank,
    confidence: scoreConfidence({
      hasVpa: Boolean(vpa),
      hasRef: Boolean(upiRef),
      hasDate: Boolean(date),
      bank,
    }),
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Parse a bank SMS into structured data.
 * Returns null if the message is not a recognisable UPI transaction alert.
 */
export function parseSms(smsBody: string, smsFrom: string, receivedAt: Date = new Date()): ParsedSms | null {
  const body = smsBody.trim();
  if (!body) return null;

  const detected = detectBank(smsFrom, body);
  const bank: SmsBank = detected === "unknown" ? "generic" : detected;
  return buildParsed(body, bank, receivedAt);
}
