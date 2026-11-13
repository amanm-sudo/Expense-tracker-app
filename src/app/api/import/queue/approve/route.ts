import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser, AuthError, toExpense } from "@/lib/auth";
import { EXPENSE_CATEGORIES, CREDIT_CATEGORIES } from "@/lib/categorizer";
import type { ApiError } from "@/types";

interface Override {
  category?: string;
  name?: string;
}

const EXPENSE_SET = new Set<string>(EXPENSE_CATEGORIES);
const CREDIT_SET = new Set<string>(CREDIT_CATEGORIES);

/**
 * POST /api/import/queue/approve
 *
 * Approves selected ImportQueue items and creates Expense records.
 * If a category override is provided (user changed it), saves a MerchantRule.
 *
 * Body: { ids: string[], overrides?: Record<string, Override> }
 */
export async function POST(req: NextRequest) {
  try {
    const { id: userId } = await getAuthenticatedUser();

    const body = (await req.json()) as {
      ids: string[];
      overrides?: Record<string, Override>;
    };
    const { ids, overrides = {} } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json<ApiError>(
        { error: "ids must be a non-empty array." },
        { status: 400 },
      );
    }

    const queueItems = await db.importQueue.findMany({
      where: { userId, id: { in: ids }, status: "pending" },
    });

    const created: string[] = [];

    // Whole batch succeeds or nothing is written — previously a mid-batch
    // failure left some rows approved and the rest pending.
    await db.$transaction(async (tx) => {
      for (const item of queueItems) {
        const override = overrides[item.id] ?? {};
        const validCategories = item.txnType === "credit" ? CREDIT_SET : EXPENSE_SET;
        const requestedCategory = override.category ?? item.suggestedCat;
        const finalCategory = validCategories.has(requestedCategory)
          ? requestedCategory
          : "Other";
        const finalName = override.name ?? item.merchant ?? item.suggestedCat;

        // ── Auto-provision the month row ──────────────────────────────
        const monthId = item.date.slice(0, 7); // "YYYY-MM"
        let month = await tx.month.findUnique({
          where: { userId_monthId: { userId, monthId } },
        });
        if (!month) {
          month = await tx.month.create({ data: { userId, monthId, income: 0 } });
        }

        // ── Create the Expense ────────────────────────────────────────
        const expense = await tx.expense.create({
          data: {
            monthId: month.id,
            amount: item.amount,
            category: finalCategory,
            description: item.vpa ?? item.merchant ?? undefined,
            name: finalName,
            date: item.date,
            type: item.txnType,
          },
        });

        // ── Mark queue item approved ──────────────────────────────────
        await tx.importQueue.update({
          where: { id: item.id },
          data: { status: "approved", expenseId: expense.id },
        });

        // ── Learn from override: save MerchantRule ────────────────────
        if (
          override.category &&
          override.category !== item.suggestedCat &&
          validCategories.has(override.category)
        ) {
          const pattern = item.vpa
            ? item.vpa.split("@")[0].toLowerCase().replace(/\d+$/, "")
            : (item.merchant ?? "").toLowerCase();

          if (pattern) {
            await tx.merchantRule.upsert({
              where: { userId_pattern: { userId, pattern } },
              update: { category: override.category },
              create: { userId, pattern, category: override.category },
            });
          }
        }

        created.push(toExpense(expense).id);
      }
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
