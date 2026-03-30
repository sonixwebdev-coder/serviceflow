import { Outlet, Link, NavLink } from 'react-router-dom';
import { useAuthStore } from '@/state/useAuthStore';
import { FRONTEND_URL } from '@/config/urls';
import Logo from '../landing/Logo';

export default function PublicLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="shrink-0">
              <Logo className="text-xl text-gray-900" />
            </Link>

            <nav className="flex items-center gap-1 sm:gap-2">
              <NavLink
                to="/marketplace"
                className={({ isActive }) =>
                  `text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'text-primary bg-primary-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`
                }
              >
                Marketplace
              </NavLink>
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="ml-2 text-sm font-semibold text-white bg-primary hover:bg-primary-700 px-4 py-2 rounded-xl transition-colors shadow-sm shadow-primary/25"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="ml-2 text-sm font-semibold text-white bg-primary hover:bg-primary-700 px-4 py-2 rounded-xl transition-colors shadow-sm shadow-primary/25"
                >
                  Autentificare
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────── */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 bg-gray-50/80 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            <div className="sm:col-span-2 lg:col-span-1">
              <Logo className="text-lg text-gray-900" />
              <p className="mt-3 text-sm text-gray-500 leading-relaxed max-w-xs">
                Platforma de programari online care conecteaza clientii cu furnizorii de servicii din Romania.
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Platforma</p>
              <ul className="space-y-2.5">
                {[
                  { to: '/', label: 'Acasa' },
                  { to: '/marketplace', label: 'Marketplace' },
                  { to: '/login', label: 'Portal Client' },
                ].map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Pentru companii</p>
              <ul className="space-y-2.5">
                <li><a href={FRONTEND_URL} className="text-sm text-gray-600 hover:text-gray-900 transition-colors" target="_blank" rel="noopener noreferrer">Platforma business</a></li>
                <li><a href={`${FRONTEND_URL}/pricing`} className="text-sm text-gray-600 hover:text-gray-900 transition-colors" target="_blank" rel="noopener noreferrer">Preturi</a></li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Legal</p>
              <ul className="space-y-2.5">
                {[
                  { to: '/terms', label: 'Termeni si Conditii' },
                  { to: '/privacy', label: 'Politica de Confidentialitate' },
                  { to: '/contact', label: 'Contact' },
                ].map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-gray-200 pt-6">
            <div className="flex flex-wrap items-center justify-center gap-3 mb-5 text-xs text-gray-500">
              <a href="https://anpc.ro/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 font-medium transition hover:bg-white hover:text-gray-700 hover:border-gray-300">ANPC</a>
              <a href="https://anpc.ro/ce-este-sal/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 font-medium transition hover:bg-white hover:text-gray-700 hover:border-gray-300">SAL</a>
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 font-medium transition hover:bg-white hover:text-gray-700 hover:border-gray-300">SOL</a>
            </div>
            <p className="text-center text-xs text-gray-400">&copy; {new Date().getFullYear()} ForjaIt. Toate drepturile rezervate.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
