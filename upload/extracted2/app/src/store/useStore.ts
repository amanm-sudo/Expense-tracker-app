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
} from '@/types';

// ─── Demo Data ──────────────────────────────────────────────────────

const demoRecentExpenses: Expense[] = [
  {
    id: '1',
    name: 'Blue Bottle Coffee',
    category: 'Food',
    categoryIcon: 'Coffee',
    description: 'Morning coffee run',
    date: '2024-01-12',
    amount: 6.50,
  },
  {
    id: '2',
    name: 'Apartment Rent',
    category: 'Housing',
    categoryIcon: 'Home',
    description: 'Monthly rent payment',
    date: '2024-01-01',
    amount: 1800.00,
  },
  {
    id: '3',
    name: 'Whole Foods',
    category: 'Groceries',
    categoryIcon: 'ShoppingBag',
    description: 'Weekly groceries',
    date: '2024-01-10',
    amount: 142.10,
  },
];

const demoDashboard: DashboardData = {
  remainingBalance: 4250.00,
  incomeThisMonth: 8000.00,
  expensesTracked: 3750.00,
  insightQuote: '"Wealth is the ability to fully experience life."',
  insightDescription: "You've saved 12% more than last month. Keep the narrative strong.",
  insightProgressPercent: 60,
  recentExpenses: demoRecentExpenses,
};

const demoAnalytics: AnalyticsData = {
  monthlyNarrative: 'This month, your financial story reflects a shift towards essential stability, with a notable emphasis on long-term home investments.',
  highestCategory: { name: 'Housing', percentage: 42 },
  lowestCategory: { name: 'Health', percentage: 2.4 },
  spendingTrend: [
    { date: '2024-01-01', amount: 1800 },
    { date: '2024-01-05', amount: 2100 },
    { date: '2024-01-10', amount: 2250 },
    { date: '2024-01-15', amount: 3100 },
    { date: '2024-01-20', amount: 3450 },
    { date: '2024-01-25', amount: 4100 },
    { date: '2024-01-31', amount: 4822.40 },
  ],
  currentTotal: 4822.40,
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
      amount: 50.00,
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
      amount: 75.00,
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
  totalMonthlySpend: 4285.00,
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
      description: 'Subscriptions, utilities, and minor groceries made up the remainder of your story this month.',
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

  // Date selection
  selectedMonth: string; // e.g. "January 2024"
  setSelectedMonth: (month: string) => void;

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

  // Backend integration placeholders
  /** TODO: Connect to backend - creates a new expense */
  onAddExpense: (formData: AddExpenseFormData) => Promise<void>;
  /** TODO: Connect to backend - fetches month data */
  onFetchMonthData: (month: string, year: number) => Promise<void>;
  /** TODO: Connect to backend - gets AI insights */
  onGetAIInsights: (month: string, year: number) => Promise<AIPersonalNote | null>;
  /** TODO: Connect to backend - fetches analytics */
  onFetchAnalytics: (month: string, year: number) => Promise<void>;
  /** TODO: Connect to backend - fetches recurring obligations */
  onFetchRecurring: () => Promise<void>;
  /** TODO: Connect to backend - fetches summary */
  onFetchSummary: (month: string, year: number) => Promise<void>;
}

// ─── Helper ─────────────────────────────────────────────────────────

let toastIdCounter = 0;

// ─── Store ──────────────────────────────────────────────────────────

export const useStore = create<AppState>((set, get) => ({
  // Navigation
  currentPage: 'dashboard',
  setCurrentPage: (page) => set({ currentPage: page }),

  // Date
  selectedMonth: 'January 2024',
  setSelectedMonth: (month) => set({ selectedMonth: month }),

  // Modal
  isAddExpenseOpen: false,
  openAddExpense: () => set({ isAddExpenseOpen: true }),
  closeAddExpense: () => set({ isAddExpenseOpen: false }),

  // Data
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

  // ─── Backend Placeholders ───────────────────────────────────────

  onAddExpense: async (formData) => {
    const { amount, category, description, date } = formData;
    if (!amount || !category) {
      get().addToast('Amount and category are required', 'error');
      throw new Error('Amount and category are required');
    }

    // TODO: Replace with actual API call
    // const response = await fetch('/api/expenses', {
    //   method: 'POST',
    //   body: JSON.stringify({ amount: parseFloat(amount), category, description, date }),
    // });
    // const newExpense = await response.json();

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      name: description || category,
      category: category as ExpenseCategory,
      categoryIcon: 'Receipt',
      description,
      date,
      amount: parseFloat(amount),
    };

    get().addExpense(newExpense);
    get().addToast('Entry recorded successfully', 'success');
    get().closeAddExpense();
  },

  onFetchMonthData: async (_month: string, _year: number) => {
    set((state) => ({ loading: { ...state.loading, dashboard: true } }));
    // TODO: Replace with actual API call
    // const response = await fetch(`/api/month-data?month=${_month}&year=${_year}`);
    // const data = await response.json();
    await new Promise((resolve) => setTimeout(resolve, 200));
    set((state) => ({ loading: { ...state.loading, dashboard: false } }));
  },

  onGetAIInsights: async (_month: string, _year: number) => {
    set((state) => ({ loading: { ...state.loading, insights: true } }));
    // TODO: Replace with actual API call
    // const response = await fetch(`/api/insights?month=${_month}&year=${_year}`);
    // const data = await response.json();
    await new Promise((resolve) => setTimeout(resolve, 500));
    set((state) => ({ loading: { ...state.loading, insights: false } }));
    return get().summary.aiPersonalNote;
  },

  onFetchAnalytics: async (_month: string, _year: number) => {
    set((state) => ({ loading: { ...state.loading, analytics: true } }));
    // TODO: Replace with actual API call
    await new Promise((resolve) => setTimeout(resolve, 200));
    set((state) => ({ loading: { ...state.loading, analytics: false } }));
  },

  onFetchRecurring: async () => {
    set((state) => ({ loading: { ...state.loading, recurring: true } }));
    // TODO: Replace with actual API call
    await new Promise((resolve) => setTimeout(resolve, 200));
    set((state) => ({ loading: { ...state.loading, recurring: false } }));
  },

  onFetchSummary: async (_month: string, _year: number) => {
    set((state) => ({ loading: { ...state.loading, summary: true } }));
    // TODO: Replace with actual API call
    await new Promise((resolve) => setTimeout(resolve, 200));
    set((state) => ({ loading: { ...state.loading, summary: false } }));
  },
}));
