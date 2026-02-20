import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'sf_data_prefs';

export default function DataPreferences() {
  const [visible, setVisible] = useState(false);

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
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 py-3 sm:flex-row sm:justify-between sm:gap-4">
        <p className="text-xs leading-relaxed text-gray-600 text-center sm:text-left">
          Acest site foloseste module tehnice esentiale si, optional, module de analiza pentru a imbunatati
          experienta. Citeste{' '}
          <Link to="/privacy" className="text-blue-600 hover:underline">
            Politica de Confidentialitate
          </Link>
          .
        </p>
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
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
