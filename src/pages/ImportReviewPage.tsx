'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import TopBar from '@/components/layout/TopBar';
import {
  Smartphone, Check, X, ChevronDown, AlertCircle,
  CheckSquare, Square, Info,
} from 'lucide-react';
import { format } from 'date-fns';
import type { ImportQueueItem } from '@/types';

const EXPENSE_CATEGORIES = [
  'Housing', 'Food', 'Transport', 'Leisure', 'Groceries',
  'Health', 'Dining', 'Utilities', 'Entertainment', 'Shopping',
  'Wellness', 'Other',
] as const;

const CREDIT_CATEGORIES = [
  'Salary', 'Freelance', 'Gift', 'Refund', 'Investment', 'Bonus', 'Other',
] as const;

/** Confidence badge colour */
function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const cls =
    pct >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : pct >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-red-50 text-red-600 border-red-200';
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wide border rounded px-1.5 py-0.5 ${cls}`}>
      {pct}% match
    </span>
  );
}

/** Category dropdown for inline override */
function CategorySelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-gray-bg border border-gray-border rounded px-3 py-1.5 pr-7
          text-sm text-text-primary outline-none focus:border-sage-dark transition-colors cursor-pointer"
      >
        {options.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
    </div>
  );
}

export default function ImportReviewPage() {
  const {
    importQueue,
    importPendingCount,
    fetchImportQueue,
    approveImportItems,
    rejectImportItems,
    loading,
  } = useStore();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Record<string, { category: string; name: string }>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchImportQueue();
  }, [fetchImportQueue]);

  // Defaults are resolved at render time (`ov` below), so only explicit edits
  // need to live in `overrides` — no seeding effect required.

  const allSelected = importQueue.length > 0 && selected.size === importQueue.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(importQueue.map((i) => i.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApprove = async (ids: string[]) => {
    if (ids.length === 0) return;
    setSubmitting(true);
    // Build overrides only for items whose category was changed
    const changedOverrides: Record<string, { category?: string; name?: string }> = {};
    for (const id of ids) {
      const item = importQueue.find((q) => q.id === id);
      if (item && overrides[id]) {
        const catChanged = overrides[id].category !== item.suggestedCat;
        const nameChanged = overrides[id].name !== (item.merchant ?? item.suggestedCat);
        if (catChanged || nameChanged) changedOverrides[id] = overrides[id];
      }
    }
    await approveImportItems(ids, changedOverrides);
    setSelected((prev) => { const n = new Set(prev); ids.forEach((id) => n.delete(id)); return n; });
    setSubmitting(false);
  };

  const handleReject = async (ids: string[]) => {
    if (ids.length === 0) return;
    setSubmitting(true);
    await rejectImportItems(ids);
    setSelected((prev) => { const n = new Set(prev); ids.forEach((id) => n.delete(id)); return n; });
    setSubmitting(false);
  };

  const isLoading = loading['importQueue'];

  return (
    <div className="min-h-full flex flex-col">
      <TopBar pageTitle="Financial Journal" />

      <div className="px-4 md:px-8 pb-10 flex-1 flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <div className="text-text-muted text-[11px] font-semibold uppercase tracking-[0.08em] mb-2">
            UPI Auto-Import
          </div>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-serif-display text-2xl md:text-[28px] text-text-primary">
                Review Queue
              </h1>
              <p className="text-text-secondary text-sm mt-0.5">
                {importPendingCount > 0
                  ? `${importPendingCount} UPI transaction${importPendingCount !== 1 ? 's' : ''} waiting for your review.`
                  : 'No pending transactions — you\'re all caught up!'}
              </p>
            </div>
            {selected.size > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleApprove([...selected])}
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-sage-dark text-white text-sm
                    font-semibold rounded hover:bg-[#333F33] transition-colors disabled:opacity-50"
                >
                  <Check size={14} />
                  Add {selected.size} to Journal
                </button>
                <button
                  onClick={() => handleReject([...selected])}
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2 border border-gray-border text-sm
                    font-medium text-text-secondary rounded hover:bg-gray-bg/60 transition-colors disabled:opacity-50"
                >
                  <X size={14} />
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded px-4 py-3 mb-6 text-sm text-blue-800">
          <Info size={16} className="flex-shrink-0 mt-0.5" />
          <span>
            Categories are auto-detected from your UPI VPA. Edit any before adding to your journal —
            corrections are remembered for future transactions.
          </span>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-sage-dark/30 border-t-sage-dark rounded-full animate-spin" />
          </div>
        ) : importQueue.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
            <Smartphone size={48} className="text-text-muted mb-4" />
            <h3 className="font-serif-display text-xl text-text-primary mb-2">Queue is empty</h3>
            <p className="text-text-secondary text-sm max-w-sm">
              Once you set up the SMS forwarder on your Android, every UPI payment
              from Canara Bank or Union Bank of India will appear here automatically.
            </p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="bg-white border border-gray-border rounded shadow-card-sm overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[36px_1fr_120px_180px_100px_80px] gap-3 px-4 py-3
                border-b border-gray-border bg-gray-bg/60 text-[11px] font-semibold uppercase
                tracking-[0.07em] text-text-muted items-center">
                <button onClick={toggleSelectAll} className="flex items-center justify-center">
                  {allSelected
                    ? <CheckSquare size={16} className="text-sage-dark" />
                    : <Square size={16} className="text-text-muted" />}
                </button>
                <span>Merchant</span>
                <span>Amount</span>
                <span>Category</span>
                <span>Date</span>
                <span className="text-right">Action</span>
              </div>

              {/* Rows */}
              {importQueue.map((item, index) => {
                const isSelected = selected.has(item.id);
                const ov = overrides[item.id] ?? {
                  category: item.suggestedCat,
                  name: item.merchant ?? item.suggestedCat,
                };
                const isCredit = item.txnType === 'credit';

                return (
                  <div
                    key={item.id}
                    className={`grid grid-cols-[36px_1fr_120px_180px_100px_80px] gap-3 px-4 py-4
                      items-center transition-colors
                      ${index < importQueue.length - 1 ? 'border-b border-gray-border' : ''}
                      ${isSelected ? 'bg-sage-dark/[0.03]' : 'hover:bg-black/[0.01]'}`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleSelect(item.id)}
                      className="flex items-center justify-center"
                    >
                      {isSelected
                        ? <CheckSquare size={16} className="text-sage-dark" />
                        : <Square size={16} className="text-text-muted" />}
                    </button>

                    {/* Merchant + meta */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="text"
                          value={ov.name}
                          onChange={(e) =>
                            setOverrides((prev) => ({
                              ...prev,
                              [item.id]: { ...ov, name: e.target.value },
                            }))
                          }
                          placeholder="Unknown Merchant"
                          className="text-sm font-medium text-text-primary bg-transparent border-b border-transparent
                            hover:border-gray-border focus:border-sage-dark outline-none transition-colors min-w-0 max-w-[220px]"
                        />
                        {isCredit && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide
                            text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                            Credit
                          </span>
                        )}
                        <ConfidenceBadge score={item.confidence} />
                      </div>
                      {item.vpa && (
                        <div className="text-xs text-text-muted mt-0.5 font-mono">{item.vpa}</div>
                      )}
                    </div>

                    {/* Amount */}
                    <div className={`text-sm font-semibold tabular-nums ${isCredit ? 'text-emerald-600' : 'text-text-primary'}`}>
                      {isCredit ? '+' : ''}₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>

                    {/* Category select */}
                    <CategorySelect
                      value={ov.category}
                      options={isCredit ? CREDIT_CATEGORIES : EXPENSE_CATEGORIES}
                      onChange={(v) =>
                        setOverrides((prev) => ({
                          ...prev,
                          [item.id]: { ...ov, category: v },
                        }))
                      }
                    />

                    {/* Date */}
                    <div className="text-sm text-text-secondary">
                      {format(new Date(item.date), 'dd MMM')}
                    </div>

                    {/* Quick action buttons */}
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleApprove([item.id])}
                        disabled={submitting}
                        title="Add to journal"
                        className="p-1.5 rounded hover:bg-emerald-50 text-text-muted hover:text-emerald-600
                          transition-colors disabled:opacity-50"
                      >
                        <Check size={15} strokeWidth={2} />
                      </button>
                      <button
                        onClick={() => handleReject([item.id])}
                        disabled={submitting}
                        title="Dismiss"
                        className="p-1.5 rounded hover:bg-red-50 text-text-muted hover:text-red-500
                          transition-colors disabled:opacity-50"
                      >
                        <X size={15} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Low confidence warning */}
            {importQueue.some((i) => i.confidence < 0.5) && (
              <div className="flex items-center gap-2 mt-4 text-sm text-amber-700">
                <AlertCircle size={15} />
                <span>Red-badged rows had low parse confidence — please verify amounts and dates before adding.</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
