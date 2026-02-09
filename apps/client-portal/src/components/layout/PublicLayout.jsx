import { Outlet, Link, NavLink } from 'react-router-dom';
import { useAuthStore } from '@/state/useAuthStore';

export default function PublicLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="text-xl font-bold text-primary-600">
              ServiceFlow
            </Link>
            <nav className="flex items-center gap-6">
              <NavLink
                to="/marketplace"
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${
                    isActive ? 'text-primary-600' : 'text-gray-600 hover:text-gray-900'
                  }`
                }
              >
                Marketplace
              </NavLink>
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Autentificare
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <Link to="/terms" className="hover:text-gray-700 transition-colors">
                Termeni si Conditii
              </Link>
              <Link to="/privacy" className="hover:text-gray-700 transition-colors">
                Confidentialitate
              </Link>
              <Link to="/contact" className="hover:text-gray-700 transition-colors">
                Contact
              </Link>
              <Link to="/marketplace" className="hover:text-gray-700 transition-colors">
                Marketplace
              </Link>
            </div>
            <p className="text-sm text-gray-400">
              &copy; 2026 ServiceFlow. Toate drepturile rezervate.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
