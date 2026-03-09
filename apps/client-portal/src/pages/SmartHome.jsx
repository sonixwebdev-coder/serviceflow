import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/state/useAuthStore';
import Landing from './Landing';

export default function SmartHome() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const loading = useAuthStore((state) => state.loading);
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');

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

  if (isAuthenticated) {
    return <Navigate to={code ? `/loyalty?code=${encodeURIComponent(code)}` : '/dashboard'} replace />;
  }

  // If there's a referral code but user is not logged in, redirect to login with code
  if (code) {
    return <Navigate to={`/login?code=${encodeURIComponent(code)}`} replace />;
  }

  return <Landing />;
}
