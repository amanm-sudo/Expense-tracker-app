import { db } from "@/lib/db";
import type { Expense, ExpenseCategory } from "@/types";

/**
 * Simplified auth helper.
 *
 * In a production Supabase deployment this would resolve the authenticated
 * user from the Supabase session and enforce Row-Level-Security. For this
 * single-user personal tracker demo we resolve a stable demo user (created
 * on first access) so every API route can scope data by `userId`.
 */
const DEMO_USER_ID = process.env.DEMO_USER_ID || "demo-user-wealth-journal";
const DEMO_EMAIL = "journal@wealth.local";
const DEMO_NAME = "Alex";

/** Returns the active user's id, creating the demo user if needed. */
export async function getAuthenticatedUser(): Promise<{
  id: string;
  email: string;
  name: string | null;
}> {
  let user = await db.user.findUnique({ where: { id: DEMO_USER_ID } });
  if (!user) {
    user = await db.user.create({
      data: { id: DEMO_USER_ID, email: DEMO_EMAIL, name: DEMO_NAME },
    });
  }
  return { id: user.id, email: user.email, name: user.name };
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
}): Expense {
  const category = row.category as ExpenseCategory;
  return {
    id: row.id,
    name: row.name || row.description || row.category,
    category,
    categoryIcon: CATEGORY_ICONS[category] ?? "Receipt",
    description: row.description ?? undefined,
    date: row.date,
    amount: row.amount,
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
