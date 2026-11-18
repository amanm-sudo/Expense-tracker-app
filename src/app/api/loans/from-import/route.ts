import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { AuthError, getAuthenticatedUser } from "@/lib/auth";
import { toPaise, toLoanView, validateBorrower } from "@/lib/loans";

/**
 * Turns a pending bank debit into a receivable WITHOUT creating an Expense.
 * The existing ImportQueue row is claimed inside the same transaction.
 */
export async function POST(req: NextRequest) {
  try {
    const { id: userId } = await getAuthenticatedUser();
    const data: unknown = await req.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }
    const obj = data as Record<string, unknown>;
    const importId = typeof obj.importId === "string" ? obj.importId : "";
    const borrower = validateBorrower(obj.borrower);
    if (!importId || importId.length > 120 || !borrower) {
      return NextResponse.json({ error: "Import and borrower's name are required." }, { status: 400 });
    }
    const result = await db.$transaction(async (tx) => {
      const item = await tx.importQueue.findFirst({
        where: { id: importId, userId, status: "pending", txnType: "expense" },
      });
      if (!item) return null;
      const amountPaisa = toPaise(item.amount);
      if (!amountPaisa) throw new Error("Invalid import amount.");
      const claimed = await tx.importQueue.updateMany({
        where: { id: item.id, userId, status: "pending" },
        data: { status: "approved" },
      });
      if (claimed.count !== 1) return null;
      const loan = await tx.loan.create({
        data: { userId, borrower, lentDate: item.date, principalPaisa: amountPaisa, sourceImportId: item.id },
        include: { repayments: true },
      });
      return toLoanView(loan);
    });
    if (!result) return NextResponse.json({ error: "Import is no longer pending." }, { status: 409 });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[loans.from-import] failed", err instanceof Error ? err.name : "unknown");
    return NextResponse.json({ error: "Could not move import to Money Lent." }, { status: 500 });
  }
}
