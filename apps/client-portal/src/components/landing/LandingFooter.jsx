import { Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

import Logo from '@/components/landing/Logo';
import { runtimeConfig } from '@/config/runtime';
import { FRONTEND_URL } from '@/config/urls';

const platformLinks = [
  { to: '/marketplace', label: 'Marketplace' },
  { to: '/login', label: 'Portal Client' },
];

const legalLinks = [
  { to: '/terms', label: 'Termeni si Conditii' },
  { to: '/privacy', label: 'Politica de Confidentialitate' },
  { to: '/contact', label: 'Contact' },
];

export default function LandingFooter() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="sm:col-span-2 lg:col-span-1">
            <Logo className="text-lg text-gray-900" />
            <p className="mt-3 text-sm text-gray-500 leading-relaxed max-w-xs">
              Programeaza-te online in 30 de secunde. Gaseste furnizori, comunica direct, tine
              evidenta facturilor - totul gratuit.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Platforma
            </p>
            <ul className="space-y-2.5">
              {platformLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Pentru companii
            </p>
            <ul className="space-y-2.5">
              <li>
                <a
                  href={FRONTEND_URL}
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Platforma business
                </a>
              </li>
              <li>
                <a
                  href={`${FRONTEND_URL}/pricing`}
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Preturi
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Legal
            </p>
            <ul className="space-y-2.5">
              {legalLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-gray-200 pt-6">
          <div className="flex flex-wrap items-center justify-center gap-3 mb-5 text-xs text-gray-500">
            <a
              href="https://anpc.ro/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 font-medium transition hover:bg-white hover:text-gray-700 hover:border-gray-300"
            >
              ANPC
            </a>
            <a
              href="https://anpc.ro/ce-este-sal/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 font-medium transition hover:bg-white hover:text-gray-700 hover:border-gray-300"
            >
              SAL
            </a>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} {runtimeConfig.platformName}. Toate drepturile
              rezervate.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Clock className="h-3.5 w-3.5" />
              Suport Luni – Vineri, 09:00 – 18:00
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
