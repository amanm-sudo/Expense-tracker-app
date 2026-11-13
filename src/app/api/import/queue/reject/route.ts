import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser, AuthError } from "@/lib/auth";
import type { ApiError } from "@/types";

/**
 * POST /api/import/queue/reject
 * Body: { ids: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    const { id: userId } = await getAuthenticatedUser();
    const body = (await req.json()) as { ids: string[] };

    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json<ApiError>(
        { error: "ids must be a non-empty array." },
        { status: 400 },
      );
    }

    const { count } = await db.importQueue.updateMany({
      where: { userId, id: { in: body.ids }, status: "pending" },
      data: { status: "rejected" },
    });

    return NextResponse.json({ rejected: count });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[import/queue/reject] error:", err);
    return NextResponse.json<ApiError>({ error: "Failed to reject items." }, { status: 500 });
  }
}
