import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Login from './pages/Login';
import CreateFirstAdmin from './pages/CreateFirstAdmin';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import PersonalTodos from './pages/PersonalTodos.jsx';
import LeaveRequests from './pages/LeaveRequests';
import TimeTracking from './pages/TimeTracking';
import Employees from './pages/Employees';
import Clients from './pages/Clients.jsx';
import OnlineClients from './pages/OnlineClients.jsx';
import Appointments from './pages/Appointments.jsx';
import Invoices from './pages/Invoices.jsx';
import Profile from './pages/Profile.jsx';
import AnafManagement from './pages/AnafManagement.jsx';
import AnafCallback from './pages/AnafCallback.jsx';
import DashboardLayout from './components/layout/DashboardLayout';
import { USER_ROLES } from './utils/constants';
import RealtimeBridge from './components/realtime/RealtimeBridge.jsx';
import CompanySettings from './pages/CompanySettings.jsx';

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <RealtimeBridge />
          <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/create-admin" element={<CreateFirstAdmin />} />
          <Route path="/anaf/callback" element={<AnafCallback />} />

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
            path="/anaf"
            element={
              <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                <DashboardLayout>
                  <AnafManagement />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
