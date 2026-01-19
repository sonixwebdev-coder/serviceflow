import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signupOrganization, checkSlugAvailability } from '../services/organizationService';
import { getSectorList } from '../constants/activitySectors';
import { Car, Scissors, Wrench, Smartphone, Check, ArrowLeft, ArrowRight } from 'lucide-react';

const STEPS = [
  { id: 'organization', title: 'Organizatie', description: 'Detalii organizatie' },
  { id: 'admin', title: 'Administrator', description: 'Cont administrator' },
  { id: 'sector', title: 'Domeniu', description: 'Domeniu de activitate' },
];

const SECTOR_ICONS = {
  Car,
  Scissors,
  Wrench,
  Smartphone,
};

const Signup = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
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
    activitySector: '',
  });

  const sectors = getSectorList();

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

  const handleSectorSelect = (sectorKey) => {
    setFormData((prev) => ({ ...prev, activitySector: sectorKey }));
    setError('');
  };

  const validateStep = (step) => {
    switch (step) {
      case 0: // Organization
        if (!formData.organizationName.trim()) {
          setError('Numele organizatiei este obligatoriu');
          return false;
        }
        if (!formData.slug.trim()) {
          setError('Slug-ul organizatiei este obligatoriu');
          return false;
        }
        if (slugAvailable === false) {
          setError('Acest slug nu este disponibil');
          return false;
        }
        if (slugChecking) {
          setError('Asteptati verificarea slug-ului');
          return false;
        }
        return true;
      case 1: // Admin
        if (!formData.firstName.trim()) {
          setError('Prenumele este obligatoriu');
          return false;
        }
        if (!formData.lastName.trim()) {
          setError('Numele este obligatoriu');
          return false;
        }
        if (!formData.email.trim()) {
          setError('Email-ul este obligatoriu');
          return false;
        }
        if (formData.password.length < 8) {
          setError('Parola trebuie sa aiba minim 8 caractere');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Parolele nu se potrivesc');
          return false;
        }
        return true;
      case 2: // Sector
        if (!formData.activitySector) {
          setError('Selectati un domeniu de activitate');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateStep(currentStep)) {
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
      setError(err.response?.data?.message || 'Inregistrarea a esuat. Va rugam incercati din nou.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                index < currentStep
                  ? 'bg-green-500 text-white'
                  : index === currentStep
                  ? 'bg-viperx-primary text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {index < currentStep ? <Check className="w-5 h-5" /> : index + 1}
            </div>
            <span
              className={`text-xs mt-1 ${
                index === currentStep ? 'text-viperx-primary font-medium' : 'text-gray-500'
              }`}
            >
              {step.title}
            </span>
          </div>
          {index < STEPS.length - 1 && (
            <div
              className={`w-16 h-1 mx-2 ${
                index < currentStep ? 'bg-green-500' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderOrganizationStep = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Detalii Organizatie</h2>

      <div>
        <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700 mb-2">
          Numele Organizatiei *
        </label>
        <input
          id="organizationName"
          name="organizationName"
          type="text"
          required
          value={formData.organizationName}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viperx-primary focus:border-transparent transition"
          placeholder="Service Auto Expert SRL"
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-2">
          Slug Organizatie *
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
            placeholder="service-auto-expert"
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
          Litere mici, numere si cratime. Acesta va fi adresa portalului clientilor (ex: {formData.slug || 'slug'}.serviceflow.ro)
          {slugAvailable === false && <span className="text-red-600 font-medium ml-2">Nu este disponibil</span>}
          {slugAvailable === true && <span className="text-green-600 font-medium ml-2">Disponibil!</span>}
        </p>
      </div>
    </div>
  );

  const renderAdminStep = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Cont Administrator</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
            Prenume *
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            value={formData.firstName}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viperx-primary focus:border-transparent transition"
            placeholder="Ion"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
            Nume *
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            required
            value={formData.lastName}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viperx-primary focus:border-transparent transition"
            placeholder="Popescu"
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
            placeholder="ion@example.com"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
            Telefon
          </label>
          <input
            id="phoneNumber"
            name="phoneNumber"
            type="tel"
            value={formData.phoneNumber}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-viperx-primary focus:border-transparent transition"
            placeholder="+40 712 345 678"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Parola *
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
          <p className="text-xs text-gray-500 mt-1">Minim 8 caractere</p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
            Confirmare Parola *
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
  );

  const renderSectorStep = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-700 mb-2">Domeniu de Activitate</h2>
      <p className="text-sm text-gray-500 mb-4">
        Selectati domeniul principal de activitate al organizatiei. Aceasta optiune va configura automat tipul de active si terminologia utilizata.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sectors.map((sector) => {
          const IconComponent = SECTOR_ICONS[sector.icon] || Car;
          const isSelected = formData.activitySector === sector.key;

          return (
            <button
              key={sector.key}
              type="button"
              onClick={() => handleSectorSelect(sector.key)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                isSelected
                  ? 'border-viperx-primary bg-orange-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    isSelected ? 'bg-viperx-primary text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <IconComponent className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold ${isSelected ? 'text-viperx-primary' : 'text-gray-800'}`}>
                    {sector.labelRo}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{sector.description}</p>
                  {sector.hasAssets && (
                    <p className="text-xs text-gray-400 mt-2">
                      Tip activ: {sector.terminology.asset.singular}
                    </p>
                  )}
                  {!sector.hasAssets && (
                    <p className="text-xs text-gray-400 mt-2">
                      Fara gestiune active
                    </p>
                  )}
                </div>
                {isSelected && (
                  <div className="bg-viperx-primary text-white rounded-full p-1">
                    <Check className="w-4 h-4" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return renderOrganizationStep();
      case 1:
        return renderAdminStep();
      case 2:
        return renderSectorStep();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-viperx-secondary via-gray-900 to-viperx-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-viperx-primary mb-2">ServiceFlow</h1>
            <p className="text-gray-600">Creeaza contul organizatiei tale</p>
          </div>

          {/* Step Indicator */}
          {renderStepIndicator()}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {renderCurrentStep()}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              {currentStep > 0 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Inapoi
                </button>
              ) : (
                <div />
              )}

              {currentStep < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={loading || (currentStep === 0 && (slugChecking || !slugAvailable))}
                  className="flex items-center gap-2 bg-viperx-primary hover:bg-orange-600 text-white font-semibold py-2 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Urmatorul
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading || !formData.activitySector}
                  className="flex items-center gap-2 bg-viperx-primary hover:bg-orange-600 text-white font-semibold py-2 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Se creeaza...' : 'Creeaza Contul'}
                  {!loading && <Check className="w-4 h-4" />}
                </button>
              )}
            </div>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Ai deja un cont?{' '}
              <Link to="/login" className="text-viperx-primary hover:underline font-medium">
                Conecteaza-te
              </Link>
            </p>
            <p className="text-xs text-gray-500 mt-4">
              ServiceFlow © 2025 - 14 zile gratuit incluse
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
