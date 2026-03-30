import { useState, useRef } from 'react';
import useAuth from '../context/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, ArrowLeft, ShieldCheck } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 2FA state
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const codeInputRef = useRef(null);

  const { login, verifyTwoFactor } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      navigate('/dashboard');
    } else if (result.requiresTwoFactor) {
      setTwoFactorRequired(true);
      setTempToken(result.tempToken);
      // Focus the code input after render
      setTimeout(() => codeInputRef.current?.focus(), 100);
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  const handleTwoFactorSubmit = async (e) => {
    e.preventDefault();
    if (!twoFactorCode.trim()) return;
    setError('');
    setLoading(true);

    const result = await verifyTwoFactor(tempToken, twoFactorCode.replace(/\s/g, ''));

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  const handleBackToLogin = () => {
    setTwoFactorRequired(false);
    setTempToken('');
    setTwoFactorCode('');
    setError('');
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50/80">
      {/* Header */}
      <header className="border-b border-gray-200/60 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="text-lg font-bold tracking-tight text-gray-900">
            ForjaIt
          </Link>
          <div className="flex items-center gap-4">
            <Link
              to="/signup"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Inregistrare
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-8 shadow-sm">
            {!twoFactorRequired ? (
              <>
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold tracking-tight text-gray-900">Bine ai revenit</h1>
                  <p className="mt-2 text-sm text-gray-500">
                    Conecteaza-te la contul tau ForjaIt
                  </p>
                </div>

                {error && (
                  <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-gray-50/50 px-4 py-2.5 text-sm transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 focus:outline-none"
                      placeholder="ion.popescu@example.com"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                        Parola
                      </label>
                      <Link
                        to="/forgot-password"
                        className="text-sm font-medium text-primary hover:text-primary-800 transition-colors"
                      >
                        Ai uitat parola?
                      </Link>
                    </div>
                    <input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-gray-50/50 px-4 py-2.5 text-sm transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 focus:outline-none"
                      placeholder="Parola ta"
                      disabled={loading}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Conectare...' : 'Conectare'}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-500">
                    Nu ai un cont?{' '}
                    <Link to="/signup" className="font-semibold text-primary hover:text-primary-800 transition-colors">
                      Creeaza cont gratuit
                    </Link>
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-gray-900">Verificare 2FA</h1>
                  <p className="mt-2 text-sm text-gray-500">
                    Introdu codul din aplicatia de autentificare
                  </p>
                </div>

                {error && (
                  <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <form onSubmit={handleTwoFactorSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="twoFactorCode" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Cod de verificare
                    </label>
                    <input
                      ref={codeInputRef}
                      id="twoFactorCode"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-gray-50/50 px-4 py-2.5 text-sm text-center tracking-widest transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 focus:outline-none"
                      placeholder="000000"
                      maxLength={10}
                      disabled={loading}
                    />
                    <p className="mt-1.5 text-xs text-gray-500">
                      Poti folosi si un cod de recuperare
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !twoFactorCode.trim()}
                    className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Verificare...' : 'Verifica'}
                  </button>
                </form>

                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Inapoi la conectare
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-3 mb-3 text-xs text-gray-500">
            <a href="https://anpc.ro/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded border border-gray-300 px-2.5 py-1.5 font-medium transition hover:bg-gray-100 hover:text-gray-700">
              ANPC
            </a>
            <a href="https://anpc.ro/ce-este-sal/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded border border-gray-300 px-2.5 py-1.5 font-medium transition hover:bg-gray-100 hover:text-gray-700">
              SAL
            </a>
            <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded border border-gray-300 px-2.5 py-1.5 font-medium transition hover:bg-gray-100 hover:text-gray-700">
              SOL
            </a>
          </div>
          <p className="text-center text-xs text-gray-400">
            &copy; {new Date().getFullYear()} ForjaIt. Toate drepturile rezervate.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Login;
