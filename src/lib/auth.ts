import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";
import type { Expense, ExpenseCategory, CreditCategory, EntryType } from "@/types";

/**
 * Returns the authenticated user from the NextAuth session.
 * Throws a 401-style error if no session is found.
 * All API routes call this first to scope data by userId.
 */
export async function getAuthenticatedUser(): Promise<{
  id: string;
  email: string;
  name: string | null;
}> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    throw new AuthError("Not authenticated", 401);
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    throw new AuthError("User not found", 404);
  }

  return { id: user.id, email: user.email, name: user.name };
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

/** Map an ExpenseCategory to a lucide icon name used by the frontend. */
export const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  Housing: "Home",
  Food: "Coffee",
  Transport: "Bus",
  Leisure: "Music",
  Groceries: "ShoppingBag",
  Health: "Heart",
  Dining: "UtensilsCrossed",
  Utilities: "Globe",
  Entertainment: "Monitor",
  Shopping: "ShoppingBag",
  Wellness: "Dumbbell",
  Other: "Receipt",
};

/** Map a CreditCategory to a lucide icon name used by the frontend. */
export const CREDIT_CATEGORY_ICONS: Record<CreditCategory, string> = {
  Salary: "Banknote",
  Freelance: "Laptop",
  Gift: "Gift",
  Refund: "RotateCcw",
  Investment: "TrendingUp",
  Bonus: "Award",
  Other: "CircleDollarSign",
};

/** Palette used for analytics category-breakdown bars (matches design system). */
export const CATEGORY_COLORS: string[] = [
  "#2D3B2D", // sage-dark
  "#A0522D", // terracotta
  "#5C6B5C", // sage-muted
  "#3D3D3D", // near-black
  "#9B9590", // text-muted
  "#8B4513", // rust-dark
  "#4A7C59", // paid-green
];

/** Friendly display labels for grouped category breakdown (analytics page). */
const CATEGORY_GROUP_LABELS: { label: string; cats: ExpenseCategory[] }[] = [
  { label: "Housing & Living", cats: ["Housing", "Utilities"] },
  { label: "Dining & Leisure", cats: ["Dining", "Leisure", "Entertainment"] },
  { label: "Transportation", cats: ["Transport"] },
  { label: "Retail & Shopping", cats: ["Shopping", "Groceries"] },
  { label: "Health & Wellness", cats: ["Health", "Wellness"] },
  { label: "Food", cats: ["Food"] },
  { label: "Other", cats: ["Other"] },
];

export function groupCategoryLabel(category: string): string {
  for (const group of CATEGORY_GROUP_LABELS) {
    if (group.cats.includes(category as ExpenseCategory)) return group.label;
  }
  return category;
}

/** Convert a stored expense row into the frontend `Expense` shape. */
export function toExpense(row: {
  id: string;
  amount: number;
  category: string;
  description: string | null;
  name: string | null;
  date: string;
  type?: string | null;
}): Expense {
  const entryType: EntryType = row.type === 'credit' ? 'credit' : 'expense';
  const category = row.category as ExpenseCategory | CreditCategory;
  const icon =
    entryType === 'credit'
      ? (CREDIT_CATEGORY_ICONS[category as CreditCategory] ?? 'CircleDollarSign')
      : (CATEGORY_ICONS[category as ExpenseCategory] ?? 'Receipt');
  return {
    id: row.id,
    name: row.name || row.description || row.category,
    category,
    categoryIcon: icon,
    description: row.description ?? undefined,
    date: row.date,
    amount: row.amount,
    type: entryType,
  };
}

/** Validate that a string is a "YYYY-MM" month id. */
export function isValidMonthId(monthId: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(monthId);
}

/** Get the previous month id ("YYYY-MM") for comparison analytics. */
export function getPreviousMonthId(monthId: string): string {
  const [yearStr, monthStr] = monthId.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (month === 1) return `${year - 1}-12`;
  return `${year}-${String(month - 1).padStart(2, "0")}`;
}

/** Number of days in a given "YYYY-MM" month. */
export function daysInMonth(monthId: string): number {
  const [year, month] = monthId.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

/** Format a "YYYY-MM" month id as a human label like "January 2024". */
export function formatMonthLabel(monthId: string): string {
  const [year, month] = monthId.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}
