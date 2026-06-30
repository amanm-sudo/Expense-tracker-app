'use client';

import { Search, Bell, ChevronDown, LogOut } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { signOut } from 'next-auth/react';
import { useState } from 'react';

interface TopBarProps {
  pageTitle?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Generate last `count` months as "Month Year" labels, most recent first. */
function recentMonthLabels(count: number): string[] {
  const now = new Date();
  const labels: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(`${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`);
  }
  return labels;
}

/** Get initials from a name */
function getInitials(name: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Generate avatar background color from name */
function nameToColor(name: string): string {
  const colors = ['#2D3B2D', '#A0522D', '#4A7C59', '#5C6B5C', '#8B4513', '#3D3D3D'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function TopBar({ pageTitle = 'Financial Journal' }: TopBarProps) {
  const { selectedMonth, setSelectedMonth, refreshAll, setCurrentPage, addToast, userName } = useStore();
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const months = recentMonthLabels(6);
  const initials = getInitials(userName);
  const avatarBg = nameToColor(userName || 'U');

  const handleSelectMonth = (m: string) => {
    setSelectedMonth(m);
    setMonthDropdownOpen(false);
    refreshAll();
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <header className="flex items-center justify-between py-5 px-4 md:px-8">
      {/* Page title */}
      <h1 className="font-serif-display text-xl md:text-2xl text-sage-dark ml-8 lg:ml-0">
        {pageTitle}
      </h1>

      {/* Right side */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Month selector */}
        <div className="relative">
          <button
            onClick={() => setMonthDropdownOpen(!monthDropdownOpen)}
            className="flex items-center gap-1.5 text-sm font-medium text-text-primary hover:text-sage-dark transition-colors"
          >
            {selectedMonth}
            <ChevronDown size={14} className={`transition-transform ${monthDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {monthDropdownOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMonthDropdownOpen(false)} />
              <div className="absolute right-0 top-8 bg-white border border-gray-border rounded-md shadow-card-lg py-1 z-40 min-w-[160px]">
                {months.map((m) => (
                  <button
                    key={m}
                    onClick={() => handleSelectMonth(m)}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors
                      ${m === selectedMonth ? 'text-sage-dark font-medium bg-gray-bg/50' : 'text-text-secondary hover:bg-gray-bg/30'}
                    `}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Reports button */}
        <button
          onClick={() => addToast('Reports feature coming soon', 'info')}
          className="hidden sm:block text-xs font-medium text-sage-dark bg-gray-bg px-4 py-1.5 rounded hover:bg-gray-border/60 transition-colors"
        >
          Reports
        </button>

        {/* Search */}
        <button
          onClick={() => addToast('Search feature coming soon', 'info')}
          className="text-text-secondary hover:text-text-primary transition-colors p-1"
          aria-label="Search"
        >
          <Search size={20} strokeWidth={1.5} />
        </button>

        {/* Notifications */}
        <button
          onClick={() => addToast('No new notifications', 'info')}
          className="relative text-text-secondary hover:text-text-primary transition-colors p-1"
          aria-label="Notifications"
        >
          <Bell size={20} strokeWidth={1.5} />
        </button>

        {/* Avatar — click to open profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold
              hover:ring-2 hover:ring-sage-dark/30 transition-all"
            style={{ backgroundColor: avatarBg }}
            aria-label="Profile menu"
            title={userName}
          >
            {initials}
          </button>
          {profileOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 top-10 bg-white border border-gray-border rounded-md shadow-card-lg py-1 z-40 min-w-[180px]">
                <div className="px-4 py-3 border-b border-gray-border">
                  <div className="text-sm font-medium text-text-primary">{userName}</div>
                  <div className="text-xs text-text-muted mt-0.5">Signed in</div>
                </div>
                <button
                  onClick={() => { setCurrentPage('settings'); setProfileOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-text-secondary hover:bg-gray-bg/50 transition-colors"
                >
                  Settings
                </button>
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-2.5 text-sm text-terracotta hover:bg-terracotta/5 transition-colors flex items-center gap-2"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
