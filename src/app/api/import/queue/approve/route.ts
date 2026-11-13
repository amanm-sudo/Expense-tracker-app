import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser, AuthError } from "@/lib/auth";
import { approveImportedTransaction, type ImportOverride } from "@/lib/import-ledger";
import type { ApiError } from "@/types";

/** POST /api/import/queue/approve
 * { ids: string[], overrides?: Record<string, { category?: string; name?: string }> }
 */
export async function POST(req: NextRequest) {
  try {
    const { id: userId } = await getAuthenticatedUser();
    const payload: unknown = await req.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return NextResponse.json<ApiError>({ error: "Invalid payload." }, { status: 400 });
    }

    const body = payload as { ids?: unknown; overrides?: unknown };
    if (
      !Array.isArray(body.ids) ||
      body.ids.length === 0 ||
      body.ids.length > 100 ||
      body.ids.some((id: unknown) => typeof id !== "string" || id.length > 100)
    ) {
      return NextResponse.json<ApiError>({ error: "ids must contain 1 to 100 strings." }, { status: 400 });
    }

    const overrides = body.overrides && typeof body.overrides === "object" && !Array.isArray(body.overrides)
      ? body.overrides as Record<string, ImportOverride>
      : {};

    const ids = [...new Set(body.ids as string[])];
    const created = await db.$transaction(async (tx) => {
      const items = await tx.importQueue.findMany({
        where: { userId, id: { in: ids }, status: "pending" },
      });
      const expenseIds: string[] = [];
      for (const item of items) {
        const id = await approveImportedTransaction(tx, item, userId, overrides[item.id], true);
        if (id) expenseIds.push(id);
      }
      return expenseIds;
    });

    return NextResponse.json({ approved: created.length, expenseIds: created });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[import/queue/approve] error:", err);
    return NextResponse.json<ApiError>({ error: "Failed to approve items." }, { status: 500 });
  }
}
