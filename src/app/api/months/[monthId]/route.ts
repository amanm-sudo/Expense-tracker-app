import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getAuthenticatedUser,
  isValidMonthId,
  toExpense,
} from "@/lib/auth";
import type {
  MonthDataResponse,
  RecurringObligation,
  SetIncomePayload,
  AddEmiPayload,
  ApiError,
} from "@/types";

/** Compute the timeGroup (early/mid/late) from a due day-of-month. */
function timeGroupForDueDate(dueDate: number): "early" | "mid" | "late" {
  if (dueDate <= 10) return "early";
  if (dueDate <= 20) return "mid";
  return "late";
}

/** Compute the next upcoming occurrence of a day-of-month from today. */
function nextOccurrence(dueDate: number): Date {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  let candidate = new Date(year, month, dueDate);
  if (candidate.getTime() < now.getTime()) {
    candidate = new Date(year, month + 1, dueDate);
  }
  return candidate;
}

/** Map a stored Emi row to the frontend RecurringObligation shape. */
function toRecurringObligation(row: {
  id: string;
  name: string;
  amount: number;
  dueDate: number;
  isPaid: boolean;
  category: string;
  icon: string;
}): RecurringObligation {
  let urgency: "scheduled" | "due-soon" = "scheduled";
  if (!row.isPaid) {
    const next = nextOccurrence(row.dueDate);
    const diffDays = (next.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (diffDays <= 7) urgency = "due-soon";
  }

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    icon: row.icon,
    dueDay: row.dueDate,
    amount: row.amount,
    status: row.isPaid ? "paid" : "pending",
    urgency,
    timeGroup: timeGroupForDueDate(row.dueDate),
  };
}

/** Find or auto-provision a Month row for the given user + monthId. */
async function findOrCreateMonth(userId: string, monthId: string) {
  const existing = await db.month.findUnique({
    where: { userId_monthId: { userId, monthId } },
  });
  if (existing) return existing;
  return db.month.create({
    data: { userId, monthId, income: 0 },
  });
}

// ─── GET /api/months/[monthId] ────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ monthId: string }> },
) {
  try {
    const { id: userId } = await getAuthenticatedUser();
    const { monthId } = await params;

    if (!isValidMonthId(monthId)) {
      return NextResponse.json<ApiError>(
        { error: "Invalid monthId format. Expected YYYY-MM." },
        { status: 400 },
      );
    }

    const month = await findOrCreateMonth(userId, monthId);

    const [expenses, emis] = await Promise.all([
      db.expense.findMany({
        where: { monthId: month.id },
        orderBy: { date: "desc" },
      }),
      db.emi.findMany({
        where: { monthId: month.id },
        orderBy: { dueDate: "asc" },
      }),
    ]);

    const body: MonthDataResponse = {
      monthId,
      income: month.income,
      expenses: expenses.map(toExpense),
      emis: emis.map(toRecurringObligation),
    };
    return NextResponse.json(body);
  } catch (err) {
    console.error("[months.GET] error:", err);
    return NextResponse.json<ApiError>(
      { error: "Failed to load month data." },
      { status: 500 },
    );
  }
}

// ─── PATCH /api/months/[monthId] (set income) ─────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ monthId: string }> },
) {
  try {
    const { id: userId } = await getAuthenticatedUser();
    const { monthId } = await params;

    if (!isValidMonthId(monthId)) {
      return NextResponse.json<ApiError>(
        { error: "Invalid monthId format. Expected YYYY-MM." },
        { status: 400 },
      );
    }

    const body = (await req.json()) as Partial<SetIncomePayload>;
    const income = Number(body.income);
    if (body.income === undefined || Number.isNaN(income) || income < 0) {
      return NextResponse.json<ApiError>(
        { error: "Invalid income. Must be a non-negative number." },
        { status: 400 },
      );
    }

    const month = await findOrCreateMonth(userId, monthId);
    const updated = await db.month.update({
      where: { id: month.id },
      data: { income },
    });

    return NextResponse.json({ monthId, income: updated.income });
  } catch (err) {
    console.error("[months.PATCH] error:", err);
    return NextResponse.json<ApiError>(
      { error: "Failed to update income." },
      { status: 500 },
    );
  }
}

// ─── POST /api/months/[monthId] (add EMI) ─────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ monthId: string }> },
) {
  try {
    const { id: userId } = await getAuthenticatedUser();
    const { monthId } = await params;

    if (!isValidMonthId(monthId)) {
      return NextResponse.json<ApiError>(
        { error: "Invalid monthId format. Expected YYYY-MM." },
        { status: 400 },
      );
    }

    const body = (await req.json()) as AddEmiPayload;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const amount = Number(body.amount);
    const dueDate = Number(body.dueDate);

    if (!name) {
      return NextResponse.json<ApiError>(
        { error: "EMI name is required." },
        { status: 400 },
      );
    }
    if (Number.isNaN(amount) || amount <= 0) {
      return NextResponse.json<ApiError>(
        { error: "EMI amount must be a positive number." },
        { status: 400 },
      );
    }
    if (!Number.isInteger(dueDate) || dueDate < 1 || dueDate > 31) {
      return NextResponse.json<ApiError>(
        { error: "dueDate must be an integer between 1 and 31." },
        { status: 400 },
      );
    }

    const category =
      typeof body.category === "string" && body.category.trim()
        ? body.category.trim()
        : "Other";
    const icon =
      typeof body.icon === "string" && body.icon.trim()
        ? body.icon.trim()
        : "Globe";

    const month = await findOrCreateMonth(userId, monthId);
    const created = await db.emi.create({
      data: {
        monthId: month.id,
        name,
        amount,
        dueDate,
        category,
        icon,
        isPaid: false,
      },
    });

    return NextResponse.json(toRecurringObligation(created), { status: 201 });
  } catch (err) {
    console.error("[months.POST] error:", err);
    return NextResponse.json<ApiError>(
      { error: "Failed to add recurring obligation." },
      { status: 500 },
    );
  }
}
