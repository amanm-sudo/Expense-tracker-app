'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
  const { data: session, status } = useSession();
  const router = useRouter();
  const { currentPage, refreshAll, setUserProfile } = useStore();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Seed the store with the logged-in user's name/email from session
  useEffect(() => {
    if (session?.user) {
      setUserProfile(
        session.user.name ?? '',
        session.user.email ?? '',
      );
    }
  }, [session, setUserProfile]);

  // Fetch all data on mount so the UI hydrates from the backend
  useEffect(() => {
    if (status === 'authenticated') {
      refreshAll();
    }
  }, [status, refreshAll]);

  // Show loading spinner while session is loading
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
