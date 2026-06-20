import { useStore } from '@/store/useStore';
import { Dumbbell, Monitor, Globe } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';

const iconMap: Record<string, React.ElementType> = {
  Dumbbell,
  Monitor,
  Globe,
};

const timeGroupLabels: Record<string, string> = {
  early: 'Early Month',
  mid: 'Mid Month',
  late: 'Late Month',
};

export default function RecurringPage() {
  const { recurring } = useStore();

  // Group obligations by timeGroup
  const grouped = recurring.obligations.reduce((acc, item) => {
    if (!acc[item.timeGroup]) acc[item.timeGroup] = [];
    acc[item.timeGroup].push(item);
    return acc;
  }, {} as Record<string, typeof recurring.obligations>);

  const timeGroupOrder: Array<keyof typeof timeGroupLabels> = ['early', 'mid', 'late'];

  return (
    <div className="min-h-full">
      <TopBar pageTitle="Financial Journal" />

      <div className="px-4 md:px-8 pb-10">
        {/* Header */}
        <div className="mb-8 animate-slide-up">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="text-terracotta text-[11px] font-semibold uppercase tracking-[0.08em] mb-2">
                Automated Outflows
              </div>
              <h1 className="font-serif-display text-2xl md:text-[28px] text-text-primary mb-2">
                Recurring Obligations
              </h1>
              <p className="text-text-secondary text-sm leading-relaxed max-w-xl">
                A refined ledger of your repeating commitments, organized chronologically to maintain clarity of your upcoming financial narrative.
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-text-muted text-[11px] font-semibold uppercase tracking-[0.08em] mb-1">
                Monthly Total
              </div>
              <div className="font-serif-display text-xl text-text-primary">
                ${recurring.monthlyTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        <hr className="border-gray-border mb-8" />

        {/* Recurring Items by time group */}
        <div className="mb-10">
          {timeGroupOrder.map((groupKey) => {
            const items = grouped[groupKey];
            if (!items?.length) return null;

            return (
              <div key={groupKey} className="mb-6">
                <div className="text-text-muted text-xs font-semibold uppercase tracking-[0.06em] mb-3">
                  {timeGroupLabels[groupKey]}
                </div>

                <div className="bg-white border border-gray-border rounded shadow-card-sm">
                  {items.map((item, index) => {
                    const Icon = iconMap[item.icon] || Globe;
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-4 px-4 md:px-6 py-4
                          ${index < items.length - 1 ? 'border-b border-gray-border' : ''}
                        `}
                      >
                        <div className="w-10 h-10 rounded-full bg-gray-bg flex items-center justify-center flex-shrink-0">
                          <Icon size={18} className="text-sage-dark" strokeWidth={1.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[15px] font-medium text-text-primary">
                            {item.name}
                          </div>
                          <div className="text-xs text-text-secondary">
                            {item.category}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 mr-3 md:mr-6">
                          <div className="text-sm text-text-primary">
                            {item.dueDay}th of month
                          </div>
                          <div className={`text-[11px] font-semibold uppercase tracking-[0.06em]
                            ${item.urgency === 'due-soon' ? 'text-terracotta' : 'text-text-muted'}
                          `}>
                            {item.urgency === 'due-soon' ? 'DUE SOON' : 'SCHEDULED'}
                          </div>
                        </div>
                        <div className="text-base font-semibold text-text-primary tabular-nums flex-shrink-0 mr-4">
                          ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="flex-shrink-0">
                          {item.status === 'paid' ? (
                            <span className="inline-block bg-paid-green-bg text-paid-green text-xs font-medium px-2.5 py-1 rounded">
                              Paid
                            </span>
                          ) : (
                            <span className="inline-block bg-pending-amber-bg text-pending-amber text-xs font-medium px-2.5 py-1 rounded animate-gentle-pulse">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {recurring.obligations.length === 0 && (
            <div className="bg-white border border-gray-border rounded shadow-card-sm p-8 text-center">
              <Globe size={48} className="mx-auto text-text-muted mb-3" />
              <p className="text-text-secondary text-sm mb-2">No recurring payments set up</p>
              <button className="mt-3 px-4 py-2 bg-sage-dark text-white text-sm font-medium rounded hover:bg-[#333F33] transition-colors">
                Add Recurring Payment
              </button>
            </div>
          )}
        </div>

        {/* Bottom Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {/* Upcoming Draft */}
          <div className="bg-white border border-gray-border rounded shadow-card-sm p-6 animate-slide-up">
            <h3 className="font-serif-display text-lg text-text-primary mb-3">
              Upcoming Draft
            </h3>
            <p className="text-[13px] text-text-secondary leading-relaxed mb-4">
              Your largest upcoming recurring payment is{' '}
              <span className="font-medium text-text-primary">{recurring.upcomingDraft.paymentName}</span>{' '}
              on the{' '}
              <span className="font-medium text-text-primary">{recurring.upcomingDraft.dueDay}th</span>.
              {' '}Ensure your Primary Account ending in *{recurring.upcomingDraft.accountEnding} is sufficiently funded.
            </p>
            <button className="text-[13px] font-medium text-text-primary underline hover:text-sage-dark transition-colors">
              Manage Funding Sources
            </button>
          </div>

          {/* Quarterly Outlook */}
          <div className="bg-sage-dark rounded shadow-card-sm p-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <h3 className="font-serif-display text-lg text-white mb-3">
              Quarterly Outlook
            </h3>
            <p className="text-[13px] text-white/70 leading-relaxed mb-5">
              Projected spending on subscriptions for Q1 2024 is trending{' '}
              {recurring.quarterlyOutlook.projectedTrend}.
            </p>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] text-white/80">Efficiency Score</span>
              <span className="text-[13px] text-white/80">{recurring.quarterlyOutlook.efficiencyScore}%</span>
            </div>
            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full"
                style={{ width: `${recurring.quarterlyOutlook.efficiencyScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="pt-6 border-t border-gray-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-[13px]">
            <span className="font-medium text-text-primary">Wealth Journal</span>
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
    </div>
  );
}
