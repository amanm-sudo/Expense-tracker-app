'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  X, Receipt, Banknote, Pencil, Trash2,
  Coffee, Home, ShoppingBag, Bus, Music, Heart,
  UtensilsCrossed, Globe, Monitor, Dumbbell,
  Laptop, Gift, RotateCcw, TrendingUp, Award, CircleDollarSign,
  Search,
} from 'lucide-react';
import { useStore, labelToMonthId } from '@/store/useStore';
import { format } from 'date-fns';
import type { Expense } from '@/types';

const iconMap: Record<string, React.ElementType> = {
  Coffee, Home, ShoppingBag, Receipt,
  Bus, Music, Heart, UtensilsCrossed, Globe, Monitor, Dumbbell,
  Banknote, Laptop, Gift, RotateCcw, TrendingUp, Award, CircleDollarSign,
};

interface AllExpensesModalProps {
  onClose: () => void;
}

export default function AllExpensesModal({ onClose }: AllExpensesModalProps) {
  const { selectedMonth, deleteExpense, openEditExpense, addToast } = useStore();
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'expense' | 'credit'>('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const monthId = labelToMonthId(selectedMonth);
      const res = await fetch(`/api/months/${monthId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      // Sort newest first
      const sorted = [...(data.expenses as Expense[])].sort(
        (a, b) => (a.date < b.date ? 1 : -1),
      );
      setAllExpenses(sorted);
    } catch {
      addToast('Failed to load all entries', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, addToast]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleDelete = async (id: string) => {
    await deleteExpense(id);
    setAllExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const handleEdit = (expense: Expense) => {
    openEditExpense(expense);
    onClose();
  };

  const filtered = allExpenses.filter((e) => {
    const matchesSearch =
      !search ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase()) ||
      (e.description || '').toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === 'all' || e.type === filter;
    return matchesSearch && matchesFilter;
  });

  const totalExpenses = allExpenses
    .filter((e) => e.type !== 'credit')
    .reduce((s, e) => s + e.amount, 0);
  const totalCredits = allExpenses
    .filter((e) => e.type === 'credit')
    .reduce((s, e) => s + e.amount, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 animate-fade-in" />

      {/* Panel */}
      <div
        className="relative bg-cream w-full sm:max-w-2xl sm:rounded shadow-card-xl overflow-hidden animate-slide-up flex flex-col"
        style={{ maxHeight: '90vh', animationDuration: '280ms' }}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-border flex items-start justify-between flex-shrink-0">
          <div>
            <div className="text-text-muted text-[11px] font-semibold uppercase tracking-[0.08em] mb-1">
              {selectedMonth}
            </div>
            <h2 className="font-serif-display text-xl text-text-primary">All Entries</h2>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors mt-1"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Summary strip */}
        <div className="px-6 py-3 bg-white border-b border-gray-border flex gap-6 flex-shrink-0">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-0.5">Spent</div>
            <div className="font-serif-display text-base text-text-primary">
              ₹{totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="w-px bg-gray-border" />
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-0.5">Credits</div>
            <div className="font-serif-display text-base text-emerald-600">
              +₹{totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="w-px bg-gray-border" />
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-0.5">Entries</div>
            <div className="font-serif-display text-base text-text-primary">{allExpenses.length}</div>
          </div>
        </div>

        {/* Search + filter */}
        <div className="px-6 py-3 border-b border-gray-border bg-white flex items-center gap-3 flex-shrink-0">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search entries…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-gray-bg border border-gray-border rounded text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-sage-dark transition-colors"
            />
          </div>
          <div className="flex gap-1 flex-shrink-0">
            {(['all', 'expense', 'credit'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wide transition-all duration-150 ${
                  filter === f
                    ? f === 'credit'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-sage-dark text-white'
                    : 'bg-gray-bg text-text-secondary hover:text-text-primary border border-gray-border'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="p-12 flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-sage-dark/20 border-t-sage-dark rounded-full animate-spin" />
              <p className="text-text-muted text-sm">Loading entries…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt size={40} className="mx-auto text-text-muted mb-3" strokeWidth={1} />
              <p className="text-text-secondary text-sm">
                {search || filter !== 'all' ? 'No entries match your filter.' : 'No entries yet for this month.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-border">
              {filtered.map((expense) => {
                const isCredit = expense.type === 'credit';
                const Icon = iconMap[expense.categoryIcon] || (isCredit ? Banknote : Receipt);
                return (
                  <div
                    key={expense.id}
                    className="group flex items-center gap-4 px-6 py-4 hover:bg-black/[0.02] transition-colors"
                  >
                    {/* Icon bubble */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isCredit ? 'bg-emerald-50' : 'bg-gray-bg'
                      }`}
                    >
                      <Icon
                        size={18}
                        className={isCredit ? 'text-emerald-600' : 'text-sage-dark'}
                        strokeWidth={1.5}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-[14px] font-medium text-text-primary truncate">
                          {expense.name}
                        </div>
                        {isCredit && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 flex-shrink-0">
                            Credit
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-text-secondary">
                        {expense.category}
                        {expense.description ? ` · ${expense.description}` : ''}
                        {' · '}
                        {format(new Date(expense.date), 'MMM dd, yyyy')}
                      </div>
                    </div>

                    {/* Amount */}
                    <div
                      className={`text-base font-semibold tabular-nums flex-shrink-0 ${
                        isCredit ? 'text-emerald-600' : 'text-text-primary'
                      }`}
                    >
                      {isCredit ? '+' : ''}₹{expense.amount.toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>

                    {/* Actions */}
                    <button
                      onClick={() => handleEdit(expense)}
                      title="Edit"
                      className="ml-1 p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-blue-50 hover:text-blue-500 text-text-muted transition-all duration-150 flex-shrink-0"
                    >
                      <Pencil size={14} strokeWidth={1.8} />
                    </button>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      title="Delete"
                      className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 text-text-muted transition-all duration-150 flex-shrink-0"
                    >
                      <Trash2 size={14} strokeWidth={1.8} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-border flex-shrink-0 bg-white">
          <p className="text-xs text-text-muted text-center">
            Showing {filtered.length} of {allExpenses.length} entries for {selectedMonth}
          </p>
        </div>
      </div>
    </div>
  );
}
