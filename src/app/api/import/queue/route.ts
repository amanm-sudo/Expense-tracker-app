import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser, AuthError } from "@/lib/auth";
import type { ApiError } from "@/types";

/**
 * GET /api/import/queue?status=pending
 * Returns the user's import queue items filtered by status.
 */
export async function GET(req: NextRequest) {
  try {
    const { id: userId } = await getAuthenticatedUser();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? "pending";

    const items = await db.importQueue.findMany({
      where: { userId, status },
      orderBy: { createdAt: "desc" },
    });

    const pendingCount = await db.importQueue.count({
      where: { userId, status: "pending" },
    });

    return NextResponse.json({ items, pendingCount });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[import/queue GET] error:", err);
    return NextResponse.json<ApiError>({ error: "Failed to fetch queue." }, { status: 500 });
  }
}
