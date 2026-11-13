import { describe, expect, it } from "vitest";
import { parseSms } from "./sms-parser";
import { decideAutoImport } from "./import-policy";
import { buildImportDedupeKey } from "./import-dedupe";

const good = "Rs.450.00 debited from A/c XX1234 on 04-Nov-26 for UPI/234567890123/zomato@okaxis. Avl Bal Rs.1000";
const category = { category: "Dining", confidence: 0.9, source: "keyword" };

describe("trusted UPI import policy", () => {
  it("automatically records a well-identified Canara debit", () => {
    const parsed = parseSms(good, "VK-CANBNK");
    expect(parsed).not.toBeNull();
    expect(parsed?.hasExplicitDate).toBe(true);
    expect(parsed?.isUpi).toBe(true);
    expect(decideAutoImport(parsed!, "VK-CANBNK", good, category, "trusted").autoApprove).toBe(true);
  });

  it("leaves credits and user-selected review mode in the queue", () => {
    const debit = parseSms(good, "CANBNK")!;
    expect(decideAutoImport(debit, "CANBNK", good, category, "review").autoApprove).toBe(false);
    const creditText = "Rs.500 credited to A/c XX1234 on 04-Nov-26 via UPI/234567890123/zomato@okaxis";
    const credit = parseSms(creditText, "CANBNK")!;
    expect(decideAutoImport(credit, "CANBNK", creditText, category, "trusted").reason).toBe("incoming_credit");
  });

  it("never auto-posts generic senders, missing references or failed transactions", () => {
    const debit = parseSms(good, "SOME-BANK")!;
    expect(decideAutoImport(debit, "SOME-BANK", good, category, "trusted").autoApprove).toBe(false);
    const missingRef = "Rs.450.00 debited from A/c XX1234 on 04-Nov-26 for UPI to zomato@okaxis";
    const parsed = parseSms(missingRef, "CANBNK")!;
    expect(decideAutoImport(parsed, "CANBNK", missingRef, category, "trusted").autoApprove).toBe(false);
    expect(decideAutoImport(parseSms(good + " failed", "CANBNK")!, "CANBNK", good + " failed", category, "trusted").autoApprove).toBe(false);
  });

  it("does not auto-post unknown-category or AI-only classifications", () => {
    const parsed = parseSms(good, "CANBNK")!;
    expect(decideAutoImport(parsed, "CANBNK", good, {category: "Other", confidence: 1, source: "rule"}, "trusted").autoApprove).toBe(false);
    expect(decideAutoImport(parsed, "CANBNK", good, {category: "Dining", confidence: 0.9, source: "gemini"}, "trusted").autoApprove).toBe(false);
  });

  it("normalizes the bank-free fallback date into Asia/Kolkata", () => {
    const noDate = "Rs.50 debited for UPI/234567890123/zomato@okaxis";
    const parsed = parseSms(noDate, "CANBNK", new Date("2026-11-13T20:00:00Z"))!;
    expect(parsed.date).toBe("2026-11-14");
    expect(parsed.hasExplicitDate).toBe(false);
    expect(decideAutoImport(parsed, "CANBNK", noDate, category, "trusted").autoApprove).toBe(false);
  });

  it("uses bank and reference as a stable idempotency identity", () => {
    const parsed = parseSms(good, "CANBNK")!;
    const first = buildImportDedupeKey("user-1", parsed, "CANBNK", good, "2026-11-04T10:00:00Z");
    const retry = buildImportDedupeKey("user-1", parsed, "CANBNK", good, "2026-11-04T12:00:00Z");
    expect(first).toBe(retry);
    expect(first).not.toBe(buildImportDedupeKey("user-2", parsed, "CANBNK", good));
  });
});
