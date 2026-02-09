import { useState, useEffect } from 'react';
import { Cookie, X } from 'lucide-react';

const STORAGE_KEY = 'sf_cookie_consent';

export default function UserPreferences({ primaryColor }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(STORAGE_KEY);
    if (!consent) {
      // Show after a short delay so it doesn't flash on page load
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(STORAGE_KEY, 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-6">
      <div className="max-w-xl mx-auto bg-white rounded-xl shadow-2xl border border-gray-200 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${primaryColor}15` }}
          >
            <Cookie className="h-5 w-5" style={{ color: primaryColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-700 leading-relaxed">
              Acest site foloseste cookie-uri pentru a va oferi o experienta mai buna.
              Prin continuarea navigarii, sunteti de acord cu utilizarea cookie-urilor.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={accept}
                className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-all hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                Accept
              </button>
              <button
                onClick={decline}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Refuz
              </button>
            </div>
          </div>
          <button
            onClick={decline}
            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
