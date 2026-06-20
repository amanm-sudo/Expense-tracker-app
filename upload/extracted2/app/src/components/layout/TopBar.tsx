import { Search, Bell, ChevronDown } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useState } from 'react';

interface TopBarProps {
  pageTitle?: string;
}

export default function TopBar({ pageTitle = 'Financial Journal' }: TopBarProps) {
  const { selectedMonth, setSelectedMonth } = useStore();
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);

  const months = [
    'January 2024',
    'February 2024',
    'March 2024',
    'April 2024',
    'May 2024',
    'June 2024',
  ];

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
                    onClick={() => {
                      setSelectedMonth(m);
                      setMonthDropdownOpen(false);
                    }}
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

        {/* Reports button - only on some pages */}
        <button className="hidden sm:block text-xs font-medium text-sage-dark bg-gray-bg px-4 py-1.5 rounded hover:bg-gray-border/60 transition-colors">
          Reports
        </button>

        {/* Search */}
        <button className="text-text-secondary hover:text-text-primary transition-colors p-1">
          <Search size={20} strokeWidth={1.5} />
        </button>

        {/* Notifications */}
        <button className="relative text-text-secondary hover:text-text-primary transition-colors p-1">
          <Bell size={20} strokeWidth={1.5} />
          <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-rust-dark rounded-full" />
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gray-bg border border-gray-border overflow-hidden flex items-center justify-center text-xs font-medium text-text-secondary">
          <img
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=face"
            alt="Profile"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      </div>
    </header>
  );
}
