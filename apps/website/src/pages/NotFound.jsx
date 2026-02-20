import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Pagina nu a fost gasita
        </h2>
        <p className="text-gray-600 mb-6">
          Website-ul pe care il cautati nu exista sau nu este disponibil.
        </p>
        <p className="text-sm text-gray-500">
          Vizitati{' '}
          <a
            href="https://forja.it.com"
            className="text-primary-600 hover:text-primary-700 underline"
          >
            ForjaIt
          </a>{' '}
          pentru a va crea propriul website.
        </p>
      </div>
    </div>
  );
}
