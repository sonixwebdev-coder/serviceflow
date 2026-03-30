import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CLIENT_PORTAL_URL } from '../../config/urls';
import Logo from './Logo';

export default function PublicFooter() {
  const location = useLocation();
  const navigate = useNavigate();
  const isLanding = location.pathname === '/';

  const handleAnchor = (anchor) => {
    if (isLanding) {
      document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate(`/#${anchor}`);
    }
  };

  return (
    <footer className="border-t border-gray-200 bg-gray-50/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Logo className="text-lg text-gray-900" />
            <p className="mt-3 text-sm leading-relaxed text-gray-500 max-w-xs">
              Clientii se programeaza singuri, tu te ocupi de business. Programari, CRM, facturare si website — o singura platforma.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Produs</h4>
            <ul className="space-y-2.5 text-sm text-gray-600">
              <li><button onClick={() => handleAnchor('features')} className="hover:text-gray-900 transition-colors">Functionalitati</button></li>
              <li><button onClick={() => handleAnchor('sectors')} className="hover:text-gray-900 transition-colors">Sectoare</button></li>
              <li><Link to="/pricing" className="hover:text-gray-900 transition-colors">Preturi</Link></li>
              <li><a href={CLIENT_PORTAL_URL} className="hover:text-gray-900 transition-colors" target="_blank" rel="noopener noreferrer">Portal clienti</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Legal</h4>
            <ul className="space-y-2.5 text-sm text-gray-600">
              <li><Link to="/terms" className="hover:text-gray-900 transition-colors">Termeni si Conditii</Link></li>
              <li><Link to="/privacy" className="hover:text-gray-900 transition-colors">Confidentialitate</Link></li>
              <li><button onClick={() => handleAnchor('contact')} className="hover:text-gray-900 transition-colors">Contact</button></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Suport</h4>
            <ul className="space-y-2.5 text-sm text-gray-600">
              <li className="text-gray-500">Luni – Vineri, 09:00 – 18:00</li>
              <li><a href="mailto:contact@forja.it.com" className="hover:text-gray-900 transition-colors">contact@forja.it.com</a></li>
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
  );
}
