import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { categorize } from "@/lib/categorizer";
import { parseBankEmail, normalizedEmailAddress } from "@/lib/email-parser";
import { buildBankReferenceDedupeKey, buildEmailMessageDedupeKey } from "@/lib/import-dedupe";

export const runtime = "nodejs";
const MAX_BYTES = 16 * 1024;

/**
 * POST /api/import/email
 * Authenticated with the existing per-user SMS import token in X-Import-Secret.
 * Receives ONLY bank email transaction excerpts from a trusted user's Apps
 * Script; not a public Gmail OAuth callback.
 *
 * Accepts: { messageId, from, subject, body }.
 * Every recognized email is saved as PENDING review, regardless of SMS mode.
 * No bank email can directly create a ledger expense in this endpoint.
 */
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("x-import-secret");
    if (!token || token.length > 150) {
      return NextResponse.json({ error: "Invalid import credentials." }, { status: 401 });
    }
    const record = await db.importToken.findUnique({
      where: { token }, select: { userId: true },
    });
    if (!record) {
      return NextResponse.json({ error: "Invalid import credentials." }, { status: 401 });
    }

    const size = Number(req.headers.get("content-length") ?? 0);
    if (size > MAX_BYTES) return NextResponse.json({ error: "Payload too large." }, { status: 413 });
    const raw = await req.text();
    if (Buffer.byteLength(raw, "utf8") > MAX_BYTES) {
      return NextResponse.json({ error: "Payload too large." }, { status: 413 });
    }
    let value: unknown;
    try { value = JSON.parse(raw); } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return NextResponse.json({ error: "Expected a JSON object." }, { status: 400 });
    }
    const { messageId, from, subject, body } = value as Record<string, unknown>;
    if (
      typeof messageId !== "string" || !/^[a-f0-9]{8,64}$/i.test(messageId) ||
      typeof from !== "string" || from.length > 250 ||
      typeof subject !== "string" || subject.length > 200 ||
      typeof body !== "string" || !body.trim() || body.length > 12_000
    ) {
      return NextResponse.json({ error: "Invalid email fields." }, { status: 400 });
    }

    const parsed = parseBankEmail(from, subject, body);
    if (!parsed) {
      // Unrecognized and marketing messages should never be imported.
      return NextResponse.json({ received: true, queued: false, reason: "unrecognized" });
    }

    // Emails do not always contain a VPA. Merchant inference is suggestive,
    // not grounds for automatic posting. Disable slow Gemini network fallback.
    const cat = await categorize(record.userId, null, parsed.merchant, parsed.txnType, undefined, false);
    const key = parsed.upiRef
      ? buildBankReferenceDedupeKey(record.userId, parsed.bank, parsed.txnType, parsed.upiRef)
      : buildEmailMessageDedupeKey(record.userId, messageId);

    // Store only the parsed transaction summary, never a full bank email,
    // account number, available balance, links, or fraud hotline details.
    const safeSummary = [
      "Bank email alert (" + parsed.bank + ")",
      parsed.txnType === "expense" ? "Debit" : "Credit",
      "INR " + parsed.amount.toFixed(2),
      "Date " + parsed.date,
      parsed.merchant ? "Counterparty " + parsed.merchant : "",
      parsed.upiRef ? "UPI Ref " + parsed.upiRef : "",
    ].filter(Boolean).join(" | ");

    try {
      await db.importQueue.create({
        data: {
          userId: record.userId,
          rawSms: safeSummary,
          smsFrom: "EMAIL:" + parsed.bank.toUpperCase(),
          amount: parsed.amount,
          merchant: parsed.merchant,
          vpa: null,
          upiRef: parsed.upiRef,
          dedupeKey: key,
          date: parsed.date,
          txnType: parsed.txnType,
          suggestedCat: cat.category,
          confidence: Math.round(parsed.confidence * cat.confidence * 100) / 100,
          status: "pending",
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return NextResponse.json({ received: true, queued: false, reason: "duplicate" });
      }
      throw err;
    }

    return NextResponse.json({ received: true, queued: true, recorded: false, reason: "email_requires_review" });
  } catch (err) {
    // Do not log email body, user identifier, token or payload. Apps Script
    // retries 5xx deliveries at its next scheduled execution.
    console.error("[import/email] import failed:", err instanceof Error ? err.name : "unknown");
    return NextResponse.json({ error: "Email import temporarily unavailable; retry." }, { status: 503 });
  }
}
