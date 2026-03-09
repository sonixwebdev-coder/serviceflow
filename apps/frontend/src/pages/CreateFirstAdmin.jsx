import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import DatePicker from '../components/ui/DatePicker';

const CreateFirstAdmin = () => {
  const [formData, setFormData] = useState({
    firstName: 'Admin',
    lastName: 'ForjaIt',
    email: 'admin@forja.it.com',
    password: 'Admin@2025',
    confirmPassword: 'Admin@2025',
    phoneNumber: '+40700000000',
    dateOfBirth: new Date('1990-01-01'),
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleDateChange = (date) => {
    setFormData((current) => ({
      ...current,
      dateOfBirth: date,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Parolele nu corespund');
      return;
    }

    if (formData.password.length < 8) {
      setError('Parola trebuie sa aiba cel putin 8 caractere');
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword: _confirmPassword, ...adminData } = formData;

      // This will call the backend endpoint to create first admin
      await API.post('/auth/register', {
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        email: adminData.email,
        password: adminData.password,
        phoneNumber: adminData.phoneNumber,
        roleKey: 'admin',
        employmentType: 'FULL_TIME',
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Eroare la crearea contului de admin. Contul de admin poate exista deja.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary via-gray-900 to-secondary flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin creat!</h2>
            <p className="text-gray-600 mb-2">
              Contul de administrator a fost creat cu succes.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4 mb-4">
              <p className="text-sm text-yellow-800 font-medium">⚠️ Important</p>
              <p className="text-xs text-yellow-700 mt-1">
                Te rugam sa schimbi parola imediat dupa autentificare pentru securitate.
              </p>
            </div>
            <p className="text-sm text-gray-500">Redirectionare catre pagina de autentificare...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-gray-900 to-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Warning Banner */}
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Doar pentru dezvoltare</h3>
                <p className="mt-1 text-xs text-red-700">
                  Aceasta pagina ar trebui eliminata in productie. Functioneaza doar daca nu exista admin.
                </p>
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-primary mb-2">Creaza primul administrator</h1>
            <p className="text-gray-600">Configurare initiala sistem</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prenume *
                </label>
                <input
                  name="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nume *
                </label>
                <input
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numar telefon *
              </label>
              <input
                name="phoneNumber"
                type="tel"
                required
                value={formData.phoneNumber}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={loading}
              />
            </div>

            <div>
              <DatePicker
                label="Data nasterii *"
                value={formData.dateOfBirth}
                onChange={handleDateChange}
                maxDate={new Date()}
                required
                className="w-full"
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parola *
                </label>
                <input
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirma parola *
                </label>
                <input
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Se creaza contul de admin...' : 'Creaza cont administrator'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Ai deja cont?{' '}
              <a href="/login" className="text-primary hover:text-orange-600 font-medium">
                Autentificare
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateFirstAdmin;
