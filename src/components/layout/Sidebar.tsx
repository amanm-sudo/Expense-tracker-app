'use client';

import { LayoutGrid, TrendingUp, Calendar, Settings, BookOpen, Plus, Menu, X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { PageView } from '@/types';
import { useState, useEffect } from 'react';

const navItems: { label: string; icon: React.ElementType; page: PageView }[] = [
  { label: 'Dashboard', icon: LayoutGrid, page: 'dashboard' },
  { label: 'Analytics', icon: TrendingUp, page: 'analytics' },
  { label: 'Recurring', icon: Calendar, page: 'recurring' },
  { label: 'Summary', icon: BookOpen, page: 'summary' },
  { label: 'Settings', icon: Settings, page: 'settings' },
];

/** Generate initials avatar background color from name */
function nameToColor(name: string): string {
  const colors = ['#2D3B2D', '#A0522D', '#4A7C59', '#5C6B5C', '#8B4513', '#3D3D3D'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

/** Get initials from a name */
function getInitials(name: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Sidebar() {
  const { currentPage, setCurrentPage, openAddExpense, userName } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Auto-collapse on smaller screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024 && window.innerWidth >= 768) {
        setCollapsed(true);
      } else if (window.innerWidth >= 1024) {
        setCollapsed(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNav = (item: (typeof navItems)[0]) => {
    setCurrentPage(item.page);
    setMobileOpen(false);
  };

  const sidebarWidth = collapsed ? 'w-16' : 'w-[240px]';
  const initials = getInitials(userName);
  const avatarBg = nameToColor(userName || 'U');

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 p-2 rounded-md bg-white shadow-card-md lg:hidden"
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen bg-white border-r border-gray-border z-40
          flex flex-col transition-all duration-300 ease-out
          ${sidebarWidth}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} 
          lg:translate-x-0
        `}
      >
        {/* Logo block */}
        <div className={`pt-8 pb-6 ${collapsed ? 'px-3' : 'px-6'}`}>
          {collapsed ? (
            <div className="text-center">
              <span className="font-serif-display text-[28px] text-sage-dark leading-none">WJ</span>
            </div>
          ) : (
            <>
              <div className="font-serif-display text-[28px] text-sage-dark leading-tight">WJ</div>
              <div className="font-serif-display text-[20px] text-sage-dark leading-tight">Wealth Journal</div>
              <div className="text-text-secondary text-xs mt-0.5">Personal Narrative</div>
            </>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 mt-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = currentPage === item.page;
            const Icon = item.icon;
            return (
              <button
                key={item.page}
                onClick={() => handleNav(item)}
                className={`w-full flex items-center h-11 rounded-md transition-all duration-200 ease-out
                  ${collapsed ? 'justify-center px-0' : 'px-4 gap-3'}
                  ${isActive
                    ? 'text-sage-dark border-l-[3px] border-sage-dark bg-transparent'
                    : 'text-text-secondary border-l-[3px] border-transparent hover:bg-sage-dark/[0.04]'
                  }
                `}
              >
                <Icon size={20} strokeWidth={1.5} />
                {!collapsed && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Add Expense button */}
        <div className={`px-4 pb-5 ${collapsed ? 'px-2' : ''}`}>
          <button
            onClick={() => {
              openAddExpense();
              setMobileOpen(false);
            }}
            className={`w-full h-11 bg-sage-dark text-white rounded-md flex items-center justify-center 
              gap-2 text-sm font-medium transition-all duration-150 ease-out
              hover:bg-[#333F33] active:scale-[0.98]
              ${collapsed ? 'px-0' : 'px-4'}
            `}
          >
            <Plus size={16} />
            {!collapsed && <span>Add Expense</span>}
          </button>
        </div>

        {/* User Profile — click to go to Settings */}
        {!collapsed && (
          <button
            onClick={() => { setCurrentPage('settings'); setMobileOpen(false); }}
            className="px-4 pb-4 pt-3 border-t border-gray-border w-full text-left hover:bg-gray-bg/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              {/* Initials avatar */}
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-semibold"
                style={{ backgroundColor: avatarBg }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-text-primary truncate">
                  {userName || 'Loading…'}
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-text-muted">
                  Tap to edit profile →
                </div>
              </div>
            </div>
          </button>
        )}

        {/* Collapse toggle (desktop only) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center py-3 text-text-muted hover:text-text-primary text-xs border-t border-gray-border transition-colors"
        >
          {collapsed ? '→' : '← Collapse'}
        </button>
      </aside>
    </>
  );
}
