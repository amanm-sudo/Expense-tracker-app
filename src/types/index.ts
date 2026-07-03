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

export type CreditCategory =
  | 'Salary'
  | 'Freelance'
  | 'Gift'
  | 'Refund'
  | 'Investment'
  | 'Bonus'
  | 'Other';

export type EntryType = 'expense' | 'credit';

// ─── Expense ────────────────────────────────────────────────────────

export interface Expense {
  id: string;
  name: string;
  category: ExpenseCategory | CreditCategory;
  categoryIcon: string; // lucide icon name
  description?: string;
  date: string; // ISO date string
  amount: number;
  type: EntryType; // 'expense' | 'credit'
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
  category: ExpenseCategory | CreditCategory | '';
  description: string;
  date: string; // ISO date string
  type: EntryType;
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

// ─── API Request / Response Payloads ────────────────────────────────

/** Month identifier in "YYYY-MM" format */
export type MonthId = string;

/** Response shape for GET /api/months/[monthId] */
export interface MonthDataResponse {
  monthId: MonthId;
  income: number;
  expenses: Expense[];
  emis: RecurringObligation[];
}

/** Body for POST /api/expenses */
export interface CreateExpensePayload {
  monthId: MonthId;
  amount: number;
  category: ExpenseCategory | CreditCategory;
  description?: string;
  date: string;
  type?: EntryType;
}

/** Body for PATCH /api/expenses/[id] */
export interface UpdateExpensePayload {
  amount?: number;
  category?: ExpenseCategory | CreditCategory;
  description?: string;
  date?: string;
  type?: EntryType;
}

/** Body for PATCH /api/months/[monthId] (set income) */
export interface SetIncomePayload {
  income: number;
}

/** Body for POST /api/months/[monthId] (add EMI) */
export interface AddEmiPayload {
  name: string;
  amount: number;
  dueDate: number;
  category?: string;
  icon?: string;
}

/** Body for POST /api/ai-insights */
export interface AiInsightsRequest {
  monthId: MonthId;
}

/** Response shape for POST /api/ai-insights */
export interface AiInsightsResponse {
  note: AIPersonalNote;
  suggestions: string[];
}

/** Standard error response */
export interface ApiError {
  error: string;
}
