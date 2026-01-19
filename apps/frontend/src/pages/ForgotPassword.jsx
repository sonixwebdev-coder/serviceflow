import { useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../utils/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await API.post('/auth/forgot-password', { email });
      setSuccess(true);
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
            <p className="text-gray-600">Recuperare parola</p>
          </div>

          {success ? (
            <div className="text-center">
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
                <p className="text-sm">
                  Daca exista un cont cu aceasta adresa de email, vei primi un link pentru resetarea parolei.
                </p>
              </div>
              <Link
                to="/login"
                className="text-viperx-primary hover:underline font-medium"
              >
                Inapoi la autentificare
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
                Introdu adresa de email asociata contului tau si iti vom trimite un link pentru resetarea parolei.
              </p>

              {/* Forgot Password Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viperx-primary focus:border-transparent transition"
                    placeholder="ion.popescu@example.com"
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-viperx-primary hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Se trimite...' : 'Trimite link de resetare'}
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

export default ForgotPassword;
