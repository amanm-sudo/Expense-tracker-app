// ─── Category ───────────────────────────────────────────────────────

export type ExpenseCategory =
  | 'Housing'
  | 'Food'
  | 'Transport'
  | 'Leisure'
  | 'Groceries'
  | 'Health'
  | 'Dining'
  | 'Utilities'
  | 'Entertainment'
  | 'Shopping'
  | 'Wellness'
  | 'Other';

// ─── Expense ────────────────────────────────────────────────────────

export interface Expense {
  id: string;
  name: string;
  category: ExpenseCategory;
  categoryIcon: string; // lucide icon name
  description?: string;
  date: string; // ISO date string
  amount: number;
}

// ─── Dashboard ──────────────────────────────────────────────────────

export interface DashboardData {
  remainingBalance: number;
  incomeThisMonth: number;
  expensesTracked: number;
  insightQuote: string;
  insightDescription: string;
  insightProgressPercent: number;
  recentExpenses: Expense[];
}

// ─── Add Expense Form ───────────────────────────────────────────────

export interface AddExpenseFormData {
  amount: string;
  category: ExpenseCategory | '';
  description: string;
  date: string; // ISO date string
}

// ─── Analytics ──────────────────────────────────────────────────────

export interface CategoryStat {
  name: string;
  percentage: number;
}

export interface TrendDataPoint {
  date: string;
  amount: number;
}

export interface CategoryBreakdownItem {
  name: string;
  amount: number;
  color: string;
}

export interface AnalyticsData {
  monthlyNarrative: string;
  highestCategory: CategoryStat;
  lowestCategory: CategoryStat;
  spendingTrend: TrendDataPoint[];
  currentTotal: number;
  percentChangeFromLastMonth: number;
  categoryBreakdown: CategoryBreakdownItem[];
}

// ─── Summary / Month-End ────────────────────────────────────────────

export interface TopCategory {
  name: string;
  description: string;
  amount: number;
  percentage: number;
  cardType: 'light' | 'dark' | 'gray';
  icon?: string;
  subLabel?: string;
  trend?: string;
}

export interface AIPersonalNote {
  greeting: string;
  bodyParagraphs: string[];
  closing: string;
  signature: string;
}

export interface SummaryData {
  month: string;
  totalMonthlySpend: number;
  totalAmountSaved: number;
  topCategories: TopCategory[];
  aiPersonalNote: AIPersonalNote;
}

// ─── Recurring / EMI ────────────────────────────────────────────────

export type RecurringStatus = 'paid' | 'pending';
export type RecurringUrgency = 'scheduled' | 'due-soon';
export type TimeGroup = 'early' | 'mid' | 'late';

export interface RecurringObligation {
  id: string;
  name: string;
  category: string;
  icon: string; // lucide icon name
  dueDay: number;
  amount: number;
  status: RecurringStatus;
  urgency: RecurringUrgency;
  timeGroup: TimeGroup;
}

export interface UpcomingDraft {
  paymentName: string;
  dueDay: number;
  accountEnding: string;
}

export interface QuarterlyOutlook {
  projectedTrend: string;
  efficiencyScore: number;
}

export interface RecurringData {
  monthlyTotal: number;
  obligations: RecurringObligation[];
  upcomingDraft: UpcomingDraft;
  quarterlyOutlook: QuarterlyOutlook;
}

// ─── App State ──────────────────────────────────────────────────────

export type PageView =
  | 'dashboard'
  | 'analytics'
  | 'recurring'
  | 'summary'
  | 'settings';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

// ─── API / Backend Placeholder Types ────────────────────────────────

/** Placeholder: call this to add a new expense to the backend */
export type OnAddExpense = (expense: Omit<Expense, 'id'>) => Promise<Expense>;

/** Placeholder: call this to fetch month data from backend */
export type OnFetchMonthData = (month: string, year: number) => Promise<DashboardData>;

/** Placeholder: call this to get AI insights from backend */
export type OnGetAIInsights = (month: string, year: number) => Promise<AIPersonalNote>;

/** Placeholder: call this to fetch analytics data */
export type OnFetchAnalytics = (month: string, year: number) => Promise<AnalyticsData>;

/** Placeholder: call this to fetch recurring obligations */
export type OnFetchRecurring = () => Promise<RecurringData>;

/** Placeholder: call this to fetch summary data */
export type OnFetchSummary = (month: string, year: number) => Promise<SummaryData>;
