import { Link } from 'react-router-dom';

import Logo from '@/components/landing/Logo';

export default function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="shrink-0" aria-label="Pagina principala">
            <Logo className="text-xl text-gray-900" />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/marketplace"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Marketplace
            </Link>
            <Link
              to="/login"
              className="text-sm font-semibold text-white bg-primary hover:bg-primary-700 px-5 py-2.5 rounded-xl transition-colors shadow-sm shadow-primary/25"
            >
              Autentificare
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
