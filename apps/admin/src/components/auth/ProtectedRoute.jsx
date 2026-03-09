import { Navigate } from 'react-router-dom';
import useAuthStore from '@/state/useAuthStore';

export default function ProtectedRoute({ children, loading }) {
  const { isAuthenticated, user } = useAuthStore();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-primary-500" />
      </div>
    );
  }

  if (!isAuthenticated || !user?.isSuperAdmin) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
