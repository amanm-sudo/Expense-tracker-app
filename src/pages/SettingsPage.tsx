'use client';

import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import { useStore } from '@/store/useStore';

// ── Confirmation modal ───────────────────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded shadow-card-xl p-8 max-w-sm w-full">
        <p className="text-text-primary text-sm leading-relaxed mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-text-secondary border border-gray-border rounded hover:bg-gray-bg/50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm font-medium text-white bg-terracotta rounded hover:bg-[#8B3A1E] transition-colors">
            Delete Everything
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Toggle switch (fixed alignment) ─────────────────────────────────────────
function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={enabled}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
        transition-colors duration-200 ease-in-out focus:outline-none
        ${enabled ? 'bg-sage-dark' : 'bg-gray-border'}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
          transition duration-200 ease-in-out
          ${enabled ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { addToast, dashboard, setIncome, userName, userEmail, updateUserName } = useStore();

  const [displayName, setDisplayName] = useState(userName);
  const [nameSaving, setNameSaving] = useState(false);
  const [notifications, setNotifications] = useState({
    recurringReminders: true,
    weeklySummary: false,
    monthlyInsights: true,
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  // Sync name when session loads
  useEffect(() => {
    if (userName) setDisplayName(userName);
  }, [userName]);

  const handleSaveName = async () => {
    const trimmed = displayName.trim();
    if (!trimmed) return addToast('Name cannot be empty', 'error');
    if (trimmed === userName) return addToast('No changes to save', 'info');
    setNameSaving(true);
    await updateUserName(trimmed);
    setNameSaving(false);
  };

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      addToast(next[key] ? 'Notification enabled' : 'Notification disabled', 'success');
      return next;
    });
  };

  const handleExportCSV = () => {
    const rows = dashboard.recentExpenses;
    if (rows.length === 0) return addToast('No data to export yet', 'error');
    const header = 'Name,Category,Amount (₹),Date\n';
    const body = rows.map((e) => `"${e.name}","${e.category}",${e.amount.toFixed(2)},"${e.date}"`).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wealth-journal-export.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('CSV downloaded successfully', 'success');
  };

  const handleDeleteAll = async () => {
    setShowDeleteConfirm(false);
    try {
      const res = await fetch('/api/expenses/all', { method: 'DELETE' });
      if (res.ok) addToast('All data deleted', 'success');
      else addToast('Could not delete — please try again', 'error');
    } catch {
      addToast('Could not delete — please try again', 'error');
    }
  };

  return (
    <>
      {showDeleteConfirm && (
        <ConfirmModal
          message="Are you sure you want to delete ALL your expense data? This cannot be undone."
          onConfirm={handleDeleteAll}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
      {showSignOutConfirm && (
        <ConfirmModal
          message="Are you sure you want to sign out of Wealth Journal?"
          onConfirm={() => signOut({ callbackUrl: '/login' })}
          onCancel={() => setShowSignOutConfirm(false)}
        />
      )}

      <div className="min-h-full flex flex-col">
        <TopBar pageTitle="Financial Journal" />

        <div className="px-4 md:px-8 pb-10 flex-1 flex flex-col">
          <div className="mb-8">
            <div className="text-text-muted text-[11px] font-semibold uppercase tracking-[0.08em] mb-2">Preferences</div>
            <h1 className="font-serif-display text-2xl md:text-[28px] text-text-primary mb-2">Settings</h1>
            <p className="text-text-secondary text-sm">Manage your account preferences and journal configuration.</p>
          </div>

          <div className="space-y-4 max-w-lg">

            {/* Account */}
            <div className="bg-white border border-gray-border rounded shadow-card-sm p-6">
              <h3 className="font-serif-display text-lg text-text-primary mb-4">Account</h3>
              <div className="space-y-4">

                {/* Email (read-only) */}
                <div>
                  <label className="text-text-muted text-[11px] font-semibold uppercase tracking-[0.08em] block mb-2">Email</label>
                  <div className="w-full bg-gray-bg border border-gray-border rounded px-4 py-2.5 text-sm text-text-secondary">
                    {userEmail || '—'}
                  </div>
                </div>

                {/* Display Name */}
                <div>
                  <label className="text-text-muted text-[11px] font-semibold uppercase tracking-[0.08em] block mb-2">Display Name</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                      className="flex-1 bg-white border border-gray-border rounded px-4 py-2.5 text-sm text-text-primary
                        outline-none transition-all focus:border-sage-dark"
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={nameSaving}
                      className="px-4 py-2.5 bg-sage-dark text-white text-sm font-medium rounded hover:bg-[#333F33] transition-colors disabled:opacity-50"
                    >
                      {nameSaving ? (
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Saving
                        </span>
                      ) : 'Save'}
                    </button>
                  </div>
                  <p className="text-text-muted text-xs mt-1.5">Updates your name across the whole app instantly.</p>
                </div>

                {/* Monthly Income */}
                <div>
                  <label className="text-text-muted text-[11px] font-semibold uppercase tracking-[0.08em] block mb-2">Monthly Income (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={dashboard.incomeThisMonth}
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!Number.isNaN(val) && val >= 0) setIncome(val);
                    }}
                    className="w-full bg-white border border-gray-border rounded px-4 py-2.5 text-sm text-text-primary
                      outline-none transition-all focus:border-sage-dark"
                  />
                  <p className="text-text-muted text-xs mt-1">Click outside the field to save</p>
                </div>

                {/* Currency */}
                <div>
                  <label className="text-text-muted text-[11px] font-semibold uppercase tracking-[0.08em] block mb-2">Currency</label>
                  <select
                    defaultValue="INR"
                    onChange={() => addToast('Currency is fixed to ₹ INR for this app', 'info')}
                    className="w-full bg-white border border-gray-border rounded px-4 py-2.5 text-sm text-text-primary
                      outline-none transition-all focus:border-sage-dark"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-white border border-gray-border rounded shadow-card-sm p-6">
              <h3 className="font-serif-display text-lg text-text-primary mb-4">Notifications</h3>
              <div className="space-y-1">
                {([
                  { key: 'recurringReminders' as const, label: 'Recurring payment reminders', desc: 'Get notified before bills are due' },
                  { key: 'weeklySummary' as const, label: 'Weekly summary', desc: 'Receive a weekly spending digest' },
                  { key: 'monthlyInsights' as const, label: 'Monthly AI insights', desc: 'Get your personal financial narrative' },
                ] as const).map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-3">
                    <div>
                      <div className="text-sm font-medium text-text-primary">{item.label}</div>
                      <div className="text-xs text-text-secondary mt-0.5">{item.desc}</div>
                    </div>
                    <Toggle enabled={notifications[item.key]} onToggle={() => toggleNotification(item.key)} />
                  </div>
                ))}
              </div>
            </div>

            {/* Data */}
            <div className="bg-white border border-gray-border rounded shadow-card-sm p-6">
              <h3 className="font-serif-display text-lg text-text-primary mb-4">Data</h3>
              <div className="space-y-3">
                <button onClick={handleExportCSV} className="w-full text-left px-4 py-3 border border-gray-border rounded text-sm font-medium text-text-primary hover:bg-gray-bg/50 transition-colors">
                  Export all data (CSV)
                </button>
                <button onClick={() => setShowDeleteConfirm(true)} className="w-full text-left px-4 py-3 border border-terracotta/30 rounded text-sm font-medium text-terracotta hover:bg-terracotta/5 transition-colors">
                  Delete all data
                </button>
              </div>
            </div>

            {/* Sign out */}
            <div className="bg-white border border-gray-border rounded shadow-card-sm p-6">
              <h3 className="font-serif-display text-lg text-text-primary mb-4">Session</h3>
              <button
                onClick={() => setShowSignOutConfirm(true)}
                className="flex items-center gap-2 px-4 py-3 border border-gray-border rounded text-sm font-medium text-text-primary hover:bg-gray-bg/50 transition-colors"
              >
                <LogOut size={16} className="text-text-muted" />
                Sign out of Wealth Journal
              </button>
            </div>

          </div>

          {/* Footer */}
          <footer className="pt-6 border-t border-gray-border flex flex-col sm:flex-row items-center justify-between gap-3 mt-auto">
            <div className="flex items-center gap-3 text-[13px]">
              <span className="font-medium text-text-primary">Wealth Journal</span>
              <span className="text-text-muted">|</span>
              <span className="text-text-secondary">Handcrafted for you. &copy; 2026 Financial Journal.</span>
            </div>
            <div className="flex items-center gap-4 text-[13px] text-text-secondary">
              <a href="#" className="hover:text-text-primary hover:underline transition-colors">Privacy</a>
              <a href="#" className="hover:text-text-primary hover:underline transition-colors">Terms</a>
              <a href="#" className="hover:text-text-primary hover:underline transition-colors">Support</a>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
