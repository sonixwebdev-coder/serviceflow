import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signupOrganization, checkSlugAvailability } from '../services/organizationService';

const Signup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const [formData, setFormData] = useState({
    organizationName: '',
    slug: '',
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });

  // Auto-generate slug from organization name (only if not manually edited)
  useEffect(() => {
    if (formData.organizationName && !slugManuallyEdited) {
      const generatedSlug = formData.organizationName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setFormData((prev) => ({ ...prev, slug: generatedSlug }));
    }
  }, [formData.organizationName, slugManuallyEdited]);

  // Check slug availability with debounce
  useEffect(() => {
    if (!formData.slug) {
      setSlugAvailable(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setSlugChecking(true);
      try {
        const result = await checkSlugAvailability(formData.slug);
        setSlugAvailable(result.available);
      } catch (err) {
        console.error('Slug check failed:', err);
      }
      setSlugChecking(false);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.slug]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Track if slug was manually edited
    if (name === 'slug') {
      setSlugManuallyEdited(true);
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!slugAvailable) {
      setError('Organization slug is not available');
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...payload } = formData;
      const result = await signupOrganization(payload);

      // Store auth data
      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);
      localStorage.setItem('user', JSON.stringify(result.user));

      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-viperx-secondary via-gray-900 to-viperx-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-viperx-primary mb-2">ServiceFlow</h1>
            <p className="text-gray-600">Create your organization account</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Organization Details */}
            <div className="border-b pb-4">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Organization Details</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700 mb-2">
                    Organization Name *
                  </label>
                  <input
                    id="organizationName"
                    name="organizationName"
                    type="text"
                    required
                    value={formData.organizationName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viperx-primary focus:border-transparent transition"
                    placeholder="My Company LLC"
                    disabled={loading}
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-2">
                    Organization Slug *
                  </label>
                  <div className="relative">
                    <input
                      id="slug"
                      name="slug"
                      type="text"
                      required
                      value={formData.slug}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-viperx-primary focus:border-transparent transition ${
                        slugAvailable === false ? 'border-red-500' : slugAvailable === true ? 'border-green-500' : 'border-gray-300'
                      }`}
                      placeholder="my-company"
                      disabled={loading}
                      pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                    />
                    {slugChecking && (
                      <div className="absolute right-3 top-3">
                        <div className="animate-spin h-6 w-6 border-2 border-viperx-primary border-t-transparent rounded-full"></div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Lowercase letters, numbers, and hyphens only. {slugAvailable === false && <span className="text-red-600 font-medium">Not available</span>}
                    {slugAvailable === true && <span className="text-green-600 font-medium">Available!</span>}
                  </p>
                </div>
              </div>
            </div>

            {/* Admin User Details */}
            <div className="border-b pb-4">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Admin User Details</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viperx-primary focus:border-transparent transition"
                    placeholder="John"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viperx-primary focus:border-transparent transition"
                    placeholder="Doe"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viperx-primary focus:border-transparent transition"
                    placeholder="john@example.com"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viperx-primary focus:border-transparent transition"
                    placeholder="+40 123 456 789"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viperx-primary focus:border-transparent transition"
                    placeholder="••••••••"
                    disabled={loading}
                    minLength={8}
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password *
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viperx-primary focus:border-transparent transition"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !slugAvailable || slugChecking}
              className="w-full bg-viperx-primary hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : 'Create Organization Account'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-viperx-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
            <p className="text-xs text-gray-500 mt-4">
              ServiceFlow © 2025 - 14-day free trial included
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
