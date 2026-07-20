import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ToastProvider } from '@/context/ToastContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuthStore } from '@/state/useAuthStore';
import { refreshAuthSession } from '@/utils/api';

import PrivacyNotice from '@/components/PrivacyNotice';
const PortalLayout = lazy(() => import('@/components/layout/PortalLayout'));
const PublicLayout = lazy(() => import('@/components/layout/PublicLayout'));
const SmartHome = lazy(() => import('@/pages/SmartHome'));
const Login = lazy(() => import('@/pages/Login'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Appointments = lazy(() => import('@/pages/Appointments'));
const AppointmentDetail = lazy(() => import('@/pages/AppointmentDetail'));
const Invoices = lazy(() => import('@/pages/Invoices'));
const InvoiceDetail = lazy(() => import('@/pages/InvoiceDetail'));
const Profile = lazy(() => import('@/pages/Profile'));
const Book = lazy(() => import('@/pages/Book'));
const Marketplace = lazy(() => import('@/pages/Marketplace'));
const OrganizationDetail = lazy(() => import('@/pages/OrganizationDetail'));
const Terms = lazy(() => import('@/pages/Terms'));
const Privacy = lazy(() => import('@/pages/Privacy'));
const Contact = lazy(() => import('@/pages/Contact'));
const DiscoverDetail = lazy(() => import('@/pages/DiscoverDetail'));
const Loyalty = lazy(() => import('@/pages/Loyalty'));

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
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Clean up stale localStorage keys from pre-migration auth
localStorage.removeItem('portal-accessToken');
localStorage.removeItem('portal-refreshToken');
localStorage.removeItem('portal-account');

// Hydrate cached UI data from localStorage, then attempt silent refresh
useAuthStore.getState().hydrate();
if (localStorage.getItem('portal-client')) {
  refreshAuthSession()
    .catch(() => {
      // No valid refresh cookie - user needs to re-login
      useAuthStore.getState().logout();
    })
    .finally(() => {
      useAuthStore.getState().setLoading(false);
    });
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <BrowserRouter>
            <PrivacyNotice />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Smart home - landing or redirect to dashboard */}
                <Route path="/" element={<SmartHome />} />

                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/book/:slug" element={<Book />} />

                {/* Public layout routes */}
                <Route element={<PublicLayout />}>
                  <Route path="/marketplace" element={<Marketplace />} />
                  <Route path="/marketplace/:slug" element={<OrganizationDetail />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/contact" element={<Contact />} />
                </Route>

                {/* Protected routes */}
                <Route
                  element={
                    <ProtectedRoute>
                      <PortalLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="appointments" element={<Appointments />} />
                  <Route path="appointments/:id" element={<AppointmentDetail />} />
                  <Route path="invoices" element={<Invoices />} />
                  <Route path="invoices/:id" element={<InvoiceDetail />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="discover" element={<Marketplace basePath="/discover" />} />
                  <Route path="discover/:slug" element={<DiscoverDetail />} />
                  <Route path="loyalty" element={<Loyalty />} />
                </Route>

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
