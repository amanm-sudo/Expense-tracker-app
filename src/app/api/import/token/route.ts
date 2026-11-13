import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser, AuthError } from "@/lib/auth";
import type { ApiError } from "@/types";
import { randomUUID } from "crypto";

/**
 * GET /api/import/token
 * Returns the user's current import token + webhook URL.
 *
 * The full token is returned because the authenticated owner is the only
 * person who can configure the SMS forwarder with it; `masked` is kept for
 * display in the UI.
 */
export async function GET() {
  try {
    const { id: userId } = await getAuthenticatedUser();

    let record = await db.importToken.findUnique({ where: { userId } });
    if (!record) {
      // Auto-create on first visit
      record = await db.importToken.create({
        data: { userId, token: randomUUID() },
      });
    }

    // Mask middle of token for display
    const t = record.token;
    const masked = `${t.slice(0, 8)}••••••••${t.slice(-8)}`;

    return NextResponse.json({
      masked,
      token: record.token,
      webhookUrl: `${process.env.NEXTAUTH_URL}/api/import/sms`,
      createdAt: record.createdAt,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[import/token GET] error:", err);
    return NextResponse.json<ApiError>({ error: "Failed to fetch token." }, { status: 500 });
  }
}

/**
 * POST /api/import/token
 * Regenerates the user's import secret token.
 */
export async function POST() {
  try {
    const { id: userId } = await getAuthenticatedUser();

    const newToken = randomUUID();

    const record = await db.importToken.upsert({
      where: { userId },
      update: { token: newToken },
      create: { userId, token: newToken },
    });

    const t = record.token;
    const masked = `${t.slice(0, 8)}••••••••${t.slice(-8)}`;

    return NextResponse.json({
      masked,
      token: record.token,
      webhookUrl: `${process.env.NEXTAUTH_URL}/api/import/sms`,
      regenerated: true,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[import/token POST] error:", err);
    return NextResponse.json<ApiError>({ error: "Failed to regenerate token." }, { status: 500 });
  }
}
