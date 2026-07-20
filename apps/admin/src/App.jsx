import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fetchCsrfToken, bootstrapAuth } from '@/utils/api';
import { ToastProvider } from '@/context/ToastContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AdminLayout from '@/components/layout/AdminLayout';
import ErrorBoundary from '@/components/ErrorBoundary';
const Login = lazy(() => import('@/pages/Login'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Organizations = lazy(() => import('@/pages/Organizations'));
const OrganizationDetail = lazy(() => import('@/pages/OrganizationDetail'));
const Billing = lazy(() => import('@/pages/Billing'));
const SystemLogs = lazy(() => import('@/pages/SystemLogs'));
const PlatformSettings = lazy(() => import('@/pages/PlatformSettings'));
const Tickets = lazy(() => import('@/pages/Tickets'));
const TicketDetail = lazy(() => import('@/pages/TicketDetail'));
const Maintenance = lazy(() => import('@/pages/Maintenance'));
const ContactMessages = lazy(() => import('@/pages/ContactMessages'));
const NotFound = lazy(() => import('@/pages/NotFound'));

const PageLoader = () => (
  <div
    className="flex min-h-screen items-center justify-center"
    role="status"
    aria-label="Se încarcă"
  >
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
  </div>
);

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
            <Suspense fallback={<PageLoader />}>
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
                  <Route path="contact-messages" element={<ContactMessages />} />
                  <Route path="maintenance" element={<Maintenance />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
