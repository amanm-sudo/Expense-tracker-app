import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, AuthError } from "@/lib/auth";
import { parseSms } from "@/lib/sms-parser";
import { categorize } from "@/lib/categorizer";
import type { ApiError } from "@/types";

/**
 * POST /api/import/test-parse
 *
 * Parses an SMS without writing anything to the database. Used by the Settings
 * "parser playground" so unsupported bank formats can be diagnosed instantly.
 *
 * Body: { from?: string, body: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { id: userId } = await getAuthenticatedUser();

    const payload = (await req.json()) as { from?: string; body?: string };
    const smsFrom = (payload.from ?? "").trim();
    const smsBody = (payload.body ?? "").trim();

    if (!smsBody) {
      return NextResponse.json<ApiError>(
        { error: "SMS body is required." },
        { status: 400 },
      );
    }

    const parsed = parseSms(smsBody, smsFrom);
    if (!parsed) {
      return NextResponse.json({
        parsed: null,
        category: null,
        reason: "unrecognised",
      });
    }

    const category = await categorize(
      userId,
      parsed.vpa,
      parsed.merchant,
      parsed.txnType,
      smsBody,
    );

    return NextResponse.json({ parsed, category, reason: null });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[import/test-parse] error:", err);
    return NextResponse.json<ApiError>(
      { error: "Failed to parse SMS." },
      { status: 500 },
    );
  }
}
