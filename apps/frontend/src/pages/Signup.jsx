import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  signupOrganization,
  checkSlugAvailability,
  validateVatPublic,
  fetchPricing,
} from '../services/organizationService';
import { getSectorList } from '../constants/activitySectors';
import { useAuthStore } from '../state/useAuthStore';
import {
  Car,
  Scissors,
  Wrench,
  Smartphone,
  Check,
  ArrowLeft,
  ArrowRight,
  Building2,
  Loader2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { SIGNUP_PLANS } from '../constants/plans';
import SEOHead from '../components/landing/SEOHead';
import { runtimeConfig } from '../config/runtime';

const STEPS = [
  { id: 'organization', title: 'Organizatie', description: 'Detalii organizatie' },
  { id: 'admin', title: 'Administrator', description: 'Cont administrator' },
  { id: 'sector', title: 'Domeniu', description: 'Domeniu de activitate' },
  { id: 'company', title: 'Companie', description: 'Profil companie' },
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
    plan: 'PROFESSIONAL',
    acceptedTerms: false,
  });

  // Company profile state (step 4)
  const [companyData, setCompanyData] = useState({
    companyAddress: '',
    companyEmail: '',
    companyPhone: '',
    entityType: 'SRL',
    vatNumber: '',
    registrationNumber: '',
    cnp: '',
  });
  const [companyErrors, setCompanyErrors] = useState({});
  const [vatValidation, setVatValidation] = useState({ status: 'idle', message: '', data: null });
  const [nameFromVies, setNameFromVies] = useState(false);

  const sectors = getSectorList();

  // Fetch dynamic prices from PlatformSettings
  const [dynamicPrices, setDynamicPrices] = useState(null);
  useEffect(() => {
    fetchPricing()
      .then(setDynamicPrices)
      .catch(() => {
        /* keep fallback prices */
      });
  }, []);

  // Override SIGNUP_PLANS prices with dynamic values when available
  const signupPlans = useMemo(() => {
    if (!dynamicPrices) return SIGNUP_PLANS;
    const keyMap = { STARTER: 'starter', PROFESSIONAL: 'professional', ENTERPRISE: 'enterprise' };
    return SIGNUP_PLANS.map((plan) => {
      const remote = dynamicPrices[keyMap[plan.key]];
      if (!remote || remote.monthly == null) return plan;
      return { ...plan, price: remote.monthly };
    });
  }, [dynamicPrices]);

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

  const handleCompanyChange = (field, value) => {
    setCompanyData((prev) => ({ ...prev, [field]: value }));
    if (companyErrors[field]) setCompanyErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleVerifyVat = async () => {
    if (!companyData.vatNumber.trim()) return;
    setVatValidation({ status: 'loading', message: '', data: null });
    try {
      const result = await validateVatPublic(companyData.vatNumber);
      setVatValidation({ status: 'valid', message: `CUI valid: ${result.name}`, data: result });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Eroare la verificare';
      setVatValidation({ status: 'invalid', message: msg, data: null });
    }
  };

  const handleApplyViesData = () => {
    if (!vatValidation.data) return;
    if (vatValidation.data.name) {
      setFormData((prev) => ({ ...prev, organizationName: vatValidation.data.name }));
      setNameFromVies(true);
    }
    if (vatValidation.data.address) {
      setCompanyData((prev) => ({ ...prev, companyAddress: vatValidation.data.address }));
    }
  };

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_REGEX = /^(\+?4?0?\s?)?(2\d{2}|3\d{2}|7\d{2})\s?\d{3}\s?\d{3,4}$/;

  const validateStep = (step) => {
    switch (step) {
      case 0:
        if (!formData.organizationName.trim()) {
          setError('Numele organizatiei este obligatoriu');
          return false;
        }
        if (formData.organizationName.trim().length < 2) {
          setError('Numele organizatiei trebuie sa aiba minim 2 caractere');
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
        if (!EMAIL_REGEX.test(formData.email.trim())) {
          setError('Adresa de email nu este valida');
          return false;
        }
        if (formData.phoneNumber && !PHONE_REGEX.test(formData.phoneNumber.replace(/\s+/g, ''))) {
          setError('Numarul de telefon nu este valid (format RO, ex: 0712345678)');
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
      case 3: {
        const errs = {};
        if (!companyData.companyAddress.trim()) errs.companyAddress = 'Adresa este obligatorie';
        if (!companyData.companyEmail.trim()) {
          errs.companyEmail = 'Email-ul este obligatoriu';
        } else if (!EMAIL_REGEX.test(companyData.companyEmail.trim())) {
          errs.companyEmail = 'Adresa de email nu este valida';
        }
        if (!companyData.companyPhone.trim()) {
          errs.companyPhone = 'Telefonul este obligatoriu';
        } else if (!PHONE_REGEX.test(companyData.companyPhone.replace(/\s+/g, ''))) {
          errs.companyPhone = 'Numarul de telefon nu este valid (format RO, ex: 0712345678)';
        }
        if (!companyData.vatNumber.trim()) {
          errs.vatNumber = 'CUI-ul este obligatoriu';
        } else if (vatValidation.status !== 'valid') {
          errs.vatNumber = 'Verificarea CUI este obligatorie pentru a continua';
        }
        if (Object.keys(errs).length > 0) {
          setCompanyErrors(errs);
          return false;
        }
        return true;
      }
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
      const { confirmPassword, acceptedTerms, ...signupFields } = formData;
      const payload = {
        ...signupFields,
        ...companyData,
      };
      const result = await signupOrganization(payload);

      // Set auth session (accessToken + user) in the store so API calls work immediately
      useAuthStore.getState().setSession({
        user: result.user,
        accessToken: result.accessToken,
      });

      // Cache user data for display hydration on reload (include role for hasRole checks)
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: result.user.id,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          avatarUrl: result.user.avatarUrl,
          role: result.user.role,
          roles: result.user.roles,
          orgStatus: result.user.orgStatus,
        })
      );

      // Use React Router navigate (no full reload) so auth state persists
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Inregistrarea a esuat. Va rugam incercati din nou.');
    } finally {
      setLoading(false);
    }
  };

  const inputClasses =
    'w-full rounded-lg border border-gray-300 bg-gray-50/50 px-4 py-2.5 text-sm transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 focus:outline-none';

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-xs sm:text-sm font-semibold transition-all ${
                index < currentStep
                  ? 'bg-green-500 text-white'
                  : index === currentStep
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            <span
              className={`mt-1 text-[10px] sm:text-xs ${
                index === currentStep ? 'font-medium text-gray-900' : 'text-gray-400'
              }`}
            >
              {step.title}
            </span>
          </div>
          {index < STEPS.length - 1 && (
            <div
              className={`mx-1 sm:mx-3 h-0.5 w-6 sm:w-12 ${
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
        <label
          htmlFor="organizationName"
          className="block text-sm font-medium text-gray-700 mb-1.5"
        >
          Numele Organizatiei *
        </label>
        <input
          id="organizationName"
          name="organizationName"
          type="text"
          required
          value={formData.organizationName}
          onChange={handleChange}
          readOnly={nameFromVies}
          className={`${inputClasses} ${nameFromVies ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
          placeholder="Numele companiei SRL"
          disabled={loading}
        />
        {nameFromVies && (
          <p className="text-xs text-gray-400 mt-1">Numele a fost completat automat din VIES</p>
        )}
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
            placeholder="numele-companiei"
            disabled={loading}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          />
          {slugChecking && (
            <div className="absolute right-3 top-2.5">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </div>
        <p className="mt-1.5 text-xs text-gray-500">
          Litere mici, numere si cratime. Adresa portalului: {runtimeConfig.portalUrl}/book/
          {formData.slug || 'slug'}
          {slugAvailable === false && (
            <span className="ml-2 font-medium text-red-600">Nu este disponibil</span>
          )}
          {slugAvailable === true && (
            <span className="ml-2 font-medium text-green-600">Disponibil</span>
          )}
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
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
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
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            disabled={loading}
          />
          <span className="text-sm text-gray-600">
            Am citit si accept{' '}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:text-primary-800"
            >
              Termenii si Conditiile
            </a>{' '}
            si{' '}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:text-primary-800"
            >
              Politica de Confidentialitate
            </a>
          </span>
        </label>
      </div>
    </div>
  );

  const renderSectorStep = () => (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500 mb-3">
          Selectati domeniul principal. Aceasta optiune configureaza automat tipul de active si
          terminologia.
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
                    ? 'border-primary bg-primary-50 ring-1 ring-primary'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`rounded-lg p-2 ${
                      isSelected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3
                      className={`text-sm font-semibold ${isSelected ? 'text-primary-700' : 'text-gray-900'}`}
                    >
                      {sector.labelRo}
                    </h3>
                    <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
                      {sector.description}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {sector.hasAssets
                        ? `Tip activ: ${sector.terminology.asset.singular}`
                        : 'Fara gestiune active'}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="rounded-full bg-primary p-0.5 text-white">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Plan selection */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">
          Alege planul (14 zile gratuit pe orice plan)
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {signupPlans.map((plan) => {
            const isSelected = formData.plan === plan.key;
            return (
              <button
                key={plan.key}
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, plan: plan.key }))}
                className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                  isSelected
                    ? 'border-primary bg-primary-50 ring-1 ring-primary'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {plan.recommended && (
                  <span className="absolute -top-2.5 right-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-white">
                    Recomandat
                  </span>
                )}
                <h4
                  className={`text-sm font-bold ${isSelected ? 'text-primary-700' : 'text-gray-900'}`}
                >
                  {plan.name}
                </h4>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-lg font-extrabold text-gray-900">{plan.price}</span>
                  <span className="text-xs text-gray-500">RON/luna</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">{plan.desc}</p>
                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderCompanyStep = () => (
    <div className="space-y-5">
      <div className="text-center mb-2">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mb-3">
          <Building2 className="w-6 h-6 text-orange-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-800">Profil companie</h2>
        <p className="text-gray-500 text-xs mt-1">
          Informatii esentiale pentru facturare si identificare
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Adresa *</label>
          <input
            type="text"
            value={companyData.companyAddress}
            onChange={(e) => handleCompanyChange('companyAddress', e.target.value)}
            className={`${inputClasses} ${companyErrors.companyAddress ? '!border-red-400' : ''}`}
            disabled={loading}
          />
          {companyErrors.companyAddress && (
            <p className="text-red-500 text-xs mt-1">{companyErrors.companyAddress}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email companie *</label>
          <input
            type="email"
            value={companyData.companyEmail}
            onChange={(e) => handleCompanyChange('companyEmail', e.target.value)}
            className={`${inputClasses} ${companyErrors.companyEmail ? '!border-red-400' : ''}`}
            disabled={loading}
          />
          {companyErrors.companyEmail && (
            <p className="text-red-500 text-xs mt-1">{companyErrors.companyEmail}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefon companie *</label>
          <input
            type="tel"
            value={companyData.companyPhone}
            onChange={(e) => handleCompanyChange('companyPhone', e.target.value)}
            className={`${inputClasses} ${companyErrors.companyPhone ? '!border-red-400' : ''}`}
            disabled={loading}
          />
          {companyErrors.companyPhone && (
            <p className="text-red-500 text-xs mt-1">{companyErrors.companyPhone}</p>
          )}
        </div>

        {/* Entity type */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tip entitate juridica
          </label>
          <div className="flex gap-6">
            {['SRL', 'PFA'].map((type) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="entityType"
                  value={type}
                  checked={companyData.entityType === type}
                  onChange={() => handleCompanyChange('entityType', type)}
                  className="h-4 w-4 text-primary"
                  disabled={loading}
                />
                <span className="text-sm font-medium text-gray-700">{type}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {companyData.entityType === 'PFA' ? 'NIF / CIF *' : 'CUI *'}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={companyData.vatNumber}
              onChange={(e) => {
                handleCompanyChange('vatNumber', e.target.value);
                setVatValidation({ status: 'idle', message: '', data: null });
                setNameFromVies(false);
              }}
              placeholder={
                companyData.entityType === 'PFA' ? 'Numar de identificare fiscala' : 'RO12345678'
              }
              className={inputClasses}
              disabled={loading}
            />
            <button
              type="button"
              onClick={handleVerifyVat}
              disabled={
                !companyData.vatNumber.trim() || vatValidation.status === 'loading' || loading
              }
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium whitespace-nowrap transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {vatValidation.status === 'loading' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Verifica'
              )}
            </button>
          </div>
          {vatValidation.status === 'valid' && (
            <div className="mt-2">
              <div className="flex items-center gap-1.5 text-green-600 text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>{vatValidation.message}</span>
              </div>
              {vatValidation.data?.name && !nameFromVies && (
                <button
                  type="button"
                  onClick={handleApplyViesData}
                  className="mt-1 text-xs text-primary hover:underline"
                >
                  Completeaza automat numele si adresa
                </button>
              )}
            </div>
          )}
          {vatValidation.status === 'invalid' && (
            <div className="flex items-center gap-1.5 mt-2 text-red-600 text-sm">
              <XCircle className="w-4 h-4" />
              <span>{vatValidation.message}</span>
            </div>
          )}
          {companyErrors.vatNumber && (
            <p className="text-red-500 text-xs mt-1">{companyErrors.vatNumber}</p>
          )}
        </div>

        {companyData.entityType === 'SRL' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nr. Registrul Comertului (optional)
            </label>
            <input
              type="text"
              value={companyData.registrationNumber}
              onChange={(e) => handleCompanyChange('registrationNumber', e.target.value)}
              placeholder="J40/1234/2024"
              className={inputClasses}
              disabled={loading}
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CNP (optional)</label>
            <input
              type="text"
              value={companyData.cnp}
              onChange={(e) => handleCompanyChange('cnp', e.target.value)}
              placeholder="Cod numeric personal (13 cifre)"
              maxLength={13}
              className={inputClasses}
              disabled={loading}
            />
          </div>
        )}
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
      case 3:
        return renderCompanyStep();
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50/80">
      <SEOHead
        title={`Inregistrare - Creeaza cont ${runtimeConfig.platformName} gratuit | 14 zile trial`}
        description={`Creeaza cont gratuit ${runtimeConfig.platformName} in 2 minute. Programari online, CRM, facturare si website builder. 14 zile trial pe orice plan, fara card de credit.`}
        canonical={`${runtimeConfig.platformUrl}/signup`}
      />
      {/* Header */}
      <header className="border-b border-gray-200/60 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="text-lg font-bold tracking-tight text-gray-900">
            {runtimeConfig.platformName}
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
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Incepe in 5 minute. Rezultate din prima zi.
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              14 zile gratuit pe orice plan. Fara card bancar. Fara obligatii.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-8 shadow-sm">
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
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Urmatorul
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading || vatValidation.status !== 'valid'}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
              <Link
                to="/login"
                className="font-semibold text-primary hover:text-primary-800 transition-colors"
              >
                Conecteaza-te
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-3 mb-3 text-xs text-gray-500">
            <a
              href="https://anpc.ro/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded border border-gray-300 px-2.5 py-1.5 font-medium transition hover:bg-gray-100 hover:text-gray-700"
            >
              ANPC
            </a>
            <a
              href="https://anpc.ro/ce-este-sal/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded border border-gray-300 px-2.5 py-1.5 font-medium transition hover:bg-gray-100 hover:text-gray-700"
            >
              SAL
            </a>
          </div>
          <p className="text-center text-xs text-gray-400">
            &copy; {new Date().getFullYear()} {runtimeConfig.platformName}. Toate drepturile
            rezervate.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Signup;
