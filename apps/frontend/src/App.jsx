import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { TerminologyProvider } from './context/TerminologyContext.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { USER_ROLES } from './utils/constants';
import AuthenticatedProviders from './components/auth/AuthenticatedProviders.jsx';
import DataPreferences from './components/ui/DataPreferences.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import NotFound from './pages/NotFound';
import useAuth from './context/useAuth';

// Auth pages (static imports - needed immediately on initial load)
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Root: landing page if not logged in, dashboard redirect if logged in
const SmartHome = () => {
  const { loading, isAuthenticated } = useAuth();
  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <BusinessLanding />;
};

// Public marketing pages (lazy-loaded - not part of main auth flow)
const BusinessLanding = lazy(() => import('./pages/BusinessLanding.jsx'));
const TermeniConditii = lazy(() => import('./pages/TermeniConditii.jsx'));
const Confidentialitate = lazy(() => import('./pages/Confidentialitate.jsx'));
const Preturi = lazy(() => import('./pages/Preturi.jsx'));
const DashboardLayout = lazy(() => import('./components/layout/DashboardLayout.jsx'));

// Protected pages (lazy-loaded - only fetched when navigated to)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Tasks = lazy(() => import('./pages/Tasks'));
const PersonalTodos = lazy(() => import('./pages/PersonalTodos.jsx'));
const LeaveRequests = lazy(() => import('./pages/LeaveRequests'));
const TimeTracking = lazy(() => import('./pages/TimeTracking'));
const Employees = lazy(() => import('./pages/Employees'));
const Clients = lazy(() => import('./pages/Clients.jsx'));
const OnlineClients = lazy(() => import('./pages/OnlineClients.jsx'));
const Assets = lazy(() => import('./pages/Assets.jsx'));
const Resources = lazy(() => import('./pages/Resources.jsx'));
const Appointments = lazy(() => import('./pages/Appointments.jsx'));
const Invoices = lazy(() => import('./pages/Invoices.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const Chat = lazy(() => import('./pages/Chat.jsx'));
const ActivityTimeline = lazy(() => import('./pages/ActivityTimeline.jsx'));
const Analytics = lazy(() => import('./pages/Analytics.jsx'));
const Onboarding = lazy(() => import('./pages/Onboarding.jsx'));
const CompanySettings = lazy(() => import('./pages/CompanySettings.jsx'));
const OrganizationSettings = lazy(() => import('./pages/OrganizationSettings.jsx'));
const EmailTemplates = lazy(() => import('./pages/EmailTemplates.jsx'));
const Locations = lazy(() => import('./pages/Locations.jsx'));
const WebsiteBuilder = lazy(() => import('./pages/WebsiteBuilder.jsx'));
const WebsiteLeads = lazy(() => import('./pages/WebsiteLeads.jsx'));
const Services = lazy(() => import('./pages/Services.jsx'));
const BillingSettings = lazy(() => import('./pages/BillingSettings.jsx'));
const LoyaltySettings = lazy(() => import('./pages/LoyaltySettings.jsx'));
const LoyaltyDashboard = lazy(() => import('./pages/LoyaltyDashboard.jsx'));
const SupportTickets = lazy(() => import('./pages/SupportTickets.jsx'));
const SupportTicketDetail = lazy(() => import('./pages/SupportTicketDetail.jsx'));

// Minimal loading fallback
const PageLoader = () => (
  <div className="flex h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-600" />
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ScrollToTop />
        <ToastProvider>
          <AuthProvider>
            <TerminologyProvider>
              <AuthenticatedProviders />
              <DataPreferences />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/business" element={<Navigate to="/" replace />} />
                  <Route path="/terms" element={<TermeniConditii />} />
                  <Route path="/privacy" element={<Confidentialitate />} />
                  <Route path="/pricing" element={<Preturi />} />

                  {/* Onboarding (protected, no DashboardLayout) */}
                  <Route
                    path="/onboarding"
                    element={
                      <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                        <Onboarding />
                      </ProtectedRoute>
                    }
                  />

                  {/* Protected Routes */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <DashboardLayout>
                          <Dashboard />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/tasks"
                    element={
                      <ProtectedRoute>
                        <DashboardLayout>
                          <Tasks />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/personal-todos"
                    element={
                      <ProtectedRoute>
                        <DashboardLayout>
                          <PersonalTodos />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/leaves"
                    element={
                      <ProtectedRoute>
                        <DashboardLayout>
                          <LeaveRequests />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/time-tracking"
                    element={
                      <ProtectedRoute>
                        <DashboardLayout>
                          <TimeTracking />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/crm/clients"
                    element={
                      <ProtectedRoute>
                        <DashboardLayout>
                          <Clients />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/crm/online-clients"
                    element={
                      <ProtectedRoute>
                        <DashboardLayout>
                          <OnlineClients />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/crm/assets"
                    element={
                      <ProtectedRoute>
                        <DashboardLayout>
                          <Assets />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/crm/resources"
                    element={
                      <ProtectedRoute>
                        <DashboardLayout>
                          <Resources />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/crm/appointments"
                    element={
                      <ProtectedRoute>
                        <DashboardLayout>
                          <Appointments />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/crm/invoices"
                    element={
                      <ProtectedRoute
                        allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.SALES]}
                      >
                        <DashboardLayout>
                          <Invoices />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/crm/loyalty"
                    element={
                      <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.MANAGER]}>
                        <DashboardLayout>
                          <LoyaltyDashboard />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <DashboardLayout>
                          <Profile />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/chat"
                    element={
                      <ProtectedRoute>
                        <DashboardLayout>
                          <Chat />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/activity"
                    element={
                      <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.MANAGER]}>
                        <DashboardLayout>
                          <ActivityTimeline />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/analytics"
                    element={
                      <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.MANAGER]}>
                        <DashboardLayout>
                          <Analytics />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/employees"
                    element={
                      <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                        <DashboardLayout>
                          <Employees />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin Only Routes */}
                  <Route
                    path="/settings/locations"
                    element={
                      <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                        <DashboardLayout>
                          <Locations />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/settings/services"
                    element={
                      <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                        <DashboardLayout>
                          <Services />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/settings/company"
                    element={
                      <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                        <DashboardLayout>
                          <CompanySettings />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/settings/organization"
                    element={
                      <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                        <DashboardLayout>
                          <OrganizationSettings />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/settings/email-templates"
                    element={
                      <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                        <DashboardLayout>
                          <EmailTemplates />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/settings/website"
                    element={
                      <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                        <DashboardLayout>
                          <WebsiteBuilder />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/settings/website/leads"
                    element={
                      <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                        <DashboardLayout>
                          <WebsiteLeads />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/settings/billing"
                    element={
                      <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                        <DashboardLayout>
                          <BillingSettings />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/settings/loyalty"
                    element={
                      <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                        <DashboardLayout>
                          <LoyaltySettings />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/support"
                    element={
                      <ProtectedRoute>
                        <DashboardLayout>
                          <SupportTickets />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/support/:id"
                    element={
                      <ProtectedRoute>
                        <DashboardLayout>
                          <SupportTicketDetail />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  {/* Landing / Dashboard redirect */}
                  <Route path="/" element={<SmartHome />} />

                  {/* 404 */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </TerminologyProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
