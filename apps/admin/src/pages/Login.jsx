import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import useAuthStore from '@/state/useAuthStore';
import { useLogin } from '@/hooks/useAuth';
import { runtimeConfig } from '@/config/runtime';

export default function Login({ loading }) {
  const { isAuthenticated, user } = useAuthStore();
  const loginMutation = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-primary-500" />
      </div>
    );
  }

  if (isAuthenticated && user?.isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    loginMutation.mutate(
      { email, password },
      {
        onError: (err) => {
          setError(
            err.message === 'Access denied: not a super admin'
              ? 'Acces interzis: nu esti super admin'
              : err.response?.data?.message || 'Credentiale invalide'
          );
        },
      }
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-xl font-bold text-white shadow-xl shadow-primary-500/25">
            F
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {runtimeConfig.platformName} Admin
          </h1>
          <p className="mt-1.5 text-sm text-gray-500">Super Admin Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="animate-fade-in rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-800 bg-gray-900 px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Parola</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-800 bg-gray-900 px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary-500/20 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-gray-950 disabled:opacity-50 transition-all"
          >
            <LogIn className="h-4 w-4" />
            {loginMutation.isPending ? 'Se autentifica...' : 'Autentificare'}
          </button>
        </form>
      </div>
    </div>
  );
}
