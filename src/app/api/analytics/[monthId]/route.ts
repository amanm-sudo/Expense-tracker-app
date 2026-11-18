import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getAuthenticatedUser,
  AuthError,
  isValidMonthId,
  getPreviousMonthId,
  daysInMonth,
  groupCategoryLabel,
  CATEGORY_COLORS,
} from "@/lib/auth";
import type {
  AnalyticsData,
  CategoryStat,
  CategoryBreakdownItem,
  TrendDataPoint,
  ApiError,
} from "@/types";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Auto-provision a Month row for the given user + monthId. */
async function findOrCreateMonth(userId: string, monthId: string) {
  const existing = await db.month.findUnique({
    where: { userId_monthId: { userId, monthId } },
  });
  if (existing) return existing;
  return db.month.create({ data: { userId, monthId, income: 0 } });
}

// ─── GET /api/analytics/[monthId] ─────────────────────────────────────
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
    const prevMonthId = getPreviousMonthId(monthId);
    const prevMonth = await db.month.findUnique({
      where: { userId_monthId: { userId, monthId: prevMonthId } },
    });

    const [currentExpenses, prevExpenses] = await Promise.all([
      db.expense.findMany({ where: { monthId: month.id } }),
      prevMonth
        ? db.expense.findMany({ where: { monthId: prevMonth.id } })
        : Promise.resolve([]),
    ]);

    // Credits are cash inflows, not spending.
    const spending = currentExpenses.filter((e) => e.type !== "credit");
    const previousSpending = prevExpenses.filter((e) => e.type !== "credit");
    const currentTotal = round2(spending.reduce((sum, e) => sum + e.amount, 0));
    const prevTotal = round2(previousSpending.reduce((sum, e) => sum + e.amount, 0));
    const totalIncome = round2(month.income +
      currentExpenses.filter((e) => e.type === "credit").reduce((s, e) => s + e.amount, 0));

    // ── highestCategory & lowestCategory ────────────────────────────
    const categoryTotals = new Map<string, number>();
    for (const e of spending) {
      categoryTotals.set(
        e.category,
        (categoryTotals.get(e.category) ?? 0) + e.amount,
      );
    }

    let highestCategory: CategoryStat = { name: "None", percentage: 0 };
    let lowestCategory: CategoryStat = { name: "None", percentage: 0 };

    if (currentTotal > 0 && categoryTotals.size > 0) {
      const sorted = [...categoryTotals.entries()].sort(
        (a, b) => b[1] - a[1],
      );
      const highest = sorted[0];
      const lowest = sorted[sorted.length - 1];
      highestCategory = {
        name: highest[0],
        percentage: Math.round((highest[1] / currentTotal) * 100 * 10) / 10,
      };
      lowestCategory = {
        name: lowest[0],
        percentage: Math.round((lowest[1] / currentTotal) * 100 * 10) / 10,
      };
    }

    // ── monthlyNarrative ─────────────────────────────────────────────
    let monthlyNarrative: string;
    if (currentTotal === 0) {
      monthlyNarrative =
        "This month, your journal awaits its first entries — the narrative is yours to write.";
    } else {
      const topGroup = groupCategoryLabel(highestCategory.name);
      monthlyNarrative = `This month, your financial story reflects a shift towards ${topGroup}, with notable emphasis on ${highestCategory.name}.`;
    }

    // ── spendingTrend (cumulative, sampled every ~5 days) ────────────
    let spendingTrend: TrendDataPoint[] = [];
    if (spending.length > 0) {
      const lastDay = daysInMonth(monthId);
      const rawDays = [1, 5, 10, 15, 20, 25, lastDay];
      // de-duplicate in case lastDay collides with a sample day
      const trendDays = [...new Set(rawDays)].sort((a, b) => a - b);
      // Pre-extract day-of-month for each expense once.
      const daySums = spending.map((e) => ({
        day: parseInt(e.date.slice(8, 10), 10),
        amount: e.amount,
      }));
      spendingTrend = trendDays.map((day) => {
        const sum = daySums
          .filter((d) => d.day <= day)
          .reduce((acc, d) => acc + d.amount, 0);
        return {
          date: `${monthId}-${String(day).padStart(2, "0")}`,
          amount: round2(sum),
        };
      });
    }

    // ── percentChangeFromLastMonth ──────────────────────────────────
    let percentChangeFromLastMonth: number;
    if (prevTotal > 0) {
      percentChangeFromLastMonth = Math.round(
        ((currentTotal - prevTotal) / prevTotal) * 100,
      );
    } else if (currentTotal > 0) {
      percentChangeFromLastMonth = 100;
    } else {
      percentChangeFromLastMonth = 0;
    }

    // ── categoryBreakdown (grouped, sorted desc) ────────────────────
    const groupTotals = new Map<string, number>();
    for (const e of spending) {
      const label = groupCategoryLabel(e.category);
      groupTotals.set(label, (groupTotals.get(label) ?? 0) + e.amount);
    }
    const categoryBreakdown: CategoryBreakdownItem[] = [...groupTotals.entries()]
      .map(([name, amount], idx) => ({
        name,
        amount: round2(amount),
        color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
      }))
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    const dayTotals = new Map<string, number>();
    const merchantTotals = new Map<string, number>();
    for (const e of spending) {
      dayTotals.set(e.date, (dayTotals.get(e.date) ?? 0) + e.amount);
      const name = (e.name || e.description || "Other").trim() || "Other";
      merchantTotals.set(name, (merchantTotals.get(name) ?? 0) + e.amount);
    }
    const dailySpending: TrendDataPoint[] = Array.from(
      { length: daysInMonth(monthId) }, (_, day) => {
        const date = monthId + "-" + String(day + 1).padStart(2, "0");
        return { date, amount: round2(dayTotals.get(date) ?? 0) };
      },
    );
    const topMerchants = [...merchantTotals.entries()]
      .map(([name, amount]) => ({ name, amount: round2(amount) }))
      .sort((a, b) => b.amount - a.amount).slice(0, 5);
    const incomeVsExpenses = [
      { name: "Income & credits", amount: totalIncome },
      { name: "Actual spending", amount: currentTotal },
    ];
    const transactionCount = spending.length;

    const body: AnalyticsData = {
      monthlyNarrative,
      highestCategory,
      lowestCategory,
      spendingTrend,
      currentTotal,
      percentChangeFromLastMonth,
      categoryBreakdown,
      dailySpending,
      incomeVsExpenses,
      topMerchants,
      totalIncome,
      transactionCount,
    };

    return NextResponse.json(body);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[analytics.GET] error:", err);
    return NextResponse.json<ApiError>(
      { error: "Failed to compute analytics." },
      { status: 500 },
    );
  }
}
