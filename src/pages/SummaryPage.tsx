'use client';

import { useStore } from '@/store/useStore';
import { PlusCircle, UtensilsCrossed, Bus, BookOpen } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';

const iconMap: Record<string, React.ElementType> = {
  UtensilsCrossed,
  Bus,
};

export default function SummaryPage() {
  const { summary, onGetAIInsights, selectedMonth, loading } = useStore();

  const handleRegenerate = () => {
    const match = selectedMonth.match(/^(\w+)\s+(\d{4})$/);
    const year = match ? parseInt(match[2], 10) : new Date().getFullYear();
    onGetAIInsights(selectedMonth, year);
  };

  return (
    <div className="min-h-full flex flex-col">
      <TopBar pageTitle="Financial Journal" />

      <div className="px-4 md:px-8 pb-10 flex-1 flex flex-col">
        {/* Statement Header */}
        <div className="mb-8 animate-slide-up">
          <div className="flex items-start justify-between mb-2">
            <div className="text-terracotta text-[11px] font-semibold uppercase tracking-[0.08em]">
              Monthly Statement
            </div>
            <BookOpen size={24} className="text-text-muted" strokeWidth={1} />
          </div>
          <h1 className="font-serif-display text-2xl md:text-[32px] text-text-primary mb-2">
            {summary.month} Summary
          </h1>
          <p className="font-quote text-base italic text-text-secondary">
            Reflecting on thirty-one days of financial intentionality.
          </p>
        </div>

        {/* Totals Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {/* Total Monthly Spend */}
          <div className="bg-white border border-gray-border rounded shadow-card-sm p-6 animate-slide-up" style={{ animationDelay: '60ms' }}>
            <div className="text-text-muted text-[11px] font-semibold uppercase tracking-[0.08em] mb-2">
              Total Monthly Spend
            </div>
            <div className="font-serif-display text-[28px] text-text-primary mb-4">
              ${summary.totalMonthlySpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="w-full h-1 bg-gray-bg rounded-full overflow-hidden">
              <div className="h-full bg-sage-dark rounded-full" style={{ width: '50%' }} />
            </div>
          </div>

          {/* Total Amount Saved */}
          <div className="bg-white border border-gray-border rounded shadow-card-sm p-6 animate-slide-up" style={{ animationDelay: '120ms' }}>
            <div className="text-text-muted text-[11px] font-semibold uppercase tracking-[0.08em] mb-2">
              Total Amount Saved
            </div>
            <div className="font-serif-display text-[28px] text-text-primary mb-4">
              ${summary.totalAmountSaved.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="w-full h-1 bg-gray-bg rounded-full overflow-hidden">
              <div className="h-full bg-sage-dark rounded-full" style={{ width: '38%' }} />
            </div>
          </div>
        </div>

        {/* Top Spending Categories */}
        <div className="mb-8 animate-slide-up" style={{ animationDelay: '180ms' }}>
          <div className="flex items-center gap-2 mb-5">
            <PlusCircle size={20} className="text-text-secondary" strokeWidth={1.5} />
            <h2 className="font-serif-display text-lg text-text-primary">
              Top Spending Categories
            </h2>
          </div>

          {/* Category cards - 2x2 grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {summary.topCategories.map((cat, index) => {
              const Icon = cat.icon ? iconMap[cat.icon] : null;

              if (cat.cardType === 'dark') {
                return (
                  <div
                    key={index}
                    className="bg-sage-dark rounded shadow-card-sm p-6 animate-slide-up"
                    style={{ animationDelay: `${200 + index * 80}ms` }}
                  >
                    {Icon && <Icon size={20} className="text-white mb-3" strokeWidth={1.5} />}
                    <div className="font-serif-display text-lg text-white mb-1">{cat.name}</div>
                    <div className="font-serif-display text-[22px] text-white mb-1">
                      ${cat.amount.toLocaleString()}
                    </div>
                    {cat.trend && (
                      <div className="text-white/60 text-[11px]">{cat.trend}</div>
                    )}
                  </div>
                );
              }

              if (cat.cardType === 'gray') {
                return (
                  <div
                    key={index}
                    className="bg-gray-bg rounded shadow-card-sm p-6 animate-slide-up"
                    style={{ animationDelay: `${200 + index * 80}ms` }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-serif-display text-lg text-text-primary mb-1">{cat.name}</div>
                        {cat.description && (
                          <p className="text-[13px] text-text-secondary leading-relaxed max-w-[200px]">
                            {cat.description}
                          </p>
                        )}
                      </div>
                      {cat.percentage > 0 && (
                        <div className="font-serif-display text-[22px] text-text-primary">
                          {cat.percentage}%
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              // Light card (Shelter & Living)
              return (
                <div
                  key={index}
                  className="bg-white border border-gray-border rounded shadow-card-sm p-6 animate-slide-up"
                  style={{ animationDelay: `${200 + index * 80}ms` }}
                >
                  {Icon && <Icon size={20} className="text-sage-dark mb-3" strokeWidth={1.5} />}
                  <div className="font-serif-display text-lg text-text-primary mb-1">{cat.name}</div>
                  {cat.description && (
                    <p className="text-[13px] text-text-secondary mb-3">{cat.description}</p>
                  )}
                  {cat.subLabel && (
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-text-secondary">{cat.subLabel}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-serif-display text-lg text-text-primary">
                          ${cat.amount.toLocaleString()}
                        </span>
                        <span className="text-[13px] text-text-secondary">{cat.percentage}%</span>
                      </div>
                    </div>
                  )}
                  <div className="w-full h-1 bg-gray-bg rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-sage-dark rounded-full" style={{ width: `${cat.percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Personal Note */}
        <div className="animate-slide-up mt-auto" style={{ animationDelay: '400ms' }}>
          {/* Dashed separator */}
          <div className="relative border-t border-dashed border-gray-border my-8">
            {/* Sticker label */}
            <div className="absolute left-4 -top-3 bg-white border border-gray-border rounded px-4 py-1.5 shadow-card-md flex items-center gap-3">
              <span className="font-quote text-base italic text-text-secondary">
                A personal note for you
              </span>
              <button
                onClick={handleRegenerate}
                disabled={loading.insights}
                className="text-[11px] font-semibold uppercase tracking-[0.06em] text-sage-dark hover:text-terracotta transition-colors disabled:opacity-50"
              >
                {loading.insights ? 'Writing…' : 'Regenerate'}
              </button>
            </div>
          </div>

          {/* Letter */}
          <div className="pt-8 pb-6 px-4 md:px-8">
            <div className="max-w-xl">
              {/* Greeting */}
              <p className="font-quote text-lg text-text-primary mb-5">
                {summary.aiPersonalNote.greeting}
              </p>

              {/* Body paragraphs */}
              {summary.aiPersonalNote.bodyParagraphs.map((paragraph, i) => (
                <p
                  key={i}
                  className="font-quote text-base text-text-primary leading-[1.8] mb-5"
                >
                  {paragraph}
                </p>
              ))}

              {/* Closing */}
              <p className="font-quote text-base italic text-text-primary mb-2">
                {summary.aiPersonalNote.closing}
              </p>
              <p className="font-quote text-lg italic text-terracotta">
                {summary.aiPersonalNote.signature}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
