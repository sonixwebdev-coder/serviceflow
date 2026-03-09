import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../../context/useAuth';
import useOnboardingStatus from '../../hooks/useOnboardingStatus';
import { USER_ROLES } from '../../utils/constants';

const PAYMENT_REQUIRED_ALLOWED = ['/settings/billing', '/settings/company'];

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { loading, isAuthenticated, hasRole, user } = useAuth();
  const location = useLocation();
  const isAdmin = hasRole(USER_ROLES.ADMIN);
  const isPaymentRequired = user?.orgStatus === 'PAYMENT_REQUIRED';

  // Skip onboarding check entirely when payment is required — avoids unnecessary API calls
  const { isOnboardingCompleted, isLoading: isOnboardingLoading } = useOnboardingStatus();
  const needsOnboardingCheck = isAdmin && !isPaymentRequired;

  // Single unified loading state — covers both auth hydration and onboarding check
  const isInitializing =
    loading ||
    (isAuthenticated && needsOnboardingCheck && location.pathname !== '/onboarding' && isOnboardingLoading);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !hasRole(...allowedRoles)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-300 mb-4">403</h1>
          <p className="text-xl text-gray-600 mb-4">Access Denied</p>
          <p className="text-gray-500">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  // PAYMENT_REQUIRED: only allow billing and company settings (checked BEFORE onboarding)
  if (isPaymentRequired) {
    const isAllowed = PAYMENT_REQUIRED_ALLOWED.some(p => location.pathname.startsWith(p));
    if (!isAllowed) {
      return <Navigate to="/settings/billing" replace />;
    }
  }

  // Onboarding redirect for admin users (only when payment is not required)
  if (needsOnboardingCheck && location.pathname !== '/onboarding' && !isOnboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
};

export default ProtectedRoute;
