import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getAuthenticatedUser,
  isValidMonthId,
  toExpense,
} from "@/lib/auth";
import type {
  CreateExpensePayload,
  ExpenseCategory,
  ApiError,
} from "@/types";

const VALID_CATEGORIES: ExpenseCategory[] = [
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
];

/** Auto-provision a Month row for the given user + monthId. */
async function findOrCreateMonth(userId: string, monthId: string) {
  const existing = await db.month.findUnique({
    where: { userId_monthId: { userId, monthId } },
  });
  if (existing) return existing;
  return db.month.create({ data: { userId, monthId, income: 0 } });
}

/** Validate that a date string is a real calendar date in YYYY-MM-DD form. */
function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return (
    dt.getFullYear() === y &&
    dt.getMonth() === m - 1 &&
    dt.getDate() === d
  );
}

// ─── POST /api/expenses ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { id: userId } = await getAuthenticatedUser();
    const body = (await req.json()) as Partial<CreateExpensePayload>;

    const { monthId, amount, category, description, date } = body;

    if (typeof monthId !== "string" || !isValidMonthId(monthId)) {
      return NextResponse.json<ApiError>(
        { error: "Invalid or missing monthId. Expected YYYY-MM." },
        { status: 400 },
      );
    }

    const amt = Number(amount);
    if (Number.isNaN(amt) || amt <= 0) {
      return NextResponse.json<ApiError>(
        { error: "amount must be a positive number." },
        { status: 400 },
      );
    }

    if (
      typeof category !== "string" ||
      !VALID_CATEGORIES.includes(category as ExpenseCategory)
    ) {
      return NextResponse.json<ApiError>(
        { error: "Invalid category." },
        { status: 400 },
      );
    }

    if (typeof date !== "string" || !isValidDate(date)) {
      return NextResponse.json<ApiError>(
        { error: "Invalid date. Expected YYYY-MM-DD." },
        { status: 400 },
      );
    }

    const desc =
      typeof description === "string" && description.trim()
        ? description.trim()
        : null;

    const month = await findOrCreateMonth(userId, monthId);

    const created = await db.expense.create({
      data: {
        monthId: month.id,
        amount: amt,
        category: category as ExpenseCategory,
        description: desc,
        name: desc,
        date,
      },
    });

    return NextResponse.json(toExpense(created), { status: 201 });
  } catch (err) {
    console.error("[expenses.POST] error:", err);
    return NextResponse.json<ApiError>(
      { error: "Failed to create expense." },
      { status: 500 },
    );
  }
}
