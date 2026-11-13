import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { parseSms } from "@/lib/sms-parser";
import { categorize } from "@/lib/categorizer";
import { buildImportDedupeKey } from "@/lib/import-dedupe";
import { decideAutoImport } from "@/lib/import-policy";
import { approveImportedTransaction } from "@/lib/import-ledger";

export const runtime = "nodejs";
const MAX_REQUEST_BYTES = 8 * 1024;
const MAX_SMS_LENGTH = 4000;

/**
 * POST /api/import/sms
 * X-Import-Secret: <token> (never put secrets in URLs)
 * JSON: { "from": "CANBNK", "body": "...", "timestamp": "2026-11-13T20:30:00+05:30" }
 *
 * 200: accepted/duplicate/unrecognized. 4xx: invalid payload/auth.
 * 5xx: transient server failure, so the forwarder can retry.
 */
export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-import-secret");
    if (!secret || secret.length > 150) {
      return NextResponse.json({ error: "Invalid import credentials." }, { status: 401 });
    }
    const tokenRecord = await db.importToken.findUnique({
      where: { token: secret },
      select: { userId: true, user: { select: { importMode: true } } },
    });
    if (!tokenRecord) {
      return NextResponse.json({ error: "Invalid import credentials." }, { status: 401 });
    }

    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: "Payload too large." }, { status: 413 });
    }
    const rawBody = await req.text();
    if (Buffer.byteLength(rawBody, "utf8") > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: "Payload too large." }, { status: 413 });
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return NextResponse.json({ error: "Expected a JSON object." }, { status: 400 });
    }

    const data = payload as Record<string, unknown>;
    if (typeof data.from !== "string" || typeof data.body !== "string") {
      return NextResponse.json({ error: "Both from and body must be strings." }, { status: 400 });
    }
    const smsFrom = data.from.trim().slice(0, 80);
    const smsBody = data.body.trim();
    if (!smsBody || smsBody.length > MAX_SMS_LENGTH) {
      return NextResponse.json({ error: "Invalid SMS length." }, { status: 400 });
    }

    let receivedAt = new Date();
    let forwardedTimestamp: string | undefined;
    if (data.timestamp !== undefined) {
      if (typeof data.timestamp !== "string" || data.timestamp.length > 50) {
        return NextResponse.json({ error: "Invalid timestamp." }, { status: 400 });
      }
      const parsedTimestamp = new Date(data.timestamp);
      if (!Number.isFinite(parsedTimestamp.getTime()) || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(data.timestamp)) {
        return NextResponse.json({ error: "Timestamp must be ISO 8601 with timezone." }, { status: 400 });
      }
      receivedAt = parsedTimestamp;
      forwardedTimestamp = parsedTimestamp.toISOString();
    }

    const parsed = parseSms(smsBody, smsFrom, receivedAt);
    if (!parsed) return NextResponse.json({ received: true, queued: false, reason: "unrecognized" });

    const category = await categorize(
      tokenRecord.userId, parsed.vpa, parsed.merchant, parsed.txnType, smsBody,
    );
    const confidence = Math.round(parsed.confidence * category.confidence * 100) / 100;
    const mode = tokenRecord.user.importMode === "trusted" ? "trusted" : "review";
    const decision = decideAutoImport(parsed, smsFrom, smsBody, category, mode);
    const dedupeKey = buildImportDedupeKey(
      tokenRecord.userId, parsed, smsFrom, smsBody, forwardedTimestamp,
    );

    try {
      const result = await db.$transaction(async (tx) => {
        const item = await tx.importQueue.create({
          data: {
            userId: tokenRecord.userId,
            rawSms: smsBody.replace(
              /((?:a\/c|acct|account)\s*(?:no\.?)?\s*[:.-]?\s*)(\d{8,19})/gi,
              (_whole, prefix: string, number: string) => prefix + "****" + number.slice(-4),
            ),
            smsFrom,
            amount: parsed.amount,
            merchant: parsed.merchant,
            vpa: parsed.vpa,
            upiRef: parsed.upiRef,
            dedupeKey,
            date: parsed.date,
            txnType: parsed.txnType,
            suggestedCat: category.category,
            confidence,
            status: "pending",
          },
        });

        if (decision.autoApprove) {
          const expenseId = await approveImportedTransaction(tx, item, tokenRecord.userId);
          if (!expenseId) throw new Error("Failed to claim new imported transaction.");
          return { received: true, queued: false, recorded: true, reason: decision.reason };
        }

        return { received: true, queued: true, recorded: false, reason: decision.reason };
      });

      return NextResponse.json(result);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return NextResponse.json({
          received: true, queued: false, recorded: false, reason: "duplicate",
        });
      }
      throw error;
    }
  } catch (error) {
    console.error("[import/sms] ingestion failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json(
      { error: "Import temporarily unavailable; retry the SMS delivery." },
      { status: 503 },
    );
  }
}
