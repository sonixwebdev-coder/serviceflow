import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ToastProvider } from '@/context/ToastContext';
import PortalLayout from '@/components/layout/PortalLayout';
import PublicLayout from '@/components/layout/PublicLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuthStore } from '@/state/useAuthStore';
import { refreshAuthSession } from '@/utils/api';

import PrivacyNotice from '@/components/PrivacyNotice';
import SmartHome from '@/pages/SmartHome';
import Login from '@/pages/Login';
import ForgotPassword from '@/pages/ForgotPassword';
import Dashboard from '@/pages/Dashboard';
import Appointments from '@/pages/Appointments';
import AppointmentDetail from '@/pages/AppointmentDetail';
import Invoices from '@/pages/Invoices';
import InvoiceDetail from '@/pages/InvoiceDetail';
import Profile from '@/pages/Profile';
import Book from '@/pages/Book';
import Marketplace from '@/pages/Marketplace';
import OrganizationDetail from '@/pages/OrganizationDetail';
import Terms from '@/pages/Terms';
import Privacy from '@/pages/Privacy';
import Contact from '@/pages/Contact';
import DiscoverDetail from '@/pages/DiscoverDetail';

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
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
      <BrowserRouter>
        <PrivacyNotice />
        <Routes>
          {/* Smart home — landing or redirect to dashboard */}
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
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
