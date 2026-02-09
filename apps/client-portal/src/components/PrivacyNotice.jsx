import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, X } from 'lucide-react';

const STORAGE_KEY = 'sf-privacy-pref';

export default function PrivacyNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const pref = localStorage.getItem(STORAGE_KEY);
    if (!pref) setVisible(true);
  }, []);

  const acceptAll = () => {
    localStorage.setItem(STORAGE_KEY, 'all');
    setVisible(false);
  };

  const acceptEssential = () => {
    localStorage.setItem(STORAGE_KEY, 'essential');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex h-10 w-10 rounded-xl bg-primary-100 items-center justify-center flex-shrink-0">
            <Shield className="h-5 w-5 text-primary-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">Confidentialitatea ta conteaza</h3>
            <p className="mt-1 text-sm text-gray-500 leading-relaxed">
              Acest site foloseste tehnologii de stocare locala pentru functionare si analiza.
              Citeste{' '}
              <Link to="/privacy" className="text-primary-600 hover:text-primary-700 underline">
                Politica de Confidentialitate
              </Link>{' '}
              pentru mai multe detalii.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={acceptAll}
                className="px-5 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
              >
                Accept toate
              </button>
              <button
                onClick={acceptEssential}
                className="px-5 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Doar esentiale
              </button>
            </div>
          </div>
          <button
            onClick={acceptEssential}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
