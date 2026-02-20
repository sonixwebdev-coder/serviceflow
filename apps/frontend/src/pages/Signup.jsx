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
    acceptedTerms: false,
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
      case 0:
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
      case 1:
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
        if (!formData.acceptedTerms) {
          setError('Trebuie sa accepti termenii si conditiile');
          return false;
        }
        return true;
      case 2:
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
      const { confirmPassword, acceptedTerms, ...payload } = formData;
      const result = await signupOrganization(payload);

      localStorage.setItem('user', JSON.stringify({
        id: result.user.id,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        avatarUrl: result.user.avatarUrl,
        role: result.user.role,
      }));

      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.response?.data?.message || 'Inregistrarea a esuat. Va rugam incercati din nou.');
    } finally {
      setLoading(false);
    }
  };

  const inputClasses =
    'w-full rounded-lg border border-gray-300 bg-gray-50/50 px-4 py-2.5 text-sm transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none';

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-all ${
                index < currentStep
                  ? 'bg-green-500 text-white'
                  : index === currentStep
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            <span
              className={`mt-1.5 text-xs ${
                index === currentStep ? 'font-medium text-gray-900' : 'text-gray-400'
              }`}
            >
              {step.title}
            </span>
          </div>
          {index < STEPS.length - 1 && (
            <div
              className={`mx-3 h-0.5 w-12 ${
                index < currentStep ? 'bg-green-500' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderOrganizationStep = () => (
    <div className="space-y-5">
      <div>
        <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700 mb-1.5">
          Numele Organizatiei *
        </label>
        <input
          id="organizationName"
          name="organizationName"
          type="text"
          required
          value={formData.organizationName}
          onChange={handleChange}
          className={inputClasses}
          placeholder="Service Auto Expert SRL"
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1.5">
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
            className={`${inputClasses} ${
              slugAvailable === false
                ? '!border-red-400 focus:!border-red-500 focus:!ring-red-500/20'
                : slugAvailable === true
                ? '!border-green-400 focus:!border-green-500 focus:!ring-green-500/20'
                : ''
            }`}
            placeholder="service-auto-expert"
            disabled={loading}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          />
          {slugChecking && (
            <div className="absolute right-3 top-2.5">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          )}
        </div>
        <p className="mt-1.5 text-xs text-gray-500">
          Litere mici, numere si cratime. Adresa portalului: {formData.slug || 'slug'}.forja.it.com
          {slugAvailable === false && <span className="ml-2 font-medium text-red-600">Nu este disponibil</span>}
          {slugAvailable === true && <span className="ml-2 font-medium text-green-600">Disponibil</span>}
        </p>
      </div>
    </div>
  );

  const renderAdminStep = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1.5">
            Prenume *
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            value={formData.firstName}
            onChange={handleChange}
            className={inputClasses}
            placeholder="Ion"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1.5">
            Nume *
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            required
            value={formData.lastName}
            onChange={handleChange}
            className={inputClasses}
            placeholder="Popescu"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
            Email *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={handleChange}
            className={inputClasses}
            placeholder="ion@example.com"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1.5">
            Telefon
          </label>
          <input
            id="phoneNumber"
            name="phoneNumber"
            type="tel"
            value={formData.phoneNumber}
            onChange={handleChange}
            className={inputClasses}
            placeholder="+40 712 345 678"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
            Parola *
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            value={formData.password}
            onChange={handleChange}
            className={inputClasses}
            placeholder="Minim 8 caractere"
            disabled={loading}
            minLength={8}
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
            Confirmare Parola *
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            value={formData.confirmPassword}
            onChange={handleChange}
            className={inputClasses}
            placeholder="Repeta parola"
            disabled={loading}
          />
        </div>
      </div>

      <div>
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.acceptedTerms}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, acceptedTerms: e.target.checked }));
              setError('');
            }}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            disabled={loading}
          />
          <span className="text-sm text-gray-600">
            Am citit si accept{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:text-blue-800">
              Termenii si Conditiile
            </a>{' '}
            si{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:text-blue-800">
              Politica de Confidentialitate
            </a>
          </span>
        </label>
      </div>
    </div>
  );

  const renderSectorStep = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Selectati domeniul principal. Aceasta optiune configureaza automat tipul de active si terminologia.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sectors.map((sector) => {
          const IconComponent = SECTOR_ICONS[sector.icon] || Car;
          const isSelected = formData.activitySector === sector.key;

          return (
            <button
              key={sector.key}
              type="button"
              onClick={() => handleSectorSelect(sector.key)}
              className={`rounded-xl border-2 p-4 text-left transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`rounded-lg p-2 ${
                    isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <IconComponent className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-semibold ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                    {sector.labelRo}
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{sector.description}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {sector.hasAssets ? `Tip activ: ${sector.terminology.asset.singular}` : 'Fara gestiune active'}
                  </p>
                </div>
                {isSelected && (
                  <div className="rounded-full bg-blue-600 p-0.5 text-white">
                    <Check className="h-3.5 w-3.5" />
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
    <div className="flex min-h-screen flex-col bg-gray-50/80">
      {/* Header */}
      <header className="border-b border-gray-200/60 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/business" className="text-lg font-bold tracking-tight text-gray-900">
            ForjaIt
          </Link>
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Autentificare
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Creeaza contul organizatiei</h1>
            <p className="mt-2 text-sm text-gray-500">
              14 zile gratuit pe orice plan. Fara card bancar.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            {renderStepIndicator()}

            {error && (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {renderCurrentStep()}

              <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
                {currentStep > 0 ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={loading}
                    className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
                  >
                    <ArrowLeft className="h-4 w-4" />
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
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Urmatorul
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading || !formData.activitySector}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Se creeaza...' : 'Creeaza Contul'}
                    {!loading && <Check className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Ai deja un cont?{' '}
              <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                Conecteaza-te
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-xs text-gray-400 sm:px-6">
          &copy; {new Date().getFullYear()} ForjaIt. Toate drepturile rezervate.
        </div>
      </footer>
    </div>
  );
};

export default Signup;
