import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";
import {
  getAuthenticatedUser,
  isValidMonthId,
  getPreviousMonthId,
  formatMonthLabel,
} from "@/lib/auth";
import type {
  AiInsightsRequest,
  AiInsightsResponse,
  AIPersonalNote,
  ApiError,
} from "@/types";

const SYSTEM_PROMPT =
  "You are a thoughtful financial advisor writing a personal note for the user's wealth journal. You will receive aggregated monthly spending data (no individual transaction details). Respond with valid JSON only, no markdown. The JSON must have this exact shape: { \"note\": { \"greeting\": string, \"bodyParagraphs\": string[3], \"closing\": string, \"signature\": string }, \"suggestions\": string[3-4] }. The note should be warm, personal, and reference the data. Each suggestion should be a specific, actionable optimization tip. Sign as 'Your Wealth Journal'.";

/** Build a graceful fallback note when AI is unavailable. */
function buildFallbackNote(monthLabel: string, totalSpend: number): AiInsightsResponse {
  const note: AIPersonalNote = {
    greeting: "Dear Alex,",
    bodyParagraphs: [
      `As I reviewed your journal for ${monthLabel}, I noticed your recorded spending totalled $${totalSpend.toFixed(
        2,
      )}.`,
      "While the details of each transaction remain private, the patterns you've begun tracking here are already a meaningful act of intentionality.",
      totalSpend > 0
        ? "Consider which categories felt most aligned with your values, and which you might gently adjust in the weeks ahead."
        : "Consider beginning with a single entry this week — small observations compound into clarity over time.",
    ],
    closing: "With care,",
    signature: "Your Wealth Journal",
  };
  return {
    note,
    suggestions: [
      "Review your top spending category and set a small, specific intention for next month.",
      "Schedule a weekly five-minute journaling check-in to keep entries current.",
      "Identify one recurring obligation that may no longer serve you and revisit its terms.",
      "Celebrate the categories where your spending aligned with your priorities.",
    ],
  };
}

/** Try several strategies to extract valid JSON from an LLM response. */
function parseAiResponse(raw: string): AiInsightsResponse | null {
  if (!raw) return null;

  const tryParse = (s: string): AiInsightsResponse | null => {
    try {
      const parsed = JSON.parse(s);
      if (
        parsed &&
        typeof parsed === "object" &&
        parsed.note &&
        typeof parsed.note === "object" &&
        Array.isArray(parsed.note.bodyParagraphs) &&
        Array.isArray(parsed.suggestions)
      ) {
        const note: AIPersonalNote = {
          greeting: String(parsed.note.greeting ?? "Dear Alex,"),
          bodyParagraphs: parsed.note.bodyParagraphs.map(String),
          closing: String(parsed.note.closing ?? "With care,"),
          signature: String(parsed.note.signature ?? "Your Wealth Journal"),
        };
        return {
          note,
          suggestions: parsed.suggestions.map(String),
        };
      }
    } catch {
      /* fall through */
    }
    return null;
  };

  // 1. Direct parse.
  const direct = tryParse(raw);
  if (direct) return direct;

  // 2. Strip markdown fences.
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    const inner = tryParse(fenced[1].trim());
    if (inner) return inner;
  }

  // 3. Extract the first {...} block.
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const sliced = raw.slice(firstBrace, lastBrace + 1);
    const inner = tryParse(sliced);
    if (inner) return inner;
  }

  return null;
}

// ─── POST /api/ai-insights ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { id: userId } = await getAuthenticatedUser();
    const body = (await req.json()) as AiInsightsRequest;
    const { monthId } = body;

    if (typeof monthId !== "string" || !isValidMonthId(monthId)) {
      return NextResponse.json<ApiError>(
        { error: "Invalid or missing monthId. Expected YYYY-MM." },
        { status: 400 },
      );
    }

    const monthLabel = formatMonthLabel(monthId);

    // Auto-provision current month (no-op if already exists).
    let month = await db.month.findUnique({
      where: { userId_monthId: { userId, monthId } },
    });
    if (!month) {
      month = await db.month.create({ data: { userId, monthId, income: 0 } });
    }

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

    // ── Build AGGREGATED data only (no individual descriptions) ──────
    const currentTotal = currentExpenses.reduce((s, e) => s + e.amount, 0);
    const prevTotal = prevExpenses.reduce((s, e) => s + e.amount, 0);

    const categorySums: Record<string, number> = {};
    for (const e of currentExpenses) {
      categorySums[e.category] =
        (categorySums[e.category] ?? 0) + e.amount;
    }

    const sortedCats = Object.entries(categorySums).sort(
      (a, b) => b[1] - a[1],
    );
    const highestCategory = sortedCats[0]
      ? { name: sortedCats[0][0], amount: sortedCats[0][1] }
      : null;
    const lowestCategory = sortedCats[sortedCats.length - 1]
      ? {
          name: sortedCats[sortedCats.length - 1][0],
          amount: sortedCats[sortedCats.length - 1][1],
        }
      : null;

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

    const aggregated = {
      monthId,
      monthLabel,
      totalSpend: Math.round(currentTotal * 100) / 100,
      numberOfExpenses: currentExpenses.length,
      categorySums,
      previousMonthTotal: Math.round(prevTotal * 100) / 100,
      percentChangeFromLastMonth,
      highestCategory,
      lowestCategory,
      monthIncome: month.income,
    };

    // ── Call ZAI ─────────────────────────────────────────────────────
    let aiResult: AiInsightsResponse | null = null;
    try {
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify(aggregated),
          },
        ],
        thinking: { type: "disabled" },
      });

      const rawContent: string =
        completion?.choices?.[0]?.message?.content ?? "";
      aiResult = parseAiResponse(rawContent);
    } catch (aiErr) {
      console.error("[ai-insights] ZAI call failed:", aiErr);
    }

    if (!aiResult) {
      return NextResponse.json(
        buildFallbackNote(monthLabel, currentTotal),
        { status: 200 },
      );
    }

    return NextResponse.json(aiResult);
  } catch (err) {
    console.error("[ai-insights.POST] error:", err);
    // Graceful fallback rather than a hard 500 — AI is a nice-to-have.
    try {
      const body = (await req.json()) as AiInsightsRequest;
      const monthId = body?.monthId;
      const monthLabel =
        typeof monthId === "string" && isValidMonthId(monthId)
          ? formatMonthLabel(monthId)
          : "this month";
      return NextResponse.json(buildFallbackNote(monthLabel, 0), {
        status: 200,
      });
    } catch {
      return NextResponse.json<ApiError>(
        { error: "Failed to generate AI insights." },
        { status: 500 },
      );
    }
  }
}
