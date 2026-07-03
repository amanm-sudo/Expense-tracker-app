'use client';

import { useState, useEffect } from 'react';
import { X, Check, Calendar, TrendingDown, TrendingUp, Pencil } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { format } from 'date-fns';
import type { ExpenseCategory, CreditCategory, EntryType, AddExpenseFormData } from '@/types';

const expenseCategories: ExpenseCategory[] = [
  'Housing', 'Food', 'Transport', 'Leisure', 'Groceries', 'Health',
  'Dining', 'Utilities', 'Entertainment', 'Shopping', 'Wellness', 'Other',
];

const creditCategories: CreditCategory[] = [
  'Salary', 'Freelance', 'Gift', 'Refund', 'Investment', 'Bonus', 'Other',
];

const emptyForm = (type: EntryType = 'expense'): AddExpenseFormData => ({
  amount: '',
  category: '',
  description: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  type,
});

export default function AddExpenseModal() {
  const {
    isAddExpenseOpen,
    closeAddExpense,
    onAddExpense,
    editingExpense,
    closeEditExpense,
    onEditExpense,
  } = useStore();

  const isEditMode = Boolean(editingExpense);
  const isOpen = isAddExpenseOpen || isEditMode;

  const [form, setForm] = useState<AddExpenseFormData>(emptyForm('expense'));
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  // When editing expense is set, pre-fill the form
  useEffect(() => {
    if (editingExpense) {
      setForm({
        amount: String(editingExpense.amount),
        category: editingExpense.category as ExpenseCategory | CreditCategory | '',
        description: editingExpense.description || '',
        date: editingExpense.date,
        type: editingExpense.type,
      });
      setErrors({});
    }
  }, [editingExpense]);

  // Reset form when add modal opens fresh
  useEffect(() => {
    if (isAddExpenseOpen && !editingExpense) {
      setForm(emptyForm('expense'));
      setErrors({});
      setSubmitting(false);
    }
  }, [isAddExpenseOpen, editingExpense]);

  if (!isOpen) return null;

  const isCredit = form.type === 'credit';
  const categories = isCredit ? creditCategories : expenseCategories;

  const handleClose = () => {
    if (isEditMode) {
      closeEditExpense();
    } else {
      closeAddExpense();
    }
    setForm(emptyForm('expense'));
    setErrors({});
    setSubmitting(false);
  };

  const handleTypeToggle = (type: EntryType) => {
    setForm((f) => ({ ...f, type, category: '' }));
    setErrors({});
  };

  const handleSubmit = async () => {
    const newErrors: Record<string, boolean> = {};
    if (!form.amount || parseFloat(form.amount) <= 0) newErrors.amount = true;
    if (!form.category) newErrors.category = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      if (isEditMode && editingExpense) {
        await onEditExpense(editingExpense.id, form);
      } else {
        await onAddExpense(form);
      }
    } catch {
      setSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose();
  };

  const displayDate = form.date ? format(new Date(form.date), "'Today,' MMM dd") : '';

  // Accent colours per type
  const accentClass = isCredit
    ? 'border-emerald-500 focus:border-emerald-600'
    : 'border-sage-dark focus:border-sage-dark';
  const activeChipClass = isCredit
    ? 'bg-emerald-600 text-white border-emerald-600'
    : 'bg-sage-dark text-white border-sage-dark';
  const submitBgClass = isCredit
    ? 'bg-emerald-600 hover:bg-emerald-700'
    : 'bg-sage-dark hover:bg-[#333F33]';
  const amountColor = isCredit ? 'text-emerald-700' : 'text-text-primary';

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] md:pt-[8vh] px-4"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 animate-fade-in" />

      {/* Modal */}
      <div
        className="relative bg-cream w-full max-w-[580px] rounded shadow-card-xl overflow-hidden animate-slide-up"
        style={{ animationDuration: '280ms' }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-text-secondary hover:text-text-primary transition-colors z-10"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              {isEditMode ? (
                <Pencil size={15} className="text-text-muted" />
              ) : null}
              <span className="text-text-muted text-[11px] font-semibold uppercase tracking-[0.08em]">
                {isEditMode ? 'Edit Entry' : 'New Entry'}
              </span>
            </div>

            {/* Expense / Credit toggle — only shown when adding (not editing) */}
            {!isEditMode && (
              <div className="inline-flex items-center bg-white border border-gray-border rounded p-1 mt-2">
                <button
                  onClick={() => handleTypeToggle('expense')}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded text-sm font-semibold transition-all duration-150
                    ${form.type === 'expense'
                      ? 'bg-sage-dark text-white shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                    }`}
                >
                  <TrendingDown size={14} />
                  Expense
                </button>
                <button
                  onClick={() => handleTypeToggle('credit')}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded text-sm font-semibold transition-all duration-150
                    ${form.type === 'credit'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                    }`}
                >
                  <TrendingUp size={14} />
                  Credit
                </button>
              </div>
            )}
          </div>

          {/* Amount */}
          <div className="mb-6">
            <label className="text-text-muted text-[11px] font-semibold uppercase tracking-[0.08em] block mb-3">
              Amount
            </label>
            <div className="flex items-center gap-2">
              <span className={`font-serif-display text-2xl ${isCredit ? 'text-emerald-500' : 'text-text-muted'}`}>
                {isCredit ? '+₹' : '₹'}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => {
                  setForm((f) => ({ ...f, amount: e.target.value }));
                  setErrors((err) => ({ ...err, amount: false }));
                }}
                className={`w-full bg-transparent font-serif-display text-4xl md:text-5xl placeholder:text-text-muted outline-none border-b-2 pb-1 transition-colors
                  ${amountColor}
                  ${errors.amount ? 'border-terracotta' : `border-transparent ${accentClass}`}
                `}
              />
            </div>
            {isCredit && (
              <p className="text-xs text-emerald-600 mt-2">
                This will be added to your balance.
              </p>
            )}
          </div>

          {/* Category */}
          <div className="mb-6">
            <label className="text-text-muted text-[11px] font-semibold uppercase tracking-[0.08em] block mb-3">
              {isCredit ? 'Source' : 'Category'}
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setForm((f) => ({ ...f, category: cat }));
                    setErrors((err) => ({ ...err, category: false }));
                  }}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-all duration-150 ease-out border
                    ${form.category === cat
                      ? activeChipClass
                      : `bg-white text-text-primary border-gray-border ${
                          isCredit
                            ? 'hover:border-emerald-500'
                            : 'hover:border-sage-dark'
                        }`
                    }
                    ${errors.category && form.category !== cat ? 'border-terracotta' : ''}
                  `}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="text-text-muted text-[11px] font-semibold uppercase tracking-[0.08em] block mb-3">
              {isCredit ? 'Note (optional)' : 'Description'}
            </label>
            <input
              type="text"
              placeholder={isCredit ? 'e.g. Monthly salary from Acme Corp' : 'What was this for?'}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className={`w-full bg-white border border-gray-border rounded px-4 py-3 text-sm text-text-primary
                placeholder:text-text-muted outline-none transition-all duration-150
                ${isCredit
                  ? 'focus:border-emerald-500 focus:ring-[3px] focus:ring-emerald-500/8'
                  : 'focus:border-sage-dark focus:ring-[3px] focus:ring-sage-dark/8'
                }`}
            />
          </div>

          {/* Date */}
          <div className="mb-7">
            <label className="text-text-muted text-[11px] font-semibold uppercase tracking-[0.08em] block mb-3">
              Date
            </label>
            <div className="relative max-w-[240px]">
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full bg-white border border-gray-border rounded px-4 py-3 text-sm text-text-primary
                  outline-none transition-all duration-150 focus:border-sage-dark focus:ring-[3px] focus:ring-sage-dark/8"
              />
              <div className="absolute inset-0 flex items-center px-4 bg-white border border-gray-border rounded pointer-events-none">
                <span className="text-sm text-text-primary flex-1">{displayDate}</span>
                <Calendar size={18} className="text-text-muted" />
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={`w-full h-[52px] text-white rounded flex items-center justify-center gap-2
              text-sm font-semibold uppercase tracking-[0.06em] transition-all duration-150
              active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ${submitBgClass}`}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {isEditMode ? 'Saving...' : isCredit ? 'Recording Credit...' : 'Recording...'}
              </span>
            ) : (
              <>
                {isEditMode ? 'Save Changes' : isCredit ? 'Record Credit' : 'Record Entry'}
                <Check size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
