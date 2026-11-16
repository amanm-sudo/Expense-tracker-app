import { createHash } from "crypto";
import type { ParsedSms } from "./sms-parser";

/** UPI references are bank-scoped stable identities for atomic deduplication.
 * Reference-free SMS never auto-post and are deduplicated by content and
 * original forwarding timestamp, if provided.
 */
/**
 * Stable cross-channel identity shared by SMS and bank email imports.
 * Preserve the existing SMS key format so previously imported SMS references
 * are also caught when their matching email arrives.
 */
export function buildBankReferenceDedupeKey(
  userId: string,
  bank: string,
  txnType: "expense" | "credit",
  upiRef: string,
): string {
  return createHash("sha256")
    .update(userId + "|" + ["ref", bank.toLowerCase().trim(), txnType, upiRef.trim()].join("|"))
    .digest("hex");
}

/** Email messages without a reference cannot be matched to SMS safely.
 * They remain manual-review-only, and message-id retries are idempotent.
 */
export function buildEmailMessageDedupeKey(userId: string, messageId: string): string {
  return createHash("sha256").update(userId + "|email|" + messageId).digest("hex");
}

export function buildImportDedupeKey(
  userId: string,
  parsed: ParsedSms,
  sender: string,
  body: string,
  forwardedTimestamp?: string,
): string {
  const bank = parsed.bank === "generic" ? sender.toUpperCase().trim() : parsed.bank;
  if (parsed.upiRef) return buildBankReferenceDedupeKey(userId, bank, parsed.txnType, parsed.upiRef);
  const identity = ["sms", bank, body.trim().toLowerCase().replace(/\s+/g, " "), forwardedTimestamp ?? ""].join("|");
  return createHash("sha256").update(userId + "|" + identity).digest("hex");
}
