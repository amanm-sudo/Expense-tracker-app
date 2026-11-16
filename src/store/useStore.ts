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
  EntryType,
  ImportQueueItem,
  ImportQueueResponse,
  ImportTokenResponse,
  ApprovePayload,
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

// ─── Neutral initial state: never show fictional financial data ─────
const emptyDashboard: DashboardData = {
  remainingBalance: 0,
  incomeThisMonth: 0,
  expensesTracked: 0,
  insightQuote: '"Wealth is the ability to fully experience life."',
  insightDescription: 'Your monthly financial figures will appear once your journal loads.',
  insightProgressPercent: 0,
  recentExpenses: [],
  loansOutstanding: 0,
  lentThisMonth: 0,
  repaidThisMonth: 0,
};

const emptyAnalytics: AnalyticsData = {
  dailySpending: [],
  incomeVsExpenses: [],
  topMerchants: [],
  totalIncome: 0,
  transactionCount: 0,
  monthlyNarrative: '',
  highestCategory: { name: 'None', percentage: 0 },
  lowestCategory: { name: 'None', percentage: 0 },
  spendingTrend: [],
  currentTotal: 0,
  percentChangeFromLastMonth: 0,
  categoryBreakdown: [],
};

const emptyRecurring: RecurringData = {
  monthlyTotal: 0,
  obligations: [],
  upcomingDraft: { paymentName: '', dueDay: 1, accountEnding: '' },
  quarterlyOutlook: { projectedTrend: '', efficiencyScore: 0 },
};

const emptySummary: SummaryData = {
  month: '',
  totalMonthlySpend: 0,
  totalAmountSaved: 0,
  topCategories: [],
  aiPersonalNote: { greeting: '', bodyParagraphs: [], closing: '', signature: '' },
};

// ─── Store Interface ────────────────────────────────────────────────

interface AppState {
  // Navigation
  currentPage: PageView;
  setCurrentPage: (page: PageView) => void;

  // User profile (seeded from NextAuth session)
  userName: string;
  userEmail: string;
  setUserProfile: (name: string, email: string) => void;
  updateUserName: (name: string) => Promise<void>;

  // Date selection (stored as label "Month Year")
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  /** Derive the current "YYYY-MM" monthId from selectedMonth. */
  getSelectedMonthId: () => MonthId;

  // Add expense modal
  isAddExpenseOpen: boolean;
  openAddExpense: () => void;
  closeAddExpense: () => void;

  // Edit expense modal
  editingExpense: Expense | null;
  openEditExpense: (expense: Expense) => void;
  closeEditExpense: () => void;

  // Dashboard data
  dashboard: DashboardData;
  addExpense: (expense: Expense) => void;
  deleteExpense: (expenseId: string) => Promise<void>;

  // Analytics data
  analytics: AnalyticsData;

  // Recurring data
  recurring: RecurringData;

  // Summary data
  summary: SummaryData;

  // Track which month has actually been fetched for each financial page.
  // Prevents briefly displaying another month's values on navigation.
  loadedMonths: Record<string, string>;
  dataErrors: Record<string, string | undefined>;

  // Loading states
  loading: Record<string, boolean>;
  setLoading: (key: string, value: boolean) => void;

  // Toasts
  toasts: Toast[];
  addToast: (message: string, type: Toast['type']) => void;
  removeToast: (id: string) => void;

  // Backend integration
  onAddExpense: (formData: AddExpenseFormData) => Promise<void>;
  onEditExpense: (expenseId: string, formData: AddExpenseFormData) => Promise<void>;
  onFetchMonthData: (month: string, year: number) => Promise<void>;
  onGetAIInsights: (month: string, year: number) => Promise<AIPersonalNote | null>;
  onFetchAnalytics: (month: string, year: number) => Promise<void>;
  onFetchRecurring: () => Promise<void>;
  onFetchSummary: (month: string, year: number) => Promise<void>;
  refreshAll: () => Promise<void>;
  setIncome: (income: number) => Promise<void>;

  // ─── UPI Import ───────────────────────────────────────────────────
  importQueue: ImportQueueItem[];
  importPendingCount: number;
  importToken: ImportTokenResponse | null;
  fetchImportQueue: () => Promise<void>;
  fetchImportToken: () => Promise<void>;
  regenerateImportToken: () => Promise<void>;
  approveImportItems: (ids: string[], overrides?: Record<string, { category?: string; name?: string }>) => Promise<void>;
  rejectImportItems: (ids: string[]) => Promise<void>;
  startImportPolling: () => void;
  stopImportPolling: () => void;
}

// ─── Helper ─────────────────────────────────────────────────────────

let toastIdCounter = 0;
let importPollTimer: ReturnType<typeof setInterval> | null = null;
const IMPORT_POLL_MS = 60_000;

// ─── Store ──────────────────────────────────────────────────────────

export const useStore = create<AppState>((set, get) => ({
  // Navigation
  currentPage: 'dashboard',
  setCurrentPage: (page) => set({ currentPage: page }),

  // User profile
  userName: '',
  userEmail: '',
  setUserProfile: (name, email) => set({ userName: name, userEmail: email }),
  updateUserName: async (name) => {
    try {
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('Failed to update name');
      set({ userName: name });
      get().addToast(`Name updated to "${name}"`, 'success');
    } catch {
      get().addToast('Failed to update name', 'error');
    }
  },

  // Date — default to current month label
  selectedMonth: currentMonthLabel(),
  setSelectedMonth: (month) => set({ selectedMonth: month, dataErrors: {} }),
  getSelectedMonthId: () => labelToMonthId(get().selectedMonth),

  // Modal
  isAddExpenseOpen: false,
  openAddExpense: () => set({ isAddExpenseOpen: true }),
  closeAddExpense: () => set({ isAddExpenseOpen: false }),

  // Edit expense
  editingExpense: null,
  openEditExpense: (expense) => set({ editingExpense: expense }),
  closeEditExpense: () => set({ editingExpense: null }),

  // Never display sample balances or fabricated transactions to a signed-in user.
  dashboard: emptyDashboard,
  analytics: emptyAnalytics,
  recurring: emptyRecurring,
  summary: emptySummary,
  loadedMonths: {},
  dataErrors: {},

  // Actions
  addExpense: (expense) =>
    set((state) => ({
      dashboard: {
        ...state.dashboard,
        // Credits add to balance; expenses subtract
        expensesTracked: expense.type === 'credit'
          ? state.dashboard.expensesTracked
          : state.dashboard.expensesTracked + expense.amount,
        remainingBalance: expense.type === 'credit'
          ? state.dashboard.remainingBalance + expense.amount
          : state.dashboard.remainingBalance - expense.amount,
        recentExpenses: [expense, ...state.dashboard.recentExpenses].slice(0, 10),
      },
    })),

  deleteExpense: async (expenseId) => {
    try {
      const response = await fetch(`/api/expenses/${expenseId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
      set((state) => {
        const deleted = state.dashboard.recentExpenses.find((e) => e.id === expenseId);
        const amount = deleted?.amount ?? 0;
        const isCredit = deleted?.type === 'credit';
        return {
          dashboard: {
            ...state.dashboard,
            recentExpenses: state.dashboard.recentExpenses.filter((e) => e.id !== expenseId),
            // Reversing a credit reduces balance; reversing an expense adds back
            expensesTracked: isCredit
              ? state.dashboard.expensesTracked
              : Math.max(0, state.dashboard.expensesTracked - amount),
            remainingBalance: isCredit
              ? state.dashboard.remainingBalance - amount
              : state.dashboard.remainingBalance + amount,
          },
          loadedMonths: { ...state.loadedMonths, analytics: '', summary: '' },
        };
      });
      get().addToast('Entry removed', 'success');
    } catch {
      get().addToast('Failed to remove entry', 'error');
    }
  },

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
    const { amount, category, description, date, type } = formData;
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
          type: type || 'expense',
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to record entry');
      }

      const newExpense = (await response.json()) as Expense;

      // Merge into dashboard state — credit adds to balance, expense subtracts
      set((state) => ({
        dashboard: {
          ...state.dashboard,
          expensesTracked: newExpense.type === 'credit'
            ? state.dashboard.expensesTracked
            : state.dashboard.expensesTracked + newExpense.amount,
          remainingBalance: newExpense.type === 'credit'
            ? state.dashboard.remainingBalance + newExpense.amount
            : state.dashboard.remainingBalance - newExpense.amount,
          recentExpenses: [newExpense, ...state.dashboard.recentExpenses].slice(0, 10),
        },
        loadedMonths: { ...state.loadedMonths, analytics: '', summary: '' },
      }));

      get().addToast(
        newExpense.type === 'credit' ? 'Credit recorded successfully' : 'Entry recorded successfully',
        'success'
      );
      get().closeAddExpense();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to record entry';
      get().addToast(message, 'error');
      throw err;
    }
  },

  onEditExpense: async (expenseId, formData) => {
    const { amount, category, description, date, type } = formData;
    if (!amount || !category) {
      get().addToast('Amount and category are required', 'error');
      throw new Error('Amount and category are required');
    }

    try {
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          category: category as ExpenseCategory,
          description,
          date,
          type: type || 'expense',
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update entry');
      }

      const updatedExpense = (await response.json()) as Expense;

      // Replace the old expense in the list
      set((state) => {
        const old = state.dashboard.recentExpenses.find((e) => e.id === expenseId);
        const oldAmount = old?.amount ?? 0;
        const wasCredit = old?.type === 'credit';
        const isNowCredit = updatedExpense.type === 'credit';

        // Reverse old entry's effect
        let expensesTracked = wasCredit
          ? state.dashboard.expensesTracked
          : state.dashboard.expensesTracked - oldAmount;
        let remainingBalance = wasCredit
          ? state.dashboard.remainingBalance - oldAmount
          : state.dashboard.remainingBalance + oldAmount;

        // Apply new entry's effect
        expensesTracked = isNowCredit
          ? expensesTracked
          : expensesTracked + updatedExpense.amount;
        remainingBalance = isNowCredit
          ? remainingBalance + updatedExpense.amount
          : remainingBalance - updatedExpense.amount;

        return {
          dashboard: {
            ...state.dashboard,
            expensesTracked: Math.max(0, expensesTracked),
            remainingBalance,
            recentExpenses: state.dashboard.recentExpenses.map((e) =>
              e.id === expenseId ? updatedExpense : e
            ),
          },
          editingExpense: null,
          loadedMonths: { ...state.loadedMonths, analytics: '', summary: '' },
        };
      });

      get().addToast('Entry updated successfully', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update entry';
      get().addToast(message, 'error');
      throw err;
    }
  },

  onFetchMonthData: async (month, _year) => {
    const monthId = deriveMonthId(month, _year);
    set((state) => ({ loading: { ...state.loading, dashboard: true } }));
    try {
      const response = await fetch(`/api/months/${monthId}`);
      if (!response.ok) throw new Error('Failed to load month data');
      const data = (await response.json()) as MonthDataResponse;

      // Separate credits from expenses — credits add to balance, expenses subtract
      const totalExpenses = data.expenses
        .filter((e) => e.type !== 'credit')
        .reduce((sum, e) => sum + e.amount, 0);
      const totalCredits = data.expenses
        .filter((e) => e.type === 'credit')
        .reduce((sum, e) => sum + e.amount, 0);

      const income = data.income || 0;
      const recent = [...data.expenses]
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 10);

      // Progress percent: ratio of remaining balance to income (clamped 0-100)
      const remainingBalance = income + totalCredits - totalExpenses - data.loanCashflow.lent + data.loanCashflow.repaid;
      const progressPercent = income > 0
        ? Math.max(0, Math.min(100, Math.round((remainingBalance / income) * 100)))
        : 0;

      // Ignore a slow response if the user has already selected another month.
      if (get().getSelectedMonthId() !== monthId) return;
      set((state) => ({
        dashboard: {
          ...state.dashboard,
          remainingBalance,
          incomeThisMonth: income,
          expensesTracked: totalExpenses,
          recentExpenses: recent,
          loansOutstanding: data.loanCashflow.outstanding,
          lentThisMonth: data.loanCashflow.lent,
          repaidThisMonth: data.loanCashflow.repaid,
          insightProgressPercent: progressPercent,
          insightDescription: income === 0
            ? 'Add your monthly income to put spending and lending in context.'
            : remainingBalance < 0
              ? 'Your recorded outflows exceed inflows for this month.'
              : 'Remaining cash reflects expenses, money lent and repayments received.',
        },
        loadedMonths: { ...state.loadedMonths, dashboard: monthId },
        dataErrors: { ...state.dataErrors, dashboard: undefined },
        loading: { ...state.loading, dashboard: false },
      }));
    } catch (err) {
      if (get().getSelectedMonthId() !== monthId) return;
      console.error('[onFetchMonthData] failed:', err);
      set((state) => ({
        dataErrors: { ...state.dataErrors, dashboard: 'Unable to load monthly data.' },
        loading: { ...state.loading, dashboard: false },
      }));
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
    const monthId = deriveMonthId(month, _year);
    set((state) => ({ loading: { ...state.loading, analytics: true } }));
    try {
      const response = await fetch(`/api/analytics/${monthId}`);
      if (!response.ok) throw new Error('Failed to load analytics');
      const data = (await response.json()) as AnalyticsData;
      if (get().getSelectedMonthId() !== monthId) return;
      set((state) => ({
        analytics: data,
        loadedMonths: { ...state.loadedMonths, analytics: monthId },
        dataErrors: { ...state.dataErrors, analytics: undefined },
        loading: { ...state.loading, analytics: false },
      }));
    } catch (err) {
      if (get().getSelectedMonthId() !== monthId) return;
      console.error('[onFetchAnalytics] failed:', err);
      set((state) => ({
        dataErrors: { ...state.dataErrors, analytics: 'Unable to load analytics.' },
        loading: { ...state.loading, analytics: false },
      }));
    }
  },

  onFetchRecurring: async () => {
    const monthId = labelToMonthId(get().selectedMonth);
    set((state) => ({ loading: { ...state.loading, recurring: true } }));
    try {
      const response = await fetch(`/api/recurring/${monthId}`);
      if (!response.ok) throw new Error('Failed to load recurring obligations');
      const data = (await response.json()) as RecurringData;
      if (get().getSelectedMonthId() !== monthId) return;
      set((state) => ({
        recurring: data,
        loadedMonths: { ...state.loadedMonths, recurring: monthId },
        dataErrors: { ...state.dataErrors, recurring: undefined },
        loading: { ...state.loading, recurring: false },
      }));
    } catch (err) {
      if (get().getSelectedMonthId() !== monthId) return;
      console.error('[onFetchRecurring] failed:', err);
      set((state) => ({
        dataErrors: { ...state.dataErrors, recurring: 'Unable to load recurring obligations.' },
        loading: { ...state.loading, recurring: false },
      }));
    }
  },

  onFetchSummary: async (month, _year) => {
    const monthId = deriveMonthId(month, _year);
    set((state) => ({ loading: { ...state.loading, summary: true } }));
    try {
      const response = await fetch(`/api/summary/${monthId}`);
      if (!response.ok) throw new Error('Failed to load summary');
      const data = (await response.json()) as SummaryData;
      if (get().getSelectedMonthId() !== monthId) return;
      set((state) => ({
        summary: data,
        loadedMonths: { ...state.loadedMonths, summary: monthId },
        dataErrors: { ...state.dataErrors, summary: undefined },
        loading: { ...state.loading, summary: false },
      }));
    } catch (err) {
      if (get().getSelectedMonthId() !== monthId) return;
      console.error('[onFetchSummary] failed:', err);
      set((state) => ({
        dataErrors: { ...state.dataErrors, summary: 'Unable to load monthly summary.' },
        loading: { ...state.loading, summary: false },
      }));
    }
  },

  refreshAll: async () => {
    const { selectedMonth, currentPage, onFetchMonthData, onFetchAnalytics,
      onFetchRecurring, onFetchSummary, fetchImportQueue } = get();
    const year = Number(selectedMonth.match(/\d{4}$/)?.[0]) || new Date().getFullYear();

    // Invalidate other tabs, so they refresh the next time they are opened.
    // Only fetch the visible view plus the dashboard; avoid five competing
    // serverless API calls and repeated Neon lookups on every update.
    set((state) => ({
      loadedMonths: {
        ...state.loadedMonths,
        analytics: currentPage === 'analytics' ? state.loadedMonths.analytics : '',
        summary: currentPage === 'summary' ? state.loadedMonths.summary : '',
        recurring: currentPage === 'recurring' ? state.loadedMonths.recurring : '',
      },
    }));
    const jobs: Promise<void>[] = [
      onFetchMonthData(selectedMonth, year),
      fetchImportQueue(),
    ];
    if (currentPage === 'analytics') jobs.push(onFetchAnalytics(selectedMonth, year));
    if (currentPage === 'summary') jobs.push(onFetchSummary(selectedMonth, year));
    if (currentPage === 'recurring') jobs.push(onFetchRecurring());
    await Promise.all(jobs);
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
          remainingBalance: state.dashboard.remainingBalance + income - state.dashboard.incomeThisMonth,
        },
        loadedMonths: { ...state.loadedMonths, analytics: '', summary: '' },
      }));
      get().addToast('Income updated', 'success');
    } catch {
      get().addToast('Failed to update income', 'error');
    }
  },

  // ─── UPI Import state & actions ─────────────────────────────────
  importQueue: [],
  importPendingCount: 0,
  importToken: null,

  fetchImportQueue: async () => {
    try {
      const res = await fetch('/api/import/queue?status=pending');
      if (!res.ok) return;
      const data = (await res.json()) as ImportQueueResponse;
      set({ importQueue: data.items, importPendingCount: data.pendingCount });
    } catch (err) {
      console.error('[fetchImportQueue] failed:', err);
    }
  },

  fetchImportToken: async () => {
    try {
      const res = await fetch('/api/import/token');
      if (!res.ok) return;
      const data = (await res.json()) as ImportTokenResponse;
      set({ importToken: data });
    } catch (err) {
      console.error('[fetchImportToken] failed:', err);
    }
  },

  regenerateImportToken: async () => {
    try {
      const res = await fetch('/api/import/token', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to regenerate');
      const data = (await res.json()) as ImportTokenResponse;
      set({ importToken: data });
      get().addToast('Secret token regenerated', 'success');
    } catch {
      get().addToast('Failed to regenerate token', 'error');
    }
  },

  approveImportItems: async (ids, overrides) => {
    try {
      const res = await fetch('/api/import/queue/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, overrides } as ApprovePayload),
      });
      if (!res.ok) throw new Error('Failed to approve');
      const data = await res.json();
      set((state) => ({
        importQueue: state.importQueue.filter((item) => !ids.includes(item.id)),
        importPendingCount: Math.max(0, state.importPendingCount - ids.length),
      }));
      get().addToast(
        `${data.approved} transaction${data.approved !== 1 ? 's' : ''} added to journal`,
        'success',
      );
      // Refresh dashboard balance after approval
      const { selectedMonth, onFetchMonthData } = get();
      const match = selectedMonth.match(/^(\w+)\s+(\d{4})$/);
      const year = match ? parseInt(match[2], 10) : new Date().getFullYear();
      set((state) => ({
        loadedMonths: { ...state.loadedMonths, analytics: '', summary: '' },
      }));
      await onFetchMonthData(selectedMonth, year);
    } catch {
      get().addToast('Failed to approve transactions', 'error');
    }
  },

  rejectImportItems: async (ids) => {
    try {
      const res = await fetch('/api/import/queue/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error('Failed to reject');
      set((state) => ({
        importQueue: state.importQueue.filter((item) => !ids.includes(item.id)),
        importPendingCount: Math.max(0, state.importPendingCount - ids.length),
      }));
      get().addToast('Transactions dismissed', 'success');
    } catch {
      get().addToast('Failed to dismiss transactions', 'error');
    }
  },

  startImportPolling: () => {
    if (importPollTimer || typeof window === 'undefined') return;
    importPollTimer = setInterval(() => {
      // Only poll while the tab is actually visible.
      if (document.visibilityState === 'visible') {
        void get().fetchImportQueue();
      }
    }, IMPORT_POLL_MS);
  },

  stopImportPolling: () => {
    if (importPollTimer) {
      clearInterval(importPollTimer);
      importPollTimer = null;
    }
  },
}));
