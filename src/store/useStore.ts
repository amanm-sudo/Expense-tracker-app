'use client';

import { create } from 'zustand';
import type {
  Expense,
  ExpenseCategory,
  DashboardData,
  AnalyticsData,
  RecurringData,
  SummaryData,
  AddExpenseFormData,
  Toast,
  PageView,
  AIPersonalNote,
  MonthDataResponse,
  AiInsightsResponse,
  MonthId,
} from '@/types';

// ─── Month label ⇄ monthId helpers ──────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Convert "January 2024" → "2024-01" */
export function labelToMonthId(label: string): MonthId {
  const match = label.match(/^(\w+)\s+(\d{4})$/);
  if (match) {
    const idx = MONTH_NAMES.indexOf(match[1]);
    if (idx >= 0) return `${match[2]}-${String(idx + 1).padStart(2, '0')}`;
  }
  // Fallback to current month
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Convert "2024-01" → "January 2024" */
export function monthIdToLabel(monthId: MonthId): string {
  const [yearStr, monthStr] = monthId.split('-');
  const year = parseInt(yearStr, 10);
  const monthIdx = parseInt(monthStr, 10) - 1;
  if (yearStr && monthIdx >= 0 && monthIdx < 12) {
    return `${MONTH_NAMES[monthIdx]} ${year}`;
  }
  return MONTH_NAMES[new Date().getMonth()] + ' ' + new Date().getFullYear();
}

/** Derive a monthId from any of: a label "January 2024", a monthId "2024-01", or a month name + year. */
function deriveMonthId(month: string, year?: number): MonthId {
  if (/^\d{4}-\d{2}$/.test(month)) return month;
  return labelToMonthId(month);
}

/** Format the current date as a "Month Year" label. */
function currentMonthLabel(): string {
  const now = new Date();
  return `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
}

// ─── Demo Data (used as initial state so UI renders before fetch) ───

const demoRecentExpenses: Expense[] = [
  {
    id: '1',
    name: 'Blue Bottle Coffee',
    category: 'Food',
    categoryIcon: 'Coffee',
    description: 'Morning coffee run',
    date: '2024-01-12',
    amount: 6.5,
  },
  {
    id: '2',
    name: 'Apartment Rent',
    category: 'Housing',
    categoryIcon: 'Home',
    description: 'Monthly rent payment',
    date: '2024-01-01',
    amount: 1800.0,
  },
  {
    id: '3',
    name: 'Whole Foods',
    category: 'Groceries',
    categoryIcon: 'ShoppingBag',
    description: 'Weekly groceries',
    date: '2024-01-10',
    amount: 142.1,
  },
];

const demoDashboard: DashboardData = {
  remainingBalance: 4250.0,
  incomeThisMonth: 8000.0,
  expensesTracked: 3750.0,
  insightQuote: '"Wealth is the ability to fully experience life."',
  insightDescription: "You've saved 12% more than last month. Keep the narrative strong.",
  insightProgressPercent: 60,
  recentExpenses: demoRecentExpenses,
};

const demoAnalytics: AnalyticsData = {
  monthlyNarrative:
    'This month, your financial story reflects a shift towards essential stability, with a notable emphasis on long-term home investments.',
  highestCategory: { name: 'Housing', percentage: 42 },
  lowestCategory: { name: 'Health', percentage: 2.4 },
  spendingTrend: [
    { date: '2024-01-01', amount: 1800 },
    { date: '2024-01-05', amount: 2100 },
    { date: '2024-01-10', amount: 2250 },
    { date: '2024-01-15', amount: 3100 },
    { date: '2024-01-20', amount: 3450 },
    { date: '2024-01-25', amount: 4100 },
    { date: '2024-01-31', amount: 4822.4 },
  ],
  currentTotal: 4822.4,
  percentChangeFromLastMonth: 8,
  categoryBreakdown: [
    { name: 'Housing & Living', amount: 2025, color: '#2D3B2D' },
    { name: 'Dining & Leisure', amount: 850, color: '#A0522D' },
    { name: 'Transportation', amount: 420, color: '#5C6B5C' },
    { name: 'Retail & Shopping', amount: 380, color: '#3D3D3D' },
    { name: 'Utilities', amount: 210, color: '#9B9590' },
  ],
};

const demoRecurring: RecurringData = {
  monthlyTotal: 140.99,
  obligations: [
    {
      id: 'r1',
      name: 'Gym Membership',
      category: 'Health & Wellness',
      icon: 'Dumbbell',
      dueDay: 5,
      amount: 50.0,
      status: 'paid',
      urgency: 'scheduled',
      timeGroup: 'early',
    },
    {
      id: 'r2',
      name: 'Netflix',
      category: 'Entertainment',
      icon: 'Monitor',
      dueDay: 12,
      amount: 15.99,
      status: 'paid',
      urgency: 'scheduled',
      timeGroup: 'mid',
    },
    {
      id: 'r3',
      name: 'Internet',
      category: 'Utilities',
      icon: 'Globe',
      dueDay: 20,
      amount: 75.0,
      status: 'pending',
      urgency: 'due-soon',
      timeGroup: 'late',
    },
  ],
  upcomingDraft: {
    paymentName: 'Internet',
    dueDay: 20,
    accountEnding: '4492',
  },
  quarterlyOutlook: {
    projectedTrend: '4% lower than Q4 2023',
    efficiencyScore: 75,
  },
};

const demoSummary: SummaryData = {
  month: 'January 2024',
  totalMonthlySpend: 4285.0,
  totalAmountSaved: 1850.42,
  topCategories: [
    {
      name: 'Shelter & Living',
      description: 'The foundation of your monthly narrative.',
      amount: 1200,
      percentage: 60,
      cardType: 'light',
      subLabel: 'Rent/Mortgage',
    },
    {
      name: 'Dining Out',
      description: '',
      amount: 642,
      percentage: 0,
      cardType: 'dark',
      icon: 'UtensilsCrossed',
      trend: '+12% from last month',
    },
    {
      name: 'Transit',
      description: '',
      amount: 310,
      percentage: 0,
      cardType: 'light',
      icon: 'Bus',
    },
    {
      name: 'Other Essentials',
      description:
        'Subscriptions, utilities, and minor groceries made up the remainder of your story this month.',
      amount: 0,
      percentage: 18,
      cardType: 'gray',
    },
  ],
  aiPersonalNote: {
    greeting: 'Dear Alex,',
    bodyParagraphs: [
      "As I reviewed your journal for January, I couldn't help but notice how beautifully you've balanced your priorities. You managed to keep your leisure spending remarkably disciplined—nearly 15% lower than your seasonal average.",
      'While the increase in dining out suggests a month filled with social connection, your consistent contribution to your savings narrative remains the highlight. You are writing a story of true stability.',
      'Keep focused on the upcoming quarter; the small seeds you planted this month in your recurring accounts will likely bloom into significant security by spring.',
    ],
    closing: 'With care,',
    signature: 'Your Wealth Journal',
  },
};

// ─── Store Interface ────────────────────────────────────────────────

interface AppState {
  // Navigation
  currentPage: PageView;
  setCurrentPage: (page: PageView) => void;

  // Date selection (stored as label "Month Year")
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  /** Derive the current "YYYY-MM" monthId from selectedMonth. */
  getSelectedMonthId: () => MonthId;

  // Add expense modal
  isAddExpenseOpen: boolean;
  openAddExpense: () => void;
  closeAddExpense: () => void;

  // Dashboard data
  dashboard: DashboardData;
  addExpense: (expense: Expense) => void;

  // Analytics data
  analytics: AnalyticsData;

  // Recurring data
  recurring: RecurringData;

  // Summary data
  summary: SummaryData;

  // Loading states
  loading: Record<string, boolean>;
  setLoading: (key: string, value: boolean) => void;

  // Toasts
  toasts: Toast[];
  addToast: (message: string, type: Toast['type']) => void;
  removeToast: (id: string) => void;

  // Backend integration
  onAddExpense: (formData: AddExpenseFormData) => Promise<void>;
  onFetchMonthData: (month: string, year: number) => Promise<void>;
  onGetAIInsights: (month: string, year: number) => Promise<AIPersonalNote | null>;
  onFetchAnalytics: (month: string, year: number) => Promise<void>;
  onFetchRecurring: () => Promise<void>;
  onFetchSummary: (month: string, year: number) => Promise<void>;
  refreshAll: () => Promise<void>;
  setIncome: (income: number) => Promise<void>;
}

// ─── Helper ─────────────────────────────────────────────────────────

let toastIdCounter = 0;

// ─── Store ──────────────────────────────────────────────────────────

export const useStore = create<AppState>((set, get) => ({
  // Navigation
  currentPage: 'dashboard',
  setCurrentPage: (page) => set({ currentPage: page }),

  // Date — default to current month label
  selectedMonth: currentMonthLabel(),
  setSelectedMonth: (month) => set({ selectedMonth: month }),
  getSelectedMonthId: () => labelToMonthId(get().selectedMonth),

  // Modal
  isAddExpenseOpen: false,
  openAddExpense: () => set({ isAddExpenseOpen: true }),
  closeAddExpense: () => set({ isAddExpenseOpen: false }),

  // Data — demo defaults so UI renders immediately
  dashboard: demoDashboard,
  analytics: demoAnalytics,
  recurring: demoRecurring,
  summary: demoSummary,

  // Actions
  addExpense: (expense) =>
    set((state) => ({
      dashboard: {
        ...state.dashboard,
        expensesTracked: state.dashboard.expensesTracked + expense.amount,
        remainingBalance: state.dashboard.remainingBalance - expense.amount,
        recentExpenses: [expense, ...state.dashboard.recentExpenses].slice(0, 10),
      },
    })),

  // Loading
  loading: {},
  setLoading: (key, value) =>
    set((state) => ({
      loading: { ...state.loading, [key]: value },
    })),

  // Toasts
  toasts: [],
  addToast: (message, type) => {
    const id = `toast-${++toastIdCounter}`;
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    setTimeout(() => {
      get().removeToast(id);
    }, 5000);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  // ─── Backend integration ────────────────────────────────────────

  onAddExpense: async (formData) => {
    const { amount, category, description, date } = formData;
    if (!amount || !category) {
      get().addToast('Amount and category are required', 'error');
      throw new Error('Amount and category are required');
    }

    const monthId = labelToMonthId(get().selectedMonth);

    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthId,
          amount: parseFloat(amount),
          category: category as ExpenseCategory,
          description,
          date,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to record entry');
      }

      const newExpense = (await response.json()) as Expense;

      // Merge into dashboard state
      set((state) => ({
        dashboard: {
          ...state.dashboard,
          expensesTracked: state.dashboard.expensesTracked + newExpense.amount,
          remainingBalance: state.dashboard.remainingBalance - newExpense.amount,
          recentExpenses: [newExpense, ...state.dashboard.recentExpenses].slice(0, 10),
        },
      }));

      get().addToast('Entry recorded successfully', 'success');
      get().closeAddExpense();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to record entry';
      get().addToast(message, 'error');
      throw err;
    }
  },

  onFetchMonthData: async (month, _year) => {
    set((state) => ({ loading: { ...state.loading, dashboard: true } }));
    try {
      const monthId = deriveMonthId(month, _year);
      const response = await fetch(`/api/months/${monthId}`);
      if (!response.ok) throw new Error('Failed to load month data');
      const data = (await response.json()) as MonthDataResponse;

      const totalExpenses = data.expenses.reduce((sum, e) => sum + e.amount, 0);
      const income = data.income || 0;
      const recent = [...data.expenses]
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 10);

      // Progress percent: ratio of remaining balance to income (clamped 0-100)
      const progressPercent = income > 0
        ? Math.max(0, Math.min(100, Math.round(((income - totalExpenses) / income) * 100)))
        : 0;

      set((state) => ({
        dashboard: {
          ...state.dashboard,
          remainingBalance: income - totalExpenses,
          incomeThisMonth: income,
          expensesTracked: totalExpenses,
          recentExpenses: recent,
          insightProgressPercent: progressPercent || state.dashboard.insightProgressPercent,
        },
        loading: { ...state.loading, dashboard: false },
      }));
    } catch (err) {
      // Background fetch failure — keep existing (demo) state, don't toast noise.
      console.error('[onFetchMonthData] failed:', err);
      set((state) => ({ loading: { ...state.loading, dashboard: false } }));
    }
  },

  onGetAIInsights: async (month, _year) => {
    set((state) => ({ loading: { ...state.loading, insights: true } }));
    try {
      const monthId = deriveMonthId(month, _year);
      const response = await fetch('/api/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthId }),
      });
      if (!response.ok) throw new Error('Failed to generate insights');
      const data = (await response.json()) as AiInsightsResponse;

      set((state) => ({
        summary: {
          ...state.summary,
          aiPersonalNote: data.note,
        },
        loading: { ...state.loading, insights: false },
      }));
      return data.note;
    } catch (err) {
      console.error('[onGetAIInsights] failed:', err);
      set((state) => ({ loading: { ...state.loading, insights: false } }));
      return get().summary.aiPersonalNote;
    }
  },

  onFetchAnalytics: async (month, _year) => {
    set((state) => ({ loading: { ...state.loading, analytics: true } }));
    try {
      const monthId = deriveMonthId(month, _year);
      const response = await fetch(`/api/analytics/${monthId}`);
      if (!response.ok) throw new Error('Failed to load analytics');
      const data = (await response.json()) as AnalyticsData;
      set((state) => ({
        analytics: data,
        loading: { ...state.loading, analytics: false },
      }));
    } catch (err) {
      console.error('[onFetchAnalytics] failed:', err);
      set((state) => ({ loading: { ...state.loading, analytics: false } }));
    }
  },

  onFetchRecurring: async () => {
    set((state) => ({ loading: { ...state.loading, recurring: true } }));
    try {
      const monthId = labelToMonthId(get().selectedMonth);
      const response = await fetch(`/api/recurring/${monthId}`);
      if (!response.ok) throw new Error('Failed to load recurring obligations');
      const data = (await response.json()) as RecurringData;
      set((state) => ({
        recurring: data,
        loading: { ...state.loading, recurring: false },
      }));
    } catch (err) {
      console.error('[onFetchRecurring] failed:', err);
      set((state) => ({ loading: { ...state.loading, recurring: false } }));
    }
  },

  onFetchSummary: async (month, _year) => {
    set((state) => ({ loading: { ...state.loading, summary: true } }));
    try {
      const monthId = deriveMonthId(month, _year);
      const response = await fetch(`/api/summary/${monthId}`);
      if (!response.ok) throw new Error('Failed to load summary');
      const data = (await response.json()) as SummaryData;
      set((state) => ({
        summary: data,
        loading: { ...state.loading, summary: false },
      }));
    } catch (err) {
      console.error('[onFetchSummary] failed:', err);
      set((state) => ({ loading: { ...state.loading, summary: false } }));
    }
  },

  refreshAll: async () => {
    const { selectedMonth, onFetchMonthData, onFetchAnalytics, onFetchRecurring, onFetchSummary } = get();
    // Derive year from label for the (month, year) signature
    const match = selectedMonth.match(/^(\w+)\s+(\d{4})$/);
    const year = match ? parseInt(match[2], 10) : new Date().getFullYear();
    await Promise.all([
      onFetchMonthData(selectedMonth, year),
      onFetchAnalytics(selectedMonth, year),
      onFetchRecurring(),
      onFetchSummary(selectedMonth, year),
    ]);
  },

  setIncome: async (income) => {
    const monthId = labelToMonthId(get().selectedMonth);
    try {
      const response = await fetch(`/api/months/${monthId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ income }),
      });
      if (!response.ok) throw new Error('Failed to update income');
      set((state) => ({
        dashboard: {
          ...state.dashboard,
          incomeThisMonth: income,
          remainingBalance: income - state.dashboard.expensesTracked,
        },
      }));
      get().addToast('Income updated', 'success');
    } catch {
      get().addToast('Failed to update income', 'error');
    }
  },
}));
