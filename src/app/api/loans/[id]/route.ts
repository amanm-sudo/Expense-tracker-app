import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { AuthError, getAuthenticatedUser } from "@/lib/auth";

/** Delete a manually entered loan and its linked repayments after user confirmation. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: userId } = await getAuthenticatedUser();
    const { id } = await params;
    const loan = await db.loan.findFirst({ where: { id, userId } });
    if (!loan) return NextResponse.json({ error: "Loan not found." }, { status: 404 });
    if (loan.sourceImportId) {
      return NextResponse.json({ error: "Imported loans cannot be deleted here; contact support for reconciliation." }, { status: 409 });
    }
    await db.loan.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[loans.DELETE] failed", err instanceof Error ? err.name : "unknown");
    return NextResponse.json({ error: "Could not delete the loan." }, { status: 500 });
  }
}
