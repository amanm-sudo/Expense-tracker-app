'use client';

import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import Sidebar from '@/components/layout/Sidebar';
import AddExpenseModal from '@/components/shared/AddExpenseModal';
import ToastContainer from '@/components/shared/Toast';
import DashboardPage from '@/pages/DashboardPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import SummaryPage from '@/pages/SummaryPage';
import RecurringPage from '@/pages/RecurringPage';
import SettingsPage from '@/pages/SettingsPage';

export default function Home() {
  const { currentPage, refreshAll } = useStore();

  // Fetch all data on mount so the UI hydrates from the backend
  useEffect(() => {
    refreshAll();
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'summary':
        return <SummaryPage />;
      case 'recurring':
        return <RecurringPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
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
