import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fetchCsrfToken, bootstrapAuth } from '@/utils/api';
import { ToastProvider } from '@/context/ToastContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AdminLayout from '@/components/layout/AdminLayout';
import ErrorBoundary from '@/components/ErrorBoundary';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Organizations from '@/pages/Organizations';
import OrganizationDetail from '@/pages/OrganizationDetail';
import Billing from '@/pages/Billing';
import SystemLogs from '@/pages/SystemLogs';
import PlatformSettings from '@/pages/PlatformSettings';
import Tickets from '@/pages/Tickets';
import TicketDetail from '@/pages/TicketDetail';
import Maintenance from '@/pages/Maintenance';
import NotFound from '@/pages/NotFound';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export default function App() {
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    // Fetch CSRF token and attempt silent auth refresh via httpOnly cookie
    Promise.all([fetchCsrfToken(), bootstrapAuth()]).finally(() => {
      setAuthReady(true);
    });
  }, []);

  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login loading={!authReady} />} />
          <Route
            element={
              <ProtectedRoute loading={!authReady}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="organizations" element={<Organizations />} />
            <Route path="organizations/:id" element={<OrganizationDetail />} />
<Route path="billing" element={<Billing />} />
            <Route path="logs" element={<SystemLogs />} />
            <Route path="settings" element={<PlatformSettings />} />
            <Route path="tickets" element={<Tickets />} />
            <Route path="tickets/:id" element={<TicketDetail />} />
            <Route path="maintenance" element={<Maintenance />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}
