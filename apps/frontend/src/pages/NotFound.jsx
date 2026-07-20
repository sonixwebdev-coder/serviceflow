import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md text-center">
        <div className="mb-4 text-6xl font-bold text-gray-300">404</div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Pagina nu a fost găsită</h1>
        <p className="mb-6 text-gray-600">Pagina pe care o cauți nu există sau a fost mutată.</p>
        <Link
          to="/dashboard"
          className="inline-block rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
        >
          Înapoi la dashboard
        </Link>
      </div>
    </div>
  );
}
