import { useState } from 'react';
import { X, Check, Calendar } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { format } from 'date-fns';
import type { ExpenseCategory, AddExpenseFormData } from '@/types';

const categories: ExpenseCategory[] = ['Housing', 'Food', 'Transport', 'Leisure', 'Groceries', 'Health'];

export default function AddExpenseModal() {
  const { isAddExpenseOpen, closeAddExpense, onAddExpense } = useStore();
  const [form, setForm] = useState<AddExpenseFormData>({
    amount: '',
    category: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  if (!isAddExpenseOpen) return null;

  const handleClose = () => {
    closeAddExpense();
    setForm({
      amount: '',
      category: '',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd'),
    });
    setErrors({});
    setSubmitting(false);
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
      await onAddExpense(form);
    } catch {
      setSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose();
  };

  const displayDate = format(new Date(form.date), "'Today,' MMM dd");

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] md:pt-[10vh] px-4"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 animate-fade-in" />

      {/* Modal */}
      <div
        className="relative bg-cream w-full max-w-[560px] rounded shadow-card-xl overflow-hidden animate-slide-up"
        style={{ animationDuration: '300ms' }}
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
          {/* Amount */}
          <div className="mb-6">
            <label className="text-text-muted text-[11px] font-semibold uppercase tracking-[0.08em] block mb-3">
              Amount
            </label>
            <div className="flex items-center gap-2">
              <span className="font-serif-display text-2xl text-text-muted">$</span>
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
                className={`w-full bg-transparent font-serif-display text-4xl md:text-5xl text-text-primary 
                  placeholder:text-text-muted outline-none border-b-2 pb-1 transition-colors
                  ${errors.amount ? 'border-terracotta' : 'border-transparent focus:border-sage-dark'}
                `}
              />
            </div>
          </div>

          {/* Category */}
          <div className="mb-6">
            <label className="text-text-muted text-[11px] font-semibold uppercase tracking-[0.08em] block mb-3">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setForm((f) => ({ ...f, category: cat }));
                    setErrors((err) => ({ ...err, category: false }));
                  }}
                  className={`px-4 py-2 rounded text-sm font-medium transition-all duration-150 ease-out
                    ${form.category === cat
                      ? 'bg-sage-dark text-white border border-sage-dark'
                      : 'bg-white text-text-primary border border-gray-border hover:border-sage-dark'
                    }
                    ${errors.category ? 'border-terracotta' : ''}
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
              Description
            </label>
            <input
              type="text"
              placeholder="What was this for?"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full bg-white border border-gray-border rounded px-4 py-3 text-sm text-text-primary 
                placeholder:text-text-muted outline-none transition-all duration-150
                focus:border-sage-dark focus:ring-[3px] focus:ring-sage-dark/8"
            />
          </div>

          {/* Date + Quote */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-3">
              <label className="text-text-muted text-[11px] font-semibold uppercase tracking-[0.08em] block mb-3">
                Date
              </label>
              <div className="relative">
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
            <div className="md:col-span-2 bg-white border border-gray-border rounded p-4 flex flex-col justify-center">
              <p className="font-quote text-base italic text-text-secondary leading-relaxed mb-2">
                "Wealth is the ability to fully experience life."
              </p>
              <p className="text-xs font-medium text-text-secondary text-right">
                — Henry David Thoreau
              </p>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full h-[52px] bg-sage-dark text-white rounded flex items-center justify-center gap-2
              text-sm font-semibold uppercase tracking-[0.06em] transition-all duration-150
              hover:bg-[#333F33] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Recording...
              </span>
            ) : (
              <>
                Record Entry
                <Check size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
