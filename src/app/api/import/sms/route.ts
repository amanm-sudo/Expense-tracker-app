import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { parseSms, type ParsedSms } from "@/lib/sms-parser";
import { categorize } from "@/lib/categorizer";
import type { ApiError } from "@/types";

const DEDUPE_WINDOW_MS = 10 * 60 * 1000;

/**
 * Stable fallback key so a re-forwarded SMS is not queued twice when the bank
 * message carries no UPI reference. The short time window keeps two genuinely
 * identical payments (same amount/merchant/day) from being merged later in the day.
 */
function buildDedupeKey(userId: string, parsed: ParsedSms): string {
  return createHash("sha256")
    .update(
      [
        userId,
        parsed.amount.toFixed(2),
        parsed.date,
        parsed.txnType,
        (parsed.vpa ?? parsed.merchant ?? "").toLowerCase(),
        parsed.upiRef ?? "",
      ].join("|"),
    )
    .digest("hex");
}

/**
 * POST /api/import/sms
 *
 * Webhook endpoint called by the Android SMS forwarder app.
 * Authenticates via the X-Import-Secret header, or a ?secret= query parameter
 * (easier to paste into forwarder apps that do not support custom headers).
 *
 * Expected body:
 * { "from": "CANBNK", "body": "<full SMS text>", "timestamp": "2026-11-04T20:30:00Z" }
 */
export async function POST(req: NextRequest) {
  try {
    // ── 1. Authenticate via token ────────────────────────────────────
    const secret =
      req.headers.get("x-import-secret") ??
      req.nextUrl.searchParams.get("secret");

    if (!secret) {
      return NextResponse.json<ApiError>(
        { error: "Missing import secret. Send X-Import-Secret or ?secret=." },
        { status: 401 },
      );
    }

    const tokenRecord = await db.importToken.findUnique({
      where: { token: secret },
      include: { user: true },
    });

    if (!tokenRecord) {
      return NextResponse.json<ApiError>(
        { error: "Invalid import secret." },
        { status: 401 },
      );
    }

    const userId = tokenRecord.userId;

    // ── 2. Parse request body ────────────────────────────────────────
    let body: { from?: string; body?: string; timestamp?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json<ApiError>(
        { error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const smsFrom = (body.from ?? "").trim();
    const smsBody = (body.body ?? "").trim();

    if (!smsBody) {
      return NextResponse.json<ApiError>(
        { error: "Missing SMS body." },
        { status: 400 },
      );
    }

    // ── 3. Parse the SMS ─────────────────────────────────────────────
    const parsed = parseSms(smsBody, smsFrom);

    if (!parsed) {
      // Not a recognisable transaction alert — log the wording so unsupported
      // bank formats can be extended, then return 200 so the forwarder
      // does not retry forever.
      console.warn(
        "[import/sms] unrecognised",
        smsFrom || "(no sender)",
        smsBody.slice(0, 160),
      );
      return NextResponse.json({ received: true, queued: false, reason: "unrecognised" });
    }

    // ── 4. Deduplicate: same UPI ref, or the same fallback key recently ──
    const dedupeKey = buildDedupeKey(userId, parsed);
    const orFilters: Prisma.ImportQueueWhereInput[] = [];
    if (parsed.upiRef) orFilters.push({ upiRef: parsed.upiRef });
    orFilters.push({
      dedupeKey,
      createdAt: { gte: new Date(Date.now() - DEDUPE_WINDOW_MS) },
    });

    const existing = await db.importQueue.findFirst({
      where: { userId, OR: orFilters },
    });
    if (existing) {
      return NextResponse.json({ received: true, queued: false, reason: "duplicate" });
    }

    // ── 5. Auto-categorize ───────────────────────────────────────────
    const catResult = await categorize(
      userId,
      parsed.vpa,
      parsed.merchant,
      parsed.txnType,
      smsBody,
    );

    // Combined confidence: parse confidence × categorisation confidence
    const combinedConfidence =
      Math.round(parsed.confidence * catResult.confidence * 100) / 100;

    // ── 6. Insert into ImportQueue ───────────────────────────────────
    await db.importQueue.create({
      data: {
        userId,
        rawSms: smsBody,
        smsFrom,
        amount: parsed.amount,
        merchant: parsed.merchant,
        vpa: parsed.vpa,
        upiRef: parsed.upiRef,
        dedupeKey,
        date: parsed.date,
        txnType: parsed.txnType,
        suggestedCat: catResult.category,
        confidence: combinedConfidence,
        status: "pending",
      },
    });

    return NextResponse.json({ received: true, queued: true });
  } catch (err) {
    console.error("[import/sms] error:", err);
    // Return 200 to prevent SMS forwarder retry storms
    return NextResponse.json({ received: true, queued: false, reason: "internal_error" });
  }
}
