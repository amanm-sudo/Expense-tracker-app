'use client';

import { useStore } from '@/store/useStore';
import { Coffee, Home, ShoppingBag, Receipt, Plus } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import { format } from 'date-fns';

const iconMap: Record<string, React.ElementType> = {
  Coffee,
  Home,
  ShoppingBag,
  Receipt,
};

export default function DashboardPage() {
  const { dashboard, openAddExpense } = useStore();

  return (
    <div className="min-h-full flex flex-col">
      <TopBar pageTitle="Financial Journal" />

      <div className="px-4 md:px-8 pb-10 flex-1 flex flex-col">
        {/* Top row: Balance summary + Insight */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-10">
          {/* Balance Summary Card */}
          <div className="lg:col-span-3 bg-white border border-gray-border rounded shadow-card-sm p-6 md:p-8 animate-slide-in-left">
            <div className="text-text-muted text-[11px] font-semibold uppercase tracking-[0.08em] mb-3">
              Monthly Summary
            </div>
            <h2 className="font-serif-display text-xl md:text-[22px] text-text-primary mb-1">
              Remaining Balance
            </h2>
            <div className="font-serif-display text-3xl md:text-4xl text-text-primary mb-5">
              ${dashboard.remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>

            <hr className="border-gray-border mb-5" />

            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-text-muted text-[11px] font-semibold uppercase tracking-[0.08em] mb-1">
                  Income This Month
                </div>
                <div className="font-serif-display text-lg text-text-primary">
                  ${dashboard.incomeThisMonth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-text-muted text-[11px] font-semibold uppercase tracking-[0.08em] mb-1">
                  Expenses Tracked
                </div>
                <div className="font-serif-display text-lg text-terracotta">
                  ${dashboard.expensesTracked.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* Insight Card */}
          <div className="lg:col-span-2 bg-sage-dark rounded shadow-card-sm p-6 md:p-8 animate-slide-in-right flex flex-col">
            <div className="text-white/50 text-[11px] font-semibold uppercase tracking-[0.08em] mb-4">
              Insight
            </div>
            <p className="font-quote text-lg md:text-xl italic text-white leading-relaxed mb-6 flex-1">
              {dashboard.insightQuote}
            </p>
            <p className="text-white/70 text-[13px] leading-relaxed mb-4 max-w-[220px]">
              {dashboard.insightDescription}
            </p>
            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-700 ease-out"
                style={{ width: `${dashboard.insightProgressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Recent Entries */}
        <div className="mb-10 animate-slide-up">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h3 className="font-serif-display text-xl md:text-[22px] text-text-primary">
                Recent Entries
              </h3>
              <p className="text-text-secondary text-[13px] mt-0.5">
                The chronological flow of your capital.
              </p>
            </div>
            <button className="text-xs font-medium text-text-primary hover:underline transition-all pb-0.5">
              VIEW ALL
            </button>
          </div>

          <div className="bg-white border border-gray-border rounded shadow-card-sm">
            {dashboard.recentExpenses.length === 0 ? (
              <div className="p-8 text-center">
                <Receipt size={48} className="mx-auto text-text-muted mb-3" />
                <p className="text-text-secondary text-sm mb-2">No entries yet</p>
                <p className="text-text-muted text-xs">Add your first expense to get started</p>
              </div>
            ) : (
              dashboard.recentExpenses.map((expense, index) => {
                const Icon = iconMap[expense.categoryIcon] || Receipt;
                return (
                  <div
                    key={expense.id}
                    className={`flex items-center gap-4 px-4 md:px-6 py-4 transition-colors hover:bg-black/[0.02]
                      ${index < dashboard.recentExpenses.length - 1 ? 'border-b border-gray-border' : ''}
                    `}
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-bg flex items-center justify-center flex-shrink-0">
                      <Icon size={18} className="text-sage-dark" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[15px] font-medium text-text-primary truncate">
                        {expense.name}
                      </div>
                      <div className="text-xs text-text-secondary">
                        {expense.category} • {format(new Date(expense.date), 'MMM dd, yyyy')}
                      </div>
                    </div>
                    <div className="text-base font-semibold text-text-primary tabular-nums">
                      ${expense.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Legacy View Banner */}
        <div
          className="relative w-full h-[180px] md:h-[220px] rounded overflow-hidden bg-cover bg-center mb-10"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&h=500&fit=crop)',
          }}
        >
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-center px-4">
            <div className="text-white/60 text-[11px] font-semibold uppercase tracking-[0.08em] mb-3">
              Legacy View
            </div>
            <h3 className="font-serif-display text-xl md:text-2xl text-white mb-4 max-w-md leading-snug">
              Visualizing your future through every intentional choice.
            </h3>
            <button className="px-6 py-2.5 border border-white/60 text-white text-sm font-medium rounded hover:bg-white/10 transition-colors">
              Explore Trajectory
            </button>
          </div>
        </div>

        {/* Footer */}
        <footer className="pt-6 border-t border-gray-border flex flex-col sm:flex-row items-center justify-between gap-3 mt-auto">
          <div className="flex items-center gap-3 text-[13px]">
            <span className="font-medium text-text-primary">Financial Journal</span>
            <span className="text-text-muted">|</span>
            <span className="text-text-secondary">Handcrafted for you. &copy; 2024 Financial Journal.</span>
          </div>
          <div className="flex items-center gap-4 text-[13px] text-text-secondary">
            <a href="#" className="hover:text-text-primary hover:underline transition-colors">Privacy</a>
            <a href="#" className="hover:text-text-primary hover:underline transition-colors">Terms</a>
            <a href="#" className="hover:text-text-primary hover:underline transition-colors">Support</a>
          </div>
        </footer>
      </div>

      {/* Mobile FAB */}
      <button
        onClick={openAddExpense}
        className="fixed bottom-6 right-6 w-14 h-14 bg-sage-dark text-white rounded-full shadow-card-lg 
          flex items-center justify-center lg:hidden z-30 active:scale-95 transition-transform"
        aria-label="Add expense"
      >
        <Plus size={24} />
      </button>
    </div>
  );
}
