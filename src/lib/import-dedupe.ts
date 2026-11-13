import { createHash } from "crypto";
import type { ParsedSms } from "./sms-parser";

/** UPI references are bank-scoped stable identities for atomic deduplication.
 * Reference-free SMS never auto-post and are deduplicated by content and
 * original forwarding timestamp, if provided.
 */
export function buildImportDedupeKey(
  userId: string,
  parsed: ParsedSms,
  sender: string,
  body: string,
  forwardedTimestamp?: string,
): string {
  const bank = parsed.bank === "generic" ? sender.toUpperCase().trim() : parsed.bank;
  const identity = parsed.upiRef
    ? ["ref", bank, parsed.txnType, parsed.upiRef].join("|")
    : ["sms", bank, body.trim().toLowerCase().replace(/\s+/g, " "), forwardedTimestamp ?? ""].join("|");
  return createHash("sha256").update(userId + "|" + identity).digest("hex");
}
