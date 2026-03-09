import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/state/useAuthStore';

export default function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const loading = useAuthStore((state) => state.loading);
  const location = useLocation();

  // Wait for store hydration before checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          <p className="text-sm text-gray-500">Se incarca...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const code = new URLSearchParams(location.search).get('code');
    const loginPath = code ? `/login?code=${encodeURIComponent(code)}` : '/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  return children;
}
