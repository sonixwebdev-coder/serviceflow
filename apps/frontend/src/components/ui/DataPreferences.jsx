import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';

const STORAGE_KEY = 'sf_data_prefs';

export default function DataPreferences() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setVisible(true);
    }
  }, []);

  const accept = (level) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ level, ts: Date.now() }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="data-preferences-bar fixed bottom-0 left-0 right-0 z-[9999] border-t border-gray-200 bg-white shadow-lg">
      <div className="mx-auto max-w-5xl px-4 py-3">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between sm:gap-4">
          <div className="text-xs leading-relaxed text-gray-600 text-center sm:text-left">
            <p>
              Acest site foloseste cookie-uri si date stocate local conform{' '}
              <span className="font-medium text-gray-700">Legii nr. 506/2004</span> (ePrivacy).
              Citeste{' '}
              <Link to="/privacy" className="text-blue-600 hover:underline">
                Politica de Confidentialitate
              </Link>
              .
            </p>
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1 inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
            >
              {expanded ? 'Ascunde detalii' : 'Vezi ce date stocam'}
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => accept('essential')}
              className="rounded-lg border border-gray-300 px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Doar necesare
            </button>
            <button
              onClick={() => accept('all')}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Accept toate
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600 space-y-2">
            <div>
              <p className="font-semibold text-gray-700">Cookie-uri strict necesare (nu necesita consimtamant):</p>
              <ul className="mt-1 list-disc pl-4 space-y-0.5">
                <li><span className="font-medium">Sesiune de autentificare</span> - cookie httpOnly pentru mentinerea sesiunii</li>
                <li><span className="font-medium">Protectie CSRF</span> - token pentru securitatea formularelor</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-gray-700">Date stocate local (localStorage):</p>
              <ul className="mt-1 list-disc pl-4 space-y-0.5">
                <li><span className="font-medium">Preferinte utilizator</span> - tema, limba, setari interfata</li>
                <li><span className="font-medium">Consimtamant cookie</span> - alegerea ta de pe acest banner</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-gray-700">Cookie-uri optionale de analiza (necesita consimtamant):</p>
              <ul className="mt-1 list-disc pl-4 space-y-0.5">
                <li><span className="font-medium">Analiza utilizare</span> - date anonimizate despre navigare pentru imbunatatirea platformei</li>
              </ul>
            </div>
            <p className="text-gray-500 pt-1 border-t border-gray-200">
              Datele financiar-contabile sunt pastrate 5 ani (Legea 82/1991, modificata prin Legea 36/2023).
              Datele de cont sunt sterse in 30 de zile de la stergerea contului.
              Detalii complete in{' '}
              <Link to="/privacy" className="text-blue-600 hover:underline">
                Politica de Confidentialitate
              </Link>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
