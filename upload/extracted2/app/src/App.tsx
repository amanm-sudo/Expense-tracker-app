import { Routes, Route, Navigate } from 'react-router';
import Sidebar from '@/components/layout/Sidebar';
import AddExpenseModal from '@/components/shared/AddExpenseModal';
import ToastContainer from '@/components/shared/Toast';
import DashboardPage from '@/pages/DashboardPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import SummaryPage from '@/pages/SummaryPage';
import RecurringPage from '@/pages/RecurringPage';
import SettingsPage from '@/pages/SettingsPage';

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <main className="lg:ml-[240px] min-h-screen">
        {children}
      </main>

      {/* Add Expense Modal */}
      <AddExpenseModal />

      {/* Toast notifications */}
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/dashboard"
        element={
          <AppLayout>
            <DashboardPage />
          </AppLayout>
        }
      />
      <Route
        path="/analytics"
        element={
          <AppLayout>
            <AnalyticsPage />
          </AppLayout>
        }
      />
      <Route
        path="/summary"
        element={
          <AppLayout>
            <SummaryPage />
          </AppLayout>
        }
      />
      <Route
        path="/recurring"
        element={
          <AppLayout>
            <RecurringPage />
          </AppLayout>
        }
      />
      <Route
        path="/settings"
        element={
          <AppLayout>
            <SettingsPage />
          </AppLayout>
        }
      />
    </Routes>
  );
}
