import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import API from '../utils/api';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Link de resetare invalid. Te rugam sa soliciti un nou link.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Parolele nu se potrivesc');
      return;
    }

    if (password.length < 8) {
      setError('Parola trebuie sa aiba cel putin 8 caractere');
      return;
    }

    setLoading(true);

    try {
      await API.post('/auth/reset-password', { token, password });
      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'A aparut o eroare. Incearca din nou.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-viperx-secondary via-gray-900 to-viperx-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-viperx-primary mb-2">ServiceFlow</h1>
            <p className="text-gray-600">Resetare parola</p>
          </div>

          {success ? (
            <div className="text-center">
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
                <p className="text-sm">
                  Parola a fost resetata cu succes! Vei fi redirectionat catre pagina de autentificare...
                </p>
              </div>
              <Link
                to="/login"
                className="text-viperx-primary hover:underline font-medium"
              >
                Mergi la autentificare
              </Link>
            </div>
          ) : !token ? (
            <div className="text-center">
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                <p className="text-sm">{error}</p>
              </div>
              <Link
                to="/forgot-password"
                className="text-viperx-primary hover:underline font-medium"
              >
                Solicita un nou link de resetare
              </Link>
            </div>
          ) : (
            <>
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <p className="text-gray-600 text-sm mb-6">
                Introdu noua parola pentru contul tau.
              </p>

              {/* Reset Password Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Parola noua
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viperx-primary focus:border-transparent transition"
                    placeholder="Minim 8 caractere"
                    disabled={loading}
                    minLength={8}
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirma parola
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viperx-primary focus:border-transparent transition"
                    placeholder="Repeta parola"
                    disabled={loading}
                    minLength={8}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-viperx-primary hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Se reseteaza...' : 'Reseteaza parola'}
                </button>
              </form>

              {/* Footer */}
              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="text-viperx-primary hover:underline font-medium text-sm"
                >
                  Inapoi la autentificare
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
