'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useStore, labelToMonthId } from '@/store/useStore';
import Sidebar from '@/components/layout/Sidebar';
import AddExpenseModal from '@/components/shared/AddExpenseModal';
import ToastContainer from '@/components/shared/Toast';
import DashboardPage from '@/pages/DashboardPage';

// Load the heavier views only when they are opened. The dashboard should not
// have to download the charting library just to display the user's balance.
const AnalyticsPage = dynamic(() => import('@/pages/AnalyticsPage'));
const SummaryPage = dynamic(() => import('@/pages/SummaryPage'));
const RecurringPage = dynamic(() => import('@/pages/RecurringPage'));
const SettingsPage = dynamic(() => import('@/pages/SettingsPage'));
const ImportReviewPage = dynamic(() => import('@/pages/ImportReviewPage'));
const LoansPage = dynamic(() => import('@/pages/LoansPage'));

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const {
    currentPage, selectedMonth, loadedMonths, dataErrors, loading,
    onFetchMonthData, onFetchAnalytics, onFetchRecurring, onFetchSummary,
    fetchImportQueue, setUserProfile, startImportPolling, stopImportPolling,
  } = useStore();

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      setUserProfile(session.user.name ?? '', session.user.email ?? '');
    }
  }, [session, setUserProfile]);

  // Bank-import count can refresh in the background independently.
  useEffect(() => {
    if (status !== 'authenticated') return;
    void fetchImportQueue();
    startImportPolling();
    return () => stopImportPolling();
  }, [status, fetchImportQueue, startImportPolling, stopImportPolling]);

  const monthId = labelToMonthId(selectedMonth);
  const key =
    currentPage === 'dashboard' ? 'dashboard'
    : currentPage === 'analytics' ? 'analytics'
    : currentPage === 'summary' ? 'summary'
    : currentPage === 'recurring' ? 'recurring'
    : null;

  // Fetch only the selected page's financial data. Keep a successful month's
  // data until it is invalidated, and never show a different month's amounts.
  useEffect(() => {
    if (status !== 'authenticated' || !key || loadedMonths[key] === monthId || dataErrors[key]) return;
    const year = Number(monthId.slice(0, 4));
    if (key === 'dashboard') void onFetchMonthData(selectedMonth, year);
    if (key === 'analytics') void onFetchAnalytics(selectedMonth, year);
    if (key === 'summary') void onFetchSummary(selectedMonth, year);
    if (key === 'recurring') void onFetchRecurring();
  }, [
    status, key, monthId, selectedMonth, loadedMonths, dataErrors,
    onFetchMonthData, onFetchAnalytics, onFetchSummary, onFetchRecurring,
  ]);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="font-serif-display text-[40px] text-sage-dark mb-4">WJ</div>
          <div className="w-6 h-6 border-2 border-sage-dark/30 border-t-sage-dark rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  const retry = () => {
    if (!key) return;
    const year = Number(monthId.slice(0, 4));
    if (key === 'dashboard') void onFetchMonthData(selectedMonth, year);
    if (key === 'analytics') void onFetchAnalytics(selectedMonth, year);
    if (key === 'summary') void onFetchSummary(selectedMonth, year);
    if (key === 'recurring') void onFetchRecurring();
  };

  const ready = !key || loadedMonths[key] === monthId;
  const renderPage = () => {
    if (!ready) {
      return (
        <div className="flex flex-1 items-center justify-center px-6 py-20" role="status" aria-live="polite">
          {key && dataErrors[key] && !loading[key] ? (
            <div className="text-center">
              <p className="text-text-secondary mb-3">{dataErrors[key]}</p>
              <button onClick={retry} className="bg-sage-dark text-white rounded px-4 py-2">Retry</button>
            </div>
          ) : (
            <div className="text-center text-text-secondary">
              <div className="w-6 h-6 mx-auto mb-3 border-2 border-sage-dark/30 border-t-sage-dark rounded-full animate-spin" />
              Loading {selectedMonth} financial data…
            </div>
          )}
        </div>
      );
    }
    switch (currentPage) {
      case 'dashboard': return <DashboardPage />;
      case 'analytics': return <AnalyticsPage />;
      case 'summary': return <SummaryPage />;
      case 'recurring': return <RecurringPage />;
      case 'settings': return <SettingsPage />;
      case 'import-review': return <ImportReviewPage />;
      case 'loans': return <LoansPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Sidebar />
      <main className="lg:ml-[240px] flex-1 flex flex-col min-h-screen">
        {renderPage()}
      </main>
      <AddExpenseModal />
      <ToastContainer />
    </div>
  );
}
