import type { Loan, LoanRepayment } from "@prisma/client";

export const MAX_LOAN_RUPEES = 10_000_000;

/** Store money in integer paise so partial repayments sum exactly. */
export function toPaise(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const raw = String(value).trim();
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(raw)) return null;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_LOAN_RUPEES) return null;
  const paise = Math.round(amount * 100);
  return Number.isSafeInteger(paise) && paise > 0 ? paise : null;
}

export function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4)), month = Number(value.slice(5, 7)), day = Number(value.slice(8, 10));
  if (year < 2000 || year > 2100) return false;
  const actual = new Date(Date.UTC(year, month - 1, day));
  return actual.getUTCFullYear() === year && actual.getUTCMonth() === month - 1 && actual.getUTCDate() === day;
}

export function validateBorrower(value: unknown): string | null {
  const name = typeof value === "string" ? value.trim() : "";
  return name.length > 0 && name.length <= 120 ? name : null;
}

export type FullLoan = Loan & { repayments: LoanRepayment[] };
export interface LoanView {
  id: string;
  borrower: string;
  principal: number;
  repaid: number;
  outstanding: number;
  lentDate: string;
  dueDate: string | null;
  note: string | null;
  status: "repaid" | "open";
  sourceImportId: string | null;
  repayments: Array<{ id: string; amount: number; repaidDate: string; note: string | null }>;
}

const rupees = (paise: number) => paise / 100;
export function toLoanView(loan: FullLoan): LoanView {
  const repaid = loan.repayments.reduce((sum, r) => sum + r.amountPaisa, 0);
  const outstanding = Math.max(0, loan.principalPaisa - repaid);
  return {
    id: loan.id,
    borrower: loan.borrower,
    principal: rupees(loan.principalPaisa),
    repaid: rupees(repaid),
    outstanding: rupees(outstanding),
    lentDate: loan.lentDate,
    dueDate: loan.dueDate,
    note: loan.note,
    status: outstanding === 0 ? "repaid" : "open",
    sourceImportId: loan.sourceImportId,
    repayments: [...loan.repayments]
      .sort((a, b) => b.repaidDate.localeCompare(a.repaidDate))
      .map((r) => ({ id: r.id, amount: rupees(r.amountPaisa), repaidDate: r.repaidDate, note: r.note })),
  };
}

export function loanMonthSummary(loans: FullLoan[], monthId: string) {
  let lent = 0, repaid = 0, outstanding = 0;
  for (const loan of loans) {
    if (loan.lentDate.startsWith(monthId + "-")) lent += loan.principalPaisa;
    for (const item of loan.repayments) {
      if (item.repaidDate.startsWith(monthId + "-")) repaid += item.amountPaisa;
    }
    outstanding += loan.principalPaisa - loan.repayments.reduce((sum, x) => sum + x.amountPaisa, 0);
  }
  return {
    lent: rupees(lent),
    repaid: rupees(repaid),
    outstanding: rupees(Math.max(0, outstanding)),
  };
}
