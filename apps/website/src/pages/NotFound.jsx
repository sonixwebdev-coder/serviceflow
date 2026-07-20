import { useParams } from 'react-router-dom';
import { runtimeConfig } from '../config/runtime';

const FRONTEND_URL = runtimeConfig.appUrl;

export default function NotFound() {
  const { subdomain } = useParams();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <h1 className="text-7xl font-bold text-gray-200 mb-4">404</h1>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Pagina nu a fost gasita</h2>
        <p className="text-gray-600 mb-8">
          {subdomain
            ? `Website-ul "${subdomain}" nu exista sau nu este publicat inca.`
            : 'Website-ul pe care il cautati nu exista sau nu este disponibil.'}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href={runtimeConfig.platformUrl}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors w-full sm:w-auto"
            style={{ backgroundColor: '#2563eb' }}
          >
            Viziteaza {runtimeConfig.platformName}
          </a>
          <a
            href={FRONTEND_URL}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition-colors w-full sm:w-auto"
          >
            Conecteaza-te la cont
          </a>
        </div>

        <p className="text-xs text-gray-400 mt-8">
          Creeaza-ti propriul website de business cu{' '}
          <a
            href={runtimeConfig.platformUrl}
            className="text-blue-500 hover:text-blue-600 underline"
          >
            {runtimeConfig.platformName}
          </a>
        </p>
      </div>
    </div>
  );
}
