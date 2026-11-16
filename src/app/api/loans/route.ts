import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { AuthError, getAuthenticatedUser } from "@/lib/auth";
import { isValidIsoDate, loanMonthSummary, toLoanView, toPaise, validateBorrower } from "@/lib/loans";

/** GET all loans for the authenticated user. */
export async function GET() {
  try {
    const { id: userId } = await getAuthenticatedUser();
    const loans = await db.loan.findMany({
      where: { userId }, include: { repayments: true },
      orderBy: { lentDate: "desc" },
    });
    const outstanding = loans.reduce((sum, loan) =>
      sum + loan.principalPaisa - loan.repayments.reduce((s, r) => s + r.amountPaisa, 0), 0);
    return NextResponse.json({
      items: loans.map(toLoanView),
      totalOutstanding: Math.max(0, outstanding) / 100,
      totalLent: loans.reduce((sum, loan) => sum + loan.principalPaisa, 0) / 100,
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[loans.GET] failed", err instanceof Error ? err.name : "unknown");
    return NextResponse.json({ error: "Unable to load money lent." }, { status: 500 });
  }
}

/** POST a new interest-free receivable; not an ordinary expense. */
export async function POST(req: NextRequest) {
  try {
    const { id: userId } = await getAuthenticatedUser();
    const body: unknown = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }
    const data = body as Record<string, unknown>;
    const borrower = validateBorrower(data.borrower);
    const principalPaisa = toPaise(data.amount);
    if (!borrower || !principalPaisa || !isValidIsoDate(data.lentDate)) {
      return NextResponse.json({ error: "Provide borrower, positive amount, and YYYY-MM-DD lent date." }, { status: 400 });
    }
    const dueDate = data.dueDate === "" || data.dueDate == null ? null : data.dueDate;
    if (dueDate !== null && (!isValidIsoDate(dueDate) || dueDate < data.lentDate)) {
      return NextResponse.json({ error: "Due date must be a valid date on or after the lending date." }, { status: 400 });
    }
    const note = data.note === undefined || data.note === null ? null : data.note;
    if (note !== null && (typeof note !== "string" || note.length > 500)) {
      return NextResponse.json({ error: "Note must be 500 characters or fewer." }, { status: 400 });
    }
    const loan = await db.loan.create({
      data: { userId, borrower, principalPaisa, lentDate: data.lentDate, dueDate, note },
      include: { repayments: true },
    });
    return NextResponse.json(toLoanView(loan), { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[loans.POST] failed", err instanceof Error ? err.name : "unknown");
    return NextResponse.json({ error: "Unable to record money lent." }, { status: 500 });
  }
}
