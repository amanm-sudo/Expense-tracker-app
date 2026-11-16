import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AuthError, getAuthenticatedUser } from "@/lib/auth";
import { isValidIsoDate, toPaise, toLoanView } from "@/lib/loans";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: userId } = await getAuthenticatedUser();
    const { id } = await params;
    const body: unknown = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }
    const data = body as Record<string, unknown>;
    const amountPaisa = toPaise(data.amount);
    const repaidDate = data.repaidDate;
    if (!amountPaisa || !isValidIsoDate(repaidDate)) {
      return NextResponse.json({ error: "Provide positive amount and YYYY-MM-DD repayment date." }, { status: 400 });
    }
    const note = data.note === undefined || data.note === null ? null : data.note;
    if (note !== null && (typeof note !== "string" || note.length > 500)) {
      return NextResponse.json({ error: "Invalid repayment note." }, { status: 400 });
    }
    // Serializable isolation prevents concurrent partial repayments exceeding
    // the principal, even when two browser tabs submit simultaneously.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await db.$transaction(async (tx) => {
          const loan = await tx.loan.findFirst({
            where: { id, userId }, include: { repayments: true },
          });
          if (!loan) return { status: 404 as const, message: "Loan not found." };
          if (repaidDate < loan.lentDate) return { status: 400 as const, message: "Repayment cannot precede the lending date." };
          const outstanding = loan.principalPaisa - loan.repayments.reduce((sum, r) => sum + r.amountPaisa, 0);
          if (amountPaisa > outstanding) return { status: 409 as const, message: "Repayment exceeds outstanding balance." };
          await tx.loanRepayment.create({
            data: { loanId: id, amountPaisa, repaidDate, note },
          });
          const updated = await tx.loan.findUniqueOrThrow({
            where: { id }, include: { repayments: true },
          });
          return { status: 200 as const, loan: toLoanView(updated) };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
        if (result.status !== 200) {
          return NextResponse.json({ error: result.message }, { status: result.status });
        }
        return NextResponse.json(result.loan);
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034" && attempt < 2) continue;
        throw err;
      }
    }
    return NextResponse.json({ error: "Please retry the repayment." }, { status: 409 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[loans.repay] failed", err instanceof Error ? err.name : "unknown");
    return NextResponse.json({ error: "Could not save repayment." }, { status: 500 });
  }
}
