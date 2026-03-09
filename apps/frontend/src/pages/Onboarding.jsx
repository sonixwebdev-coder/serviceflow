import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Building2, CheckCircle2, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useUpdateCompanySettings } from '../hooks/useCompanySettings';
import { useLocationMutations } from '../hooks/useLocations';
import { useServicesMutation } from '../hooks/useServices';
import useOnboardingStatus from '../hooks/useOnboardingStatus';
import LocationStep from '../components/onboarding/LocationStep';
import ServicesStep from '../components/onboarding/ServicesStep';
import { validateVatNumber } from '../services/settingsService';

const STEPS = [
  { id: 'company', title: 'Companie' },
  { id: 'location', title: 'Locatie' },
  { id: 'services', title: 'Servicii' },
  { id: 'done', title: 'Finalizare' },
];

const inputClass = 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition';

const STORAGE_KEY = 'onboarding_progress';

const loadProgress = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore
  }
  return null;
};

const saveProgress = (step, completed) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, completed }));
  } catch {
    // ignore
  }
};

const clearProgress = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
};

const Onboarding = () => {
  const navigate = useNavigate();
  const saved = loadProgress();
  const [currentStep, setCurrentStep] = useState(saved?.step ?? 0);
  const [error, setError] = useState('');
  const [completedSteps, setCompletedSteps] = useState(
    saved?.completed ?? { company: false, location: false, services: false }
  );

  // Hooks
  const { markCompleted, isMarkingCompleted, organization } = useOnboardingStatus();
  const { mutateAsync: updateCompany, isPending: isSavingCompany } = useUpdateCompanySettings();
  const { createLocation, isCreating: isSavingLocation } = useLocationMutations();
  const { updateServices, isSaving: isSavingServices } = useServicesMutation();

  // Company form state (Step 1 - inline)
  const [companyData, setCompanyData] = useState({
    companyName: organization?.name || '',
    address: '',
    email: '',
    phone: '',
    entityType: 'SRL',
    vatNumber: '',
    registrationNumber: '',
    cnp: '',
  });
  const [companyErrors, setCompanyErrors] = useState({});

  // VAT validation state
  const [vatValidation, setVatValidation] = useState({ status: 'idle', message: '', data: null });

  const handleVerifyVat = async () => {
    if (!companyData.vatNumber.trim()) return;
    setVatValidation({ status: 'loading', message: '', data: null });
    try {
      const result = await validateVatNumber(companyData.vatNumber);
      setVatValidation({ status: 'valid', message: `CUI valid — ${result.name}`, data: result });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Eroare la verificare';
      setVatValidation({ status: 'invalid', message: msg, data: null });
    }
  };

  const handleApplyViesData = () => {
    if (!vatValidation.data) return;
    const updates = {};
    if (vatValidation.data.name) updates.companyName = vatValidation.data.name;
    if (vatValidation.data.address) updates.address = vatValidation.data.address;
    setCompanyData(prev => ({ ...prev, ...updates }));
  };

  // Persist progress to localStorage whenever step or completed state changes
  useEffect(() => {
    saveProgress(currentStep, completedSteps);
  }, [currentStep, completedSteps]);

  const handleSkip = async () => {
    clearProgress();
    try {
      await markCompleted();
      navigate('/dashboard', { replace: true });
    } catch {
      navigate('/dashboard', { replace: true });
    }
  };

  // Step indicator (same pattern as Signup.jsx)
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
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {index < currentStep ? <Check className="w-5 h-5" /> : index + 1}
            </div>
            <span
              className={`text-xs mt-1 ${
                index === currentStep ? 'text-primary font-medium' : 'text-gray-500'
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

  // Step 1: Company Profile
  const validateCompany = () => {
    const errs = {};
    if (!companyData.address.trim()) errs.address = 'Adresa este obligatorie';
    if (!companyData.email.trim()) errs.email = 'Email-ul este obligatoriu';
    if (!companyData.phone.trim()) errs.phone = 'Telefonul este obligatoriu';
    return errs;
  };

  const handleCompanyChange = (field, value) => {
    setCompanyData(prev => ({ ...prev, [field]: value }));
    if (companyErrors[field]) setCompanyErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleCompanySubmit = async () => {
    const errs = validateCompany();
    if (Object.keys(errs).length > 0) {
      setCompanyErrors(errs);
      return;
    }
    setError('');
    try {
      await updateCompany(companyData);
      setCompletedSteps(prev => ({ ...prev, company: true }));
      setCurrentStep(1);
    } catch (err) {
      setError(err.message || 'Eroare la salvarea datelor companiei');
    }
  };

  const renderCompanyStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mb-3">
          <Building2 className="w-6 h-6 text-orange-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800">Profil companie</h2>
        <p className="text-gray-500 text-sm mt-1">Informatii esentiale pentru facturare si identificare</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Numele companiei</label>
          <input
            type="text"
            value={companyData.companyName}
            onChange={e => handleCompanyChange('companyName', e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Adresa *</label>
          <input
            type="text"
            value={companyData.address}
            onChange={e => handleCompanyChange('address', e.target.value)}
            className={`${inputClass} ${companyErrors.address ? 'border-red-500' : ''}`}
          />
          {companyErrors.address && <p className="text-red-500 text-xs mt-1">{companyErrors.address}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <input
            type="email"
            value={companyData.email}
            onChange={e => handleCompanyChange('email', e.target.value)}
            className={`${inputClass} ${companyErrors.email ? 'border-red-500' : ''}`}
          />
          {companyErrors.email && <p className="text-red-500 text-xs mt-1">{companyErrors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefon *</label>
          <input
            type="tel"
            value={companyData.phone}
            onChange={e => handleCompanyChange('phone', e.target.value)}
            className={`${inputClass} ${companyErrors.phone ? 'border-red-500' : ''}`}
          />
          {companyErrors.phone && <p className="text-red-500 text-xs mt-1">{companyErrors.phone}</p>}
        </div>

        {/* Entity type */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Tip entitate juridica</label>
          <div className="flex gap-6">
            {['SRL', 'PFA'].map(type => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="entityType"
                  value={type}
                  checked={companyData.entityType === type}
                  onChange={() => handleCompanyChange('entityType', type)}
                  className="h-4 w-4 text-primary"
                />
                <span className="text-sm font-medium text-gray-700">{type}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {companyData.entityType === 'PFA' ? 'NIF / CIF (optional)' : 'CUI (optional)'}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={companyData.vatNumber}
              onChange={e => {
                handleCompanyChange('vatNumber', e.target.value);
                setVatValidation({ status: 'idle', message: '', data: null });
              }}
              placeholder={companyData.entityType === 'PFA' ? 'Numar de identificare fiscala' : 'RO12345678'}
              className={inputClass}
            />
            <button
              type="button"
              onClick={handleVerifyVat}
              disabled={!companyData.vatNumber.trim() || vatValidation.status === 'loading'}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium whitespace-nowrap transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {vatValidation.status === 'loading' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : 'Verifica'}
            </button>
          </div>
          {vatValidation.status === 'valid' && (
            <div className="mt-2">
              <div className="flex items-center gap-1.5 text-green-600 text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>{vatValidation.message}</span>
              </div>
              {vatValidation.data?.name && (
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
        </div>

        {companyData.entityType === 'SRL' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nr. Registrul Comertului (optional)</label>
            <input
              type="text"
              value={companyData.registrationNumber}
              onChange={e => handleCompanyChange('registrationNumber', e.target.value)}
              placeholder="J40/1234/2024"
              className={inputClass}
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CNP (optional)</label>
            <input
              type="text"
              value={companyData.cnp}
              onChange={e => handleCompanyChange('cnp', e.target.value)}
              placeholder="Cod numeric personal (13 cifre)"
              maxLength={13}
              className={inputClass}
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={handleCompanySubmit}
          disabled={isSavingCompany}
          className="px-8 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium transition disabled:opacity-50"
        >
          {isSavingCompany ? 'Se salveaza...' : 'Continua'}
        </button>
      </div>
    </div>
  );

  // Step 2: Location (delegated to LocationStep)
  const handleLocationSubmit = async (locationData) => {
    setError('');
    try {
      await createLocation(locationData);
      setCompletedSteps(prev => ({ ...prev, location: true }));
      setCurrentStep(2);
    } catch (err) {
      setError(err.message || 'Eroare la crearea locatiei');
    }
  };

  // Step 3: Services (delegated to ServicesStep)
  const handleServicesSubmit = async (services) => {
    setError('');
    try {
      await updateServices(services);
      setCompletedSteps(prev => ({ ...prev, services: true }));
      setCurrentStep(3);
    } catch (err) {
      setError(err.message || 'Eroare la salvarea serviciilor');
    }
  };

  // Step 4: Completion
  const handleFinish = async () => {
    clearProgress();
    try {
      await markCompleted();
      navigate('/dashboard', { replace: true });
    } catch {
      navigate('/dashboard', { replace: true });
    }
  };

  const renderCompletionStep = () => (
    <div className="space-y-6 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-2">
        <CheckCircle2 className="w-8 h-8 text-green-600" />
      </div>
      <h2 className="text-xl font-semibold text-gray-800">Configurare finalizata!</h2>
      <p className="text-gray-500">Iata ce ai configurat:</p>

      <div className="space-y-3 max-w-sm mx-auto text-left">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
          {completedSteps.company ? (
            <Check className="w-5 h-5 text-green-500 shrink-0" />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0" />
          )}
          <span className={completedSteps.company ? 'text-gray-800' : 'text-gray-400'}>Profil companie</span>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
          {completedSteps.location ? (
            <Check className="w-5 h-5 text-green-500 shrink-0" />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0" />
          )}
          <span className={completedSteps.location ? 'text-gray-800' : 'text-gray-400'}>Locatie principala</span>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
          {completedSteps.services ? (
            <Check className="w-5 h-5 text-green-500 shrink-0" />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0" />
          )}
          <span className={completedSteps.services ? 'text-gray-800' : 'text-gray-400'}>Servicii</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleFinish}
        disabled={isMarkingCompleted}
        className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-semibold transition disabled:opacity-50 mt-4"
      >
        {isMarkingCompleted ? 'Se finalizeaza...' : 'Mergi la tablou de bord'}
      </button>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return renderCompanyStep();
      case 1:
        return (
          <LocationStep
            onNext={handleLocationSubmit}
            onBack={() => setCurrentStep(0)}
            isSaving={isSavingLocation}
          />
        );
      case 2:
        return (
          <ServicesStep
            onNext={handleServicesSubmit}
            onBack={() => setCurrentStep(1)}
            isSaving={isSavingServices}
          />
        );
      case 3:
        return renderCompletionStep();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-primary mb-1">ForjaIt</h1>
            <p className="text-gray-500 text-sm">Configureaza-ti contul in cateva minute</p>
          </div>

          {/* Step Indicator */}
          {renderStepIndicator()}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Step Content */}
          {renderCurrentStep()}

          {/* Skip Link */}
          {currentStep < 3 && (
            <div className="text-center mt-6 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleSkip}
                className="text-sm text-gray-400 hover:text-gray-600 transition"
              >
                Sari peste configurare
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
