/**
 * Parses only the specific Canara Bank and Union Bank UPI alert emails observed
 * in November 2026. It deliberately rejects unknown senders, other products,
 * failed transfers, invalid dates and promotional messages.
 *
 * The sender address is *not* proof of authenticity; all emails go to review.
 */
export type EmailBank = "canara" | "ubi";
export type EmailTxnType = "expense" | "credit";
export interface ParsedBankEmail {
  bank: EmailBank;
  amount: number;
  date: string;            // YYYY-MM-DD
  txnType: EmailTxnType;
  merchant: string | null; // payee for debits / sender for credits
  upiRef: string | null;
  confidence: number;
}

export const BANK_EMAIL_SENDERS = {
  canara: "canarabank@canarabank.com",
  ubi: "noreplyubi-txn@ubi.bank.in",
} as const;

export function normalizedEmailAddress(from: string): string {
  const match = from.trim().match(/<([^<>]+)>/);
  return (match ? match[1] : from).trim().toLowerCase();
}

function parseAmount(raw: string): number | null {
  // INR only. Do not accept units, scientific notation or large fabricated values.
  if (!/^\d{1,10}(?:,\d{2,3})*(?:\.\d{1,2})?$/.test(raw.trim())) return null;
  const value = Number(raw.replace(/,/g, ""));
  return Number.isFinite(value) && value > 0 && value <= 10_000_000 ? value : null;
}

function parseIndianDate(raw: string): string | null {
  const matched = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2}|\d{4})$/);
  if (!matched) return null;
  const d = Number(matched[1]), m = Number(matched[2]);
  const y = Number(matched[3]) + (matched[3].length === 2 ? 2000 : 0);
  if (y < 2020 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const parsed = new Date(Date.UTC(y, m - 1, d));
  if (parsed.getUTCFullYear() !== y || parsed.getUTCMonth() !== m - 1 || parsed.getUTCDate() !== d) return null;
  return [String(y), String(m).padStart(2, "0"), String(d).padStart(2, "0")].join("-");
}

function cleanName(raw: string): string | null {
  const name = raw.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
  // Names are never interpreted as code or HTML.
  if (!name || name.length < 2 || /[<>]/.test(name)) return null;
  return name;
}

function parseCanara(body: string): ParsedBankEmail | null {
  // Format: "An amount of INR 123.00 has been DEBITED on 16/11/26
  // from your account XXX750 to MERCHANT with UPI Ref No.:123456789012."
  const match = body.match(
    /An amount of\s+(?:(?:INR|Rs\.?|₹)\s*)?([\d,]+(?:\.\d{1,2})?)\s+has been\s+(DEBITED|CREDITED)\s+on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(from|to)\s+your account\s+\S+\s+(to|from)\s+([^\r\n]{2,120}?)\s+with\s+UPI\s+Ref\s+No\.?\s*:\s*(\d{6,20})/i,
  );
  if (!match) return null;
  const txnType = match[2].toUpperCase() === "DEBITED" ? "expense" : "credit";
  if ((txnType === "expense" && (match[4].toLowerCase() !== "from" || match[5].toLowerCase() !== "to")) ||
      (txnType === "credit" && (match[4].toLowerCase() !== "to" || match[5].toLowerCase() !== "from"))) {
    return null;
  }
  const amount = parseAmount(match[1]);
  const date = parseIndianDate(match[3]);
  if (!amount || !date) return null;
  return {
    bank: "canara", amount, date, txnType,
    merchant: cleanName(match[6]), upiRef: match[7], confidence: 0.94,
  };
}

function field(body: string, label: string): string | null {
  // Plaintext UBI emails have numbered field lines.
  const re = new RegExp("^\\s*\\d+\\.\\s*" + label + "\\s*:\\s*([^\\r\\n]+)", "im");
  return body.match(re)?.[1]?.trim() ?? null;
}

function parseUbi(body: string): ParsedBankEmail | null {
  if (!/fund transfer request through UPI has been processed successfully/i.test(body)) return null;
  const channel = field(body, "Channel");
  const status = field(body, "Transaction Status");
  const rawAmount = field(body, "Amount");
  const rawDate = field(body, "Transaction Date and Time");
  if (channel?.toUpperCase() !== "UPI" || status?.toLowerCase() !== "success" || !rawAmount || !rawDate) return null;
  const amount = parseAmount(rawAmount.replace(/^(?:Rs\.?|INR|₹)\s*/i, ""));
  const date = parseIndianDate(rawDate.split(/\s+/)[0]);
  if (!amount || !date) return null;
  const ref = field(body, "Transaction ID/RRN");
  if (ref && !/^\d{6,20}$/.test(ref)) return null;
  return {
    bank: "ubi",
    txnType: "expense",
    amount, date,
    merchant: cleanName(field(body, "Payee Name") ?? ""),
    upiRef: ref ?? null,
    confidence: ref ? 0.98 : 0.8,
  };
}

/** Classifies matched transactional alerts; returns null for all other mail. */
export function parseBankEmail(from: string, subject: string, body: string): ParsedBankEmail | null {
  if (!body || body.length > 12_000) return null;
  const sender = normalizedEmailAddress(from);
  if (sender === BANK_EMAIL_SENDERS.canara && subject.trim() === "UPI/IMPS/MB Transaction Alert") {
    return parseCanara(body);
  }
  if (sender === BANK_EMAIL_SENDERS.ubi && subject.trim() === "DEBIT TRANSACTION ALERT") {
    return parseUbi(body);
  }
  return null;
}
