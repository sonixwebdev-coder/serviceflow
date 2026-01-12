import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { TerminologyProvider } from './context/TerminologyContext.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import CreateFirstAdmin from './pages/CreateFirstAdmin';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import PersonalTodos from './pages/PersonalTodos.jsx';
import LeaveRequests from './pages/LeaveRequests';
import TimeTracking from './pages/TimeTracking';
import Employees from './pages/Employees';
import Clients from './pages/Clients.jsx';
import OnlineClients from './pages/OnlineClients.jsx';
import Assets from './pages/Assets.jsx';
import Resources from './pages/Resources.jsx';
import Appointments from './pages/Appointments.jsx';
import Invoices from './pages/Invoices.jsx';
import Profile from './pages/Profile.jsx';
import Chat from './pages/Chat.jsx';
import ActivityTimeline from './pages/ActivityTimeline.jsx';
import Analytics from './pages/Analytics.jsx';
// ANAF functionality temporarily disabled
// import AnafManagement from './pages/AnafManagement.jsx';
// import AnafCallback from './pages/AnafCallback.jsx';
import DashboardLayout from './components/layout/DashboardLayout';
import { USER_ROLES } from './utils/constants';
import RealtimeBridge from './components/realtime/RealtimeBridge.jsx';
import CompanySettings from './pages/CompanySettings.jsx';
import OrganizationSettings from './pages/OrganizationSettings.jsx';
import GlobalSearch from './components/search/GlobalSearch.jsx';

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <TerminologyProvider>
            <RealtimeBridge />
            <GlobalSearch />
            <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/create-admin" element={<CreateFirstAdmin />} />
          {/* ANAF functionality temporarily disabled */}
          {/* <Route path="/anaf/callback" element={<AnafCallback />} /> */}

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
              <ProtectedRoute>
                <DashboardLayout>
                  <Invoices />
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
              <ProtectedRoute>
                <DashboardLayout>
                  <ActivityTimeline />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
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

          {/* ANAF functionality temporarily disabled */}
          {/* <Route
            path="/anaf"
            element={
              <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                <DashboardLayout>
                  <AnafManagement />
                </DashboardLayout>
              </ProtectedRoute>
            }
          /> */}

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </TerminologyProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
