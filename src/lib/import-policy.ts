import type { ParsedSms } from "./sms-parser";

export type ImportMode = "trusted" | "review";
interface CategoryDecision {
  category: string;
  confidence: number;
  source: string;
}
export interface AutoImportDecision {
  autoApprove: boolean;
  reason: string;
}

/** SMS is not proof of settlement. Only deterministic, well-formed known-bank
 * outgoing UPI payment alerts bypass review. Everything else stays pending.
 */
export function decideAutoImport(
  parsed: ParsedSms,
  sender: string,
  body: string,
  category: CategoryDecision,
  mode: ImportMode,
): AutoImportDecision {
  const review = (reason: string): AutoImportDecision => ({ autoApprove: false, reason });
  if (mode !== "trusted") return review("review_mode");
  if (parsed.txnType !== "expense") return review("incoming_credit");
  if (parsed.bank !== "canara" && parsed.bank !== "ubi") return review("unknown_bank");

  const senderText = sender.toUpperCase().trim().replace(/^[A-Z]{2}-/, "");
  const knownSender = (parsed.bank === "canara"
    ? ["CANBNK", "CANARA", "CNRB"]
    : ["UBIBNK", "UNIONB", "UBIN"]).includes(senderText);
  if (!knownSender) return review("unverified_sender");

  if (!parsed.isUpi || !/\bUPI\b/i.test(body)) return review("not_explicit_upi");
  if (!parsed.upiRef || !parsed.vpa || !parsed.hasExplicitDate) {
    return review("missing_transaction_evidence");
  }
  if (/\b(failed|failure|declined|pending|processing|initiated|reversed|reversal|refund(?:ed)?|chargeback|cancelled|canceled|unsuccessful|disputed|self[- ]transfer|own account)\b/i.test(body)) {
    return review("possibly_incomplete_or_reversed");
  }
  if (parsed.confidence < 0.9) return review("low_parse_confidence");
  if (category.category === "Other" || category.confidence < 0.85 ||
      (category.source !== "rule" && category.source !== "keyword")) {
    return review("uncertain_category");
  }
  return { autoApprove: true, reason: "trusted_bank_upi_debit" };
}
