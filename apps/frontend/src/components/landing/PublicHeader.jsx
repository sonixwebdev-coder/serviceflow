import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Logo from './Logo';

const NAV_ITEMS = [
  { label: 'Functionalitati', anchor: 'features' },
  { label: 'Sectoare', anchor: 'sectors' },
  { label: 'Preturi', to: '/pricing' },
  { label: 'Contact', anchor: 'contact' },
];

export default function PublicHeader() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isLanding = location.pathname === '/';

  const handleAnchor = (anchor) => {
    setOpen(false);
    if (isLanding) {
      document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate(`/#${anchor}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="shrink-0">
            <Logo className="text-xl text-gray-900" />
          </Link>

          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-gray-600">
            {NAV_ITEMS.map((item) =>
              item.to ? (
                <Link
                  key={item.label}
                  to={item.to}
                  className="hover:text-gray-900 transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <button
                  key={item.label}
                  onClick={() => handleAnchor(item.anchor)}
                  className="hover:text-gray-900 transition-colors"
                >
                  {item.label}
                </button>
              )
            )}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Autentificare
            </Link>
            <Link
              to="/signup"
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors shadow-xs shadow-primary/25"
            >
              Incearca gratuit
            </Link>
          </div>

          <button
            onClick={() => setOpen(!open)}
            className="lg:hidden rounded-lg p-2 text-gray-600 hover:bg-gray-100"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-gray-100 bg-white px-4 pb-5 pt-3 lg:hidden">
          <nav className="flex flex-col gap-1 text-sm font-medium text-gray-600">
            {NAV_ITEMS.map((item) =>
              item.to ? (
                <Link
                  key={item.label}
                  to={item.to}
                  className="py-2.5 hover:text-gray-900"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ) : (
                <button
                  key={item.label}
                  onClick={() => handleAnchor(item.anchor)}
                  className="text-left py-2.5 hover:text-gray-900"
                >
                  {item.label}
                </button>
              )
            )}
            <hr className="my-2 border-gray-100" />
            <Link to="/login" className="py-2.5 hover:text-gray-900" onClick={() => setOpen(false)}>
              Autentificare
            </Link>
            <Link
              to="/signup"
              className="rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-semibold text-white mt-1"
              onClick={() => setOpen(false)}
            >
              Incearca gratuit
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
