import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="max-w-sm text-center">
        <div className="mb-6 text-7xl font-bold tabular-nums text-gray-200">404</div>
        <h1 className="mb-2 text-lg font-bold text-gray-900">Pagina nu a fost gasita</h1>
        <p className="mb-6 text-sm text-gray-500">
          Pagina pe care o cauti nu exista sau a fost mutata.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-gray-800 hover:shadow transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          Inapoi la dashboard
        </Link>
      </div>
    </div>
  );
}
