'use client';

import TopBar from '@/components/layout/TopBar';
import { useStore } from '@/store/useStore';

export default function SettingsPage() {
  const { addToast, dashboard, setIncome } = useStore();

  return (
    <div className="min-h-full flex flex-col">
      <TopBar pageTitle="Financial Journal" />

      <div className="px-4 md:px-8 pb-10 flex-1 flex flex-col">
        <div className="mb-8">
          <div className="text-text-muted text-[11px] font-semibold uppercase tracking-[0.08em] mb-2">
            Preferences
          </div>
          <h1 className="font-serif-display text-2xl md:text-[28px] text-text-primary mb-2">
            Settings
          </h1>
          <p className="text-text-secondary text-sm">
            Manage your account preferences and journal configuration.
          </p>
        </div>

        <div className="space-y-4 max-w-lg">
          {/* Account Section */}
          <div className="bg-white border border-gray-border rounded shadow-card-sm p-6">
            <h3 className="font-serif-display text-lg text-text-primary mb-4">Account</h3>
            <div className="space-y-4">
              <div>
                <label className="text-text-muted text-[11px] font-semibold uppercase tracking-[0.08em] block mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  defaultValue="Alex"
                  className="w-full bg-white border border-gray-border rounded px-4 py-2.5 text-sm text-text-primary 
                    outline-none transition-all focus:border-sage-dark"
                />
              </div>
              <div>
                <label className="text-text-muted text-[11px] font-semibold uppercase tracking-[0.08em] block mb-2">
                  Monthly Income
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={dashboard.incomeThisMonth}
                  onBlur={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!Number.isNaN(val) && val >= 0) {
                      setIncome(val);
                    }
                  }}
                  className="w-full bg-white border border-gray-border rounded px-4 py-2.5 text-sm text-text-primary 
                    outline-none transition-all focus:border-sage-dark"
                />
              </div>
              <div>
                <label className="text-text-muted text-[11px] font-semibold uppercase tracking-[0.08em] block mb-2">
                  Currency
                </label>
                <select
                  defaultValue="USD"
                  className="w-full bg-white border border-gray-border rounded px-4 py-2.5 text-sm text-text-primary 
                    outline-none transition-all focus:border-sage-dark"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="bg-white border border-gray-border rounded shadow-card-sm p-6">
            <h3 className="font-serif-display text-lg text-text-primary mb-4">Notifications</h3>
            <div className="space-y-3">
              {[
                { label: 'Recurring payment reminders', desc: 'Get notified before bills are due' },
                { label: 'Weekly summary', desc: 'Receive a weekly spending digest' },
                { label: 'Monthly AI insights', desc: 'Get your personal financial narrative' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-sm font-medium text-text-primary">{item.label}</div>
                    <div className="text-xs text-text-secondary">{item.desc}</div>
                  </div>
                  <button
                    onClick={() => addToast('Preference updated', 'success')}
                    className="w-10 h-6 bg-sage-dark rounded-full relative transition-colors"
                    aria-label={`Toggle ${item.label}`}
                  >
                    <span className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Data Section */}
          <div className="bg-white border border-gray-border rounded shadow-card-sm p-6">
            <h3 className="font-serif-display text-lg text-text-primary mb-4">Data</h3>
            <div className="space-y-3">
              <button
                onClick={() => addToast('Export started — you will receive an email shortly', 'info')}
                className="w-full text-left px-4 py-3 border border-gray-border rounded text-sm font-medium text-text-primary
                  hover:bg-gray-bg/50 transition-colors"
              >
                Export all data (CSV)
              </button>
              <button
                onClick={() => addToast('This feature requires confirmation', 'error')}
                className="w-full text-left px-4 py-3 border border-terracotta/30 rounded text-sm font-medium text-terracotta
                  hover:bg-terracotta/5 transition-colors"
              >
                Delete all data
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="pt-6 border-t border-gray-border flex flex-col sm:flex-row items-center justify-between gap-3 mt-auto">
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
