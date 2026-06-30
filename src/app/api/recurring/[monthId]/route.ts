import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser, AuthError, isValidMonthId } from "@/lib/auth";
import type {
  RecurringData,
  RecurringObligation,
  UpcomingDraft,
  QuarterlyOutlook,
  ApiError,
} from "@/types";

const round2 = (n: number) => Math.round(n * 100) / 100;

function timeGroupForDueDate(dueDate: number): "early" | "mid" | "late" {
  if (dueDate <= 10) return "early";
  if (dueDate <= 20) return "mid";
  return "late";
}

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

async function findOrCreateMonth(userId: string, monthId: string) {
  const existing = await db.month.findUnique({
    where: { userId_monthId: { userId, monthId } },
  });
  if (existing) return existing;
  return db.month.create({ data: { userId, monthId, income: 0 } });
}

// ─── GET /api/recurring/[monthId] ────────────────────────────────────
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
    const emis = await db.emi.findMany({
      where: { monthId: month.id },
      orderBy: { dueDate: "asc" },
    });

    const obligations = emis.map(toRecurringObligation);
    const monthlyTotal = round2(
      emis.reduce((sum, e) => sum + e.amount, 0),
    );

    // ── upcomingDraft: nearest upcoming pending (or first pending; or first emi)
    let upcomingDraft: UpcomingDraft;
    if (emis.length === 0) {
      upcomingDraft = {
        paymentName: "No scheduled payment",
        dueDay: 0,
        accountEnding: "4492",
      };
    } else {
      const pending = emis.filter((e) => !e.isPaid);
      const pickFrom =
        pending.length > 0
          ? [...pending].sort(
              (a, b) =>
                nextOccurrence(a.dueDate).getTime() -
                nextOccurrence(b.dueDate).getTime(),
            )
          : emis;
      const chosen = pickFrom[0];
      upcomingDraft = {
        paymentName: chosen.name,
        dueDay: chosen.dueDate,
        accountEnding: "4492",
      };
    }

    // ── quarterlyOutlook ─────────────────────────────────────────────
    const paidCount = emis.filter((e) => e.isPaid).length;
    const efficiencyScore =
      emis.length === 0 ? 0 : Math.round((paidCount / emis.length) * 100);

    let projectedTrend: string;
    if (efficiencyScore >= 75) {
      projectedTrend = "on track, 3% lower than last quarter";
    } else if (efficiencyScore >= 50) {
      projectedTrend = "stable, consistent with last quarter";
    } else {
      projectedTrend = "elevated, review pending obligations";
    }

    const quarterlyOutlook: QuarterlyOutlook = {
      projectedTrend,
      efficiencyScore,
    };

    const body: RecurringData = {
      monthlyTotal,
      obligations,
      upcomingDraft,
      quarterlyOutlook,
    };

    return NextResponse.json(body);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[recurring.GET] error:", err);
    return NextResponse.json<ApiError>(
      { error: "Failed to load recurring data." },
      { status: 500 },
    );
  }
}
