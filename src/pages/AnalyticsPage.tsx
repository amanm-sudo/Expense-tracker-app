'use client';

import { useStore } from '@/store/useStore';
import { TrendingUp } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-sage-dark text-white text-xs py-2 px-3 rounded shadow-card-md">
      <div className="font-medium">{format(parseISO(label || ''), 'MMM dd')}</div>
      <div className="tabular-nums">₹{payload[0].value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
    </div>
  );
};

export default function AnalyticsPage() {
  const { analytics } = useStore();

  return (
    <div className="min-h-full flex flex-col">
      <TopBar pageTitle="Financial Journal" />

      <div className="px-4 md:px-8 pb-10 flex-1 flex flex-col">
        {/* Monthly Narrative */}
        <div className="mb-8 animate-slide-up">
          <div className="text-text-muted text-[11px] font-semibold uppercase tracking-[0.08em] mb-2">
            Monthly Narrative
          </div>
          <p className="font-serif-display text-lg md:text-[22px] text-text-primary leading-relaxed max-w-2xl">
            {analytics.monthlyNarrative}
          </p>
        </div>

        {/* Category Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {/* Highest Category */}
          <div className="bg-white border border-gray-border rounded shadow-card-sm p-5 animate-slide-up" style={{ animationDelay: '60ms' }}>
            <div className="text-text-muted text-[11px] font-semibold uppercase tracking-[0.08em] mb-2">
              Highest Category
            </div>
            <div className="font-serif-display text-xl text-text-primary mb-1">
              {analytics.highestCategory.name}
            </div>
            <div className="text-[13px] text-terracotta">
              {analytics.highestCategory.percentage}% of total spend
            </div>
          </div>

          {/* Lowest Category */}
          <div className="bg-white border border-gray-border rounded shadow-card-sm p-5 animate-slide-up" style={{ animationDelay: '120ms' }}>
            <div className="text-text-muted text-[11px] font-semibold uppercase tracking-[0.08em] mb-2">
              Lowest Category
            </div>
            <div className="font-serif-display text-xl text-text-primary mb-1">
              {analytics.lowestCategory.name}
            </div>
            <div className="text-[13px] text-text-secondary">
              {analytics.lowestCategory.percentage}% of total spend
            </div>
          </div>

          {/* Quote Card */}
          <div className="bg-white border border-gray-border rounded shadow-card-sm p-5 flex items-center justify-center animate-slide-up" style={{ animationDelay: '180ms' }}>
            <p className="font-quote text-[15px] italic text-text-secondary text-center leading-relaxed">
              &quot;A budget is telling your money where to go instead of wondering where it went.&quot;
            </p>
          </div>
        </div>

        {/* Spending Trend + Current Total */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-10">
          {/* Chart */}
          <div className="lg:col-span-3 bg-white border border-gray-border rounded shadow-card-sm p-5 md:p-6 animate-slide-up">
            <h3 className="font-serif-display text-xl text-text-primary mb-0.5">
              Spending Trend
            </h3>
            <p className="text-text-secondary text-[13px] mb-5">
              Daily velocity of personal capital throughout the month.
            </p>
            <div className="h-[220px] md:h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.spendingTrend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid
                    strokeDasharray="0"
                    vertical={false}
                    stroke="rgba(213,208,200,0.4)"
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => format(parseISO(date), 'MMM dd').toUpperCase()}
                    tick={{ fontSize: 11, fill: '#9B9590' }}
                    axisLine={false}
                    tickLine={false}
                    dy={8}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#9B9590' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#D5D0C8', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#2D3B2D"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#2D3B2D', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#2D3B2D', stroke: '#fff', strokeWidth: 2 }}
                    animationDuration={800}
                    animationEasing="ease-out"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Current Total Card */}
          <div className="bg-sage-dark rounded shadow-card-sm p-6 flex flex-col justify-center animate-slide-up" style={{ animationDelay: '100ms' }}>
            <div className="text-white/50 text-[11px] font-semibold uppercase tracking-[0.08em] mb-3">
              Current Total
            </div>
            <div className="font-serif-display text-2xl md:text-[28px] text-white mb-3">
              ₹{analytics.currentTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1.5 text-white/70 text-[13px]">
              <TrendingUp size={14} />
              <span>{analytics.percentChangeFromLastMonth}% from last month</span>
            </div>
          </div>
        </div>


        {/* Charts use the expense-only totals from the server. */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-10">
          <section className="bg-white border border-gray-border rounded shadow-card-sm p-5 md:p-6">
            <h3 className="font-serif-display text-xl text-text-primary mb-1">Where your money went</h3>
            <p className="text-xs text-text-secondary mb-4">Expense categories (excluding incoming credits).</p>
            {analytics.categoryBreakdown.length === 0 ? (
              <div className="h-[230px] flex items-center justify-center text-sm text-text-muted">No expenses this month.</div>
            ) : (
              <div className="h-[230px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={analytics.categoryBreakdown} dataKey="amount" nameKey="name"
                      cx="50%" cy="48%" outerRadius={90} innerRadius={48} paddingAngle={2}>
                      {analytics.categoryBreakdown.map((item) => <Cell key={item.name} fill={item.color} />)}
                    </Pie>
                    <Tooltip formatter={(value) => "₹" + Number(value).toLocaleString('en-IN')} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="space-y-2">
              {analytics.categoryBreakdown.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs gap-3">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="truncate text-text-secondary">{item.name}</span>
                  </span>
                  <span className="font-semibold tabular-nums text-text-primary shrink-0">
                    {analytics.currentTotal > 0 ? Math.round(item.amount / analytics.currentTotal * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </section>
          <section className="bg-white border border-gray-border rounded shadow-card-sm p-5 md:p-6">
            <h3 className="font-serif-display text-xl text-text-primary mb-1">Daily expenses</h3>
            <p className="text-xs text-text-secondary mb-4">A daily, non-cumulative view of your spending.</p>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.dailySpending} margin={{ top: 8, right: 6, left: -12, bottom: 2 }}>
                  <CartesianGrid vertical={false} stroke="#E8E4DF" />
                  <XAxis dataKey="date" tickFormatter={(v: string) => v.slice(-2)}
                    interval={4} tick={{ fontSize: 11, fill: '#9B9590' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v: number) => "₹" + v} tick={{ fontSize: 11, fill: '#9B9590' }}
                    axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => "₹" + Number(value).toLocaleString('en-IN')}
                    labelFormatter={(label: string) => "Day " + String(label).slice(-2)} />
                  <Bar dataKey="amount" fill="#2D3B2D" maxBarSize={24} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-10">
          <section className="bg-white border border-gray-border rounded shadow-card-sm p-5 md:p-6">
            <h3 className="font-serif-display text-xl text-text-primary mb-1">Income vs spending</h3>
            <p className="text-xs text-text-secondary mb-4">Monthly income and credits compared with actual expenses.</p>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.incomeVsExpenses} layout="vertical" margin={{ top: 5, right: 18, left: 25, bottom: 5 }}>
                  <XAxis type="number" tickFormatter={(v: number) => "₹" + v} tick={{ fontSize: 11, fill: '#9B9590' }} />
                  <YAxis type="category" dataKey="name" width={115} tick={{ fontSize: 11, fill: '#68625D' }} />
                  <Tooltip formatter={(value) => "₹" + Number(value).toLocaleString('en-IN')} />
                  <Bar dataKey="amount" fill="#5C6B5C" maxBarSize={32} radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-text-muted mt-2">{analytics.transactionCount} expense transactions this month.</p>
          </section>
          <section className="bg-white border border-gray-border rounded shadow-card-sm p-5 md:p-6">
            <h3 className="font-serif-display text-xl text-text-primary mb-1">Top merchants</h3>
            <p className="text-xs text-text-secondary mb-4">Where you have spent the most this month.</p>
            {analytics.topMerchants.length ? (
              <div className="space-y-3">
                {analytics.topMerchants.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between gap-3 text-sm border-b border-gray-border/60 pb-2">
                    <span className="text-text-primary truncate"><span className="text-text-muted mr-2">{i + 1}.</span>{item.name}</span>
                    <span className="font-semibold tabular-nums shrink-0">₹{item.amount.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-text-muted">No merchant data yet.</p>}
          </section>
        </div>

        {/* Category Breakdown */}
        <div className="mb-10 animate-slide-up" style={{ animationDelay: '150ms' }}>
          <h3 className="font-serif-display text-xl text-text-primary mb-0.5">
            Category Breakdown
          </h3>
          <p className="text-text-secondary text-[13px] mb-5 max-w-lg">
            A proportional analysis of how your wealth was distributed across key sectors this period.
          </p>

          <div className="space-y-4">
            {analytics.categoryBreakdown.map((cat) => {
              const maxAmount = Math.max(...analytics.categoryBreakdown.map((c) => c.amount));
              const barWidth = maxAmount > 0 ? (cat.amount / maxAmount) * 100 : 0;
              return (
                <div key={cat.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-text-primary">{cat.name}</span>
                    <span className="text-sm font-medium text-text-primary tabular-nums">
                      ₹{cat.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="w-full h-1 bg-gray-bg rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${barWidth}%`, backgroundColor: cat.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hero Banner */}
        <div
          className="relative w-full h-[180px] md:h-[200px] rounded overflow-hidden bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1200&h=400&fit=crop)',
          }}
        >
          <div className="absolute inset-0 bg-black/35 flex flex-col items-center justify-center text-center px-4">
            <h3 className="font-serif-display text-2xl md:text-[28px] text-white mb-2">
              The Art of Record
            </h3>
            <p className="text-white text-[11px] font-semibold uppercase tracking-[0.12em]">
              Reflection Leads to Intentionality.
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-auto pt-6 border-t border-gray-border flex flex-col sm:flex-row items-center justify-between gap-3">
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
    </div>
  );
}
