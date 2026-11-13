import type { ImportQueue, Prisma } from "@prisma/client";
import { CREDIT_CATEGORIES, EXPENSE_CATEGORIES } from "./categorizer";

export interface ImportOverride {
  category?: string;
  name?: string;
}
const expenseCats = new Set<string>(EXPENSE_CATEGORIES);
const creditCats = new Set<string>(CREDIT_CATEGORIES);

/** Claim + write + link in the caller's database transaction. Claiming the
 * pending row first ensures concurrent approvals never duplicate expenses.
 */
export async function approveImportedTransaction(
  tx: Prisma.TransactionClient,
  item: ImportQueue,
  userId: string,
  override: ImportOverride = {},
  learnRule = false,
): Promise<string | null> {
  const claimed = await tx.importQueue.updateMany({
    where: { id: item.id, userId, status: "pending" },
    data: { status: "approved" },
  });
  if (claimed.count !== 1) return null;

  const allowed = item.txnType === "credit" ? creditCats : expenseCats;
  const category = typeof override.category === "string" && allowed.has(override.category)
    ? override.category : allowed.has(item.suggestedCat) ? item.suggestedCat : "Other";
  const suppliedName = typeof override.name === "string" ? override.name.trim().slice(0, 120) : "";
  const name = suppliedName || item.merchant || item.suggestedCat;
  const monthId = item.date.slice(0, 7);

  const month = await tx.month.upsert({
    where: { userId_monthId: { userId, monthId } },
    update: {},
    create: { userId, monthId, income: 0 },
  });
  const expense = await tx.expense.create({
    data: {
      monthId: month.id, amount: item.amount, category,
      description: item.vpa ?? item.merchant ?? undefined,
      name, date: item.date, type: item.txnType,
    },
  });
  await tx.importQueue.update({
    where: { id: item.id }, data: { expenseId: expense.id },
  });

  if (learnRule && override.category && override.category !== item.suggestedCat &&
      allowed.has(override.category)) {
    const pattern = item.vpa
      ? item.vpa.split("@")[0].toLowerCase().replace(/\d+$/, "")
      : (item.merchant ?? "").toLowerCase();
    if (pattern) {
      await tx.merchantRule.upsert({
        where: { userId_pattern: { userId, pattern } },
        update: { category: override.category },
        create: { userId, pattern, category: override.category },
      });
    }
  }
  return expense.id;
}
