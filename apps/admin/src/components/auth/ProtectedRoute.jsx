import { Navigate } from 'react-router-dom';
import useAuthStore from '@/state/useAuthStore';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user?.isSuperAdmin) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
