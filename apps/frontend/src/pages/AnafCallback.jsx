import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import API from '../utils/api';

const AnafCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Se procesează autentificarea...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (error) {
          setStatus('error');
          setMessage(errorDescription || 'Autentificarea a fost respinsă de ANAF.');
          return;
        }

        if (!code) {
          setStatus('error');
          setMessage('Cod de autorizare lipsă.');
          return;
        }

        // Decode state to extract configId
        let configId;
        try {
          const decodedState = JSON.parse(atob(state));
          configId = decodedState.configId;
        } catch (e) {
          console.error('Failed to decode state:', e);
          setStatus('error');
          setMessage('Parametrul state este invalid.');
          return;
        }

        if (!configId) {
          setStatus('error');
          setMessage('ID-ul configurației lipsește.');
          return;
        }

        // Exchange code for token via backend
        const response = await API.post('/anaf/auth/callback', {
          code,
          configId,
        });

        if (response.data?.success) {
          setStatus('success');
          setMessage('Autentificare reușită! Redirecționare...');

          // Close popup if we're in one
          if (window.opener) {
            window.opener.postMessage({ type: 'ANAF_AUTH_SUCCESS' }, window.location.origin);
            setTimeout(() => window.close(), 2000);
          } else {
            setTimeout(() => navigate('/anaf'), 2000);
          }
        } else {
          throw new Error(response.data?.message || 'Autentificarea a eșuat');
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setMessage(error.response?.data?.message || error.message || 'A apărut o eroare la autentificare.');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <div className="text-center">
          {status === 'processing' && (
            <>
              <RefreshCw className="mx-auto h-16 w-16 animate-spin text-viperx-primary" />
              <h2 className="mt-4 text-xl font-semibold text-gray-900">
                Procesare autentificare...
              </h2>
              <p className="mt-2 text-sm text-gray-600">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
              <h2 className="mt-4 text-xl font-semibold text-gray-900">Succes!</h2>
              <p className="mt-2 text-sm text-gray-600">{message}</p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="mx-auto h-16 w-16 text-red-500" />
              <h2 className="mt-4 text-xl font-semibold text-gray-900">Eroare</h2>
              <p className="mt-2 text-sm text-gray-600">{message}</p>
              <button
                onClick={() => {
                  if (window.opener) {
                    window.close();
                  } else {
                    navigate('/anaf');
                  }
                }}
                className="mt-6 w-full rounded-lg bg-viperx-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-viperx-primary/90"
              >
                {window.opener ? 'Închide' : 'Înapoi la ANAF'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnafCallback;
