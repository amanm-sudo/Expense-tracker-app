import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getAuthenticatedUser,
  AuthError,
  isValidMonthId,
  getPreviousMonthId,
  formatMonthLabel,
  CATEGORY_ICONS,
} from "@/lib/auth";
import type {
  SummaryData,
  TopCategory,
  AIPersonalNote,
  ExpenseCategory,
  ApiError,
} from "@/types";

const round2 = (n: number) => Math.round(n * 100) / 100;

async function findOrCreateMonth(userId: string, monthId: string) {
  const existing = await db.month.findUnique({
    where: { userId_monthId: { userId, monthId } },
  });
  if (existing) return existing;
  return db.month.create({ data: { userId, monthId, income: 0 } });
}

// ─── GET /api/summary/[monthId] ───────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ monthId: string }> },
) {
  try {
    const { id: userId, name: userName } = await getAuthenticatedUser();
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

    // Separate credits from regular expenses
    const totalMonthlySpend = round2(
      currentExpenses
        .filter((e) => e.type !== 'credit')
        .reduce((s, e) => s + e.amount, 0),
    );
    const totalCredits = round2(
      currentExpenses
        .filter((e) => e.type === 'credit')
        .reduce((s, e) => s + e.amount, 0),
    );
    const income = month.income;
    // Saved = income + credits received - money spent
    const totalAmountSaved =
      income > 0 ? round2(income + totalCredits - totalMonthlySpend) : 0;

    // ── Per-category totals (this month + previous month for trend) ──
    const categoryTotals = new Map<string, number>();
    for (const e of currentExpenses.filter((e) => e.type !== 'credit')) {
      categoryTotals.set(
        e.category,
        (categoryTotals.get(e.category) ?? 0) + e.amount,
      );
    }
    const prevCategoryTotals = new Map<string, number>();
    for (const e of prevExpenses) {
      prevCategoryTotals.set(
        e.category,
        (prevCategoryTotals.get(e.category) ?? 0) + e.amount,
      );
    }

    const sortedCategories = [...categoryTotals.entries()].sort(
      (a, b) => b[1] - a[1],
    );

    // ── topCategories ────────────────────────────────────────────────
    let topCategories: TopCategory[];
    let topCategoryName = "";

    if (totalMonthlySpend === 0 || sortedCategories.length === 0) {
      // Empty-state array
      topCategories = [
        {
          name: "Awaiting your story",
          description:
            "Once you begin logging expenses, your top categories will appear here as the foundation of your monthly narrative.",
          amount: 0,
          percentage: 0,
          cardType: "gray",
        },
      ];
    } else {
      // Category percentages are relative to spend-only total (excluding credits)
      const total = totalMonthlySpend;
      const pct = (amt: number) => Math.round((amt / total) * 100);

      const built: TopCategory[] = [];

      // Top 3 by spend
      const top3 = sortedCategories.slice(0, 3);

      top3.forEach((entry, idx) => {
        const [catName, catTotal] = entry;
        const cat = catName as ExpenseCategory;
        const amount = round2(catTotal);
        const percentage = pct(catTotal);

        if (idx === 0) {
          // 1st — light card, subLabel = category name
          topCategoryName = catName;
          built.push({
            name: "Top Category",
            description: "The foundation of your monthly narrative.",
            amount,
            percentage,
            cardType: "light",
            subLabel: catName,
          });
        } else if (idx === 1) {
          // 2nd — dark card with icon + trend (vs prev month, same category)
          const icon = CATEGORY_ICONS[cat] ?? "Receipt";
          const prevCatTotal = prevCategoryTotals.get(catName) ?? 0;
          const card: TopCategory = {
            name: catName,
            description:
              "A meaningful secondary thread in your spending composition.",
            amount,
            percentage,
            cardType: "dark",
            icon,
          };
          if (prevCatTotal > 0) {
            const change = Math.round(
              ((catTotal - prevCatTotal) / prevCatTotal) * 100,
            );
            card.trend = `${change >= 0 ? "+" : ""}${change}% from last month`;
          }
          built.push(card);
        } else {
          // 3rd — light card with icon
          const icon = CATEGORY_ICONS[cat] ?? "Receipt";
          built.push({
            name: catName,
            description:
              "Another steady presence in your monthly composition.",
            amount,
            percentage,
            cardType: "light",
            icon,
          });
        }
      });

      // Remainder card — "Other Essentials"
      const top3Sum = top3.reduce((s, e) => s + e[1], 0);
      const remainder = total - top3Sum;
      built.push({
        name: "Other Essentials",
        description:
          "Subscriptions, utilities, and minor expenses made up the remainder of your story this month.",
        amount: 0,
        percentage: pct(Math.max(remainder, 0)),
        cardType: "gray",
      });

      topCategories = built;
    }

    // ── aiPersonalNote (default, NOT calling the AI endpoint) ────────
    const monthLabel = formatMonthLabel(monthId);
    const aiPersonalNote: AIPersonalNote = {
      greeting: `Dear ${userName || 'Friend'},`,
      bodyParagraphs: [
        `As I reviewed your journal for ${monthLabel}, I noticed your spending gravitated most toward ${
          topCategoryName || "essentials"
        }.`,
        totalAmountSaved > 0
          ? `You saved $${totalAmountSaved.toFixed(
              2,
            )} this month — a quiet but meaningful margin of intentionality worth honouring.`
          : `While savings remained modest this month, every entry you logged is itself a form of clarity that compounds over time.`,
        `As you turn the page to next month, consider carrying forward the patterns that aligned with your values and gently adjusting those that did not.`,
      ],
      closing: "With care,",
      signature: "Your Wealth Journal",
    };

    const body: SummaryData = {
      month: monthLabel,
      totalMonthlySpend,
      totalAmountSaved,
      topCategories,
      aiPersonalNote,
    };

    return NextResponse.json(body);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[summary.GET] error:", err);
    return NextResponse.json<ApiError>(
      { error: "Failed to compute summary." },
      { status: 500 },
    );
  }
}
