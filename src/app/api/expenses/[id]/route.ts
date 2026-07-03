import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser, AuthError, toExpense } from "@/lib/auth";
import type {
  UpdateExpensePayload,
  ExpenseCategory,
  ApiError,
} from "@/types";

const VALID_CATEGORIES: string[] = [
  "Housing",
  "Food",
  "Transport",
  "Leisure",
  "Groceries",
  "Health",
  "Dining",
  "Utilities",
  "Entertainment",
  "Shopping",
  "Wellness",
  "Other",
  // Credit categories
  "Salary",
  "Freelance",
  "Gift",
  "Refund",
  "Investment",
  "Bonus",
];

function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return (
    dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
  );
}

// ─── PATCH /api/expenses/[id] ─────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: userId } = await getAuthenticatedUser();
    const { id } = await params;

    const body = (await req.json()) as UpdateExpensePayload;

    // Fetch the expense with its parent Month to enforce ownership.
    const existing = await db.expense.findUnique({
      where: { id },
      include: { month: true },
    });

    if (!existing || existing.month.userId !== userId) {
      return NextResponse.json<ApiError>(
        { error: "Expense not found." },
        { status: 404 },
      );
    }

    const data: {
      amount?: number;
      category?: string;
      description?: string | null;
      name?: string | null;
      date?: string;
      type?: string;
    } = {};

    if (body.amount !== undefined) {
      const amt = Number(body.amount);
      if (Number.isNaN(amt) || amt <= 0) {
        return NextResponse.json<ApiError>(
          { error: "amount must be a positive number." },
          { status: 400 },
        );
      }
      data.amount = amt;
    }

    if (body.category !== undefined) {
      if (!VALID_CATEGORIES.includes(body.category as string)) {
        return NextResponse.json<ApiError>(
          { error: "Invalid category." },
          { status: 400 },
        );
      }
      data.category = body.category as string;
    }

    if (body.description !== undefined) {
      const desc =
        typeof body.description === "string" && body.description.trim()
          ? body.description.trim()
          : null;
      data.description = desc;
      data.name = desc;
    }

    if (body.date !== undefined) {
      if (typeof body.date !== "string" || !isValidDate(body.date)) {
        return NextResponse.json<ApiError>(
          { error: "Invalid date. Expected YYYY-MM-DD." },
          { status: 400 },
        );
      }
      data.date = body.date;
    }

    if (body.type !== undefined) {
      data.type = body.type === 'credit' ? 'credit' : 'expense';
    }

    if (Object.keys(data).length === 0) {
      // Nothing to update — return current state.
      return NextResponse.json(toExpense(existing));
    }

    const updated = await db.expense.update({
      where: { id },
      data,
    });

    return NextResponse.json(toExpense(updated));
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[expenses.PATCH] error:", err);
    return NextResponse.json<ApiError>(
      { error: "Failed to update expense." },
      { status: 500 },
    );
  }
}

// ─── DELETE /api/expenses/[id] ────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: userId } = await getAuthenticatedUser();
    const { id } = await params;

    const existing = await db.expense.findUnique({
      where: { id },
      include: { month: true },
    });

    if (!existing || existing.month.userId !== userId) {
      return NextResponse.json<ApiError>(
        { error: "Expense not found." },
        { status: 404 },
      );
    }

    await db.expense.delete({ where: { id } });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[expenses.DELETE] error:", err);
    return NextResponse.json<ApiError>(
      { error: "Failed to delete expense." },
      { status: 500 },
    );
  }
}
