import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, CheckCircle2 } from 'lucide-react';
import { useLocationMutations } from '../hooks/useLocations';
import { useServicesMutation } from '../hooks/useServices';
import useOnboardingStatus from '../hooks/useOnboardingStatus';
import LocationStep from '../components/onboarding/LocationStep';
import ServicesStep from '../components/onboarding/ServicesStep';

const STEPS = [
  { id: 'location', title: 'Locatie' },
  { id: 'services', title: 'Servicii' },
  { id: 'done', title: 'Finalizare' },
];

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
    saved?.completed ?? { location: false, services: false }
  );

  // Hooks
  const { markCompleted, isMarkingCompleted } = useOnboardingStatus();
  const { createLocation, isCreating: isSavingLocation } = useLocationMutations();
  const { updateServices, isSaving: isSavingServices } = useServicesMutation();

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

  // Step indicator
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base font-semibold transition-all ${
                index < currentStep
                  ? 'bg-green-500 text-white'
                  : index === currentStep
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {index < currentStep ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : index + 1}
            </div>
            <span
              className={`text-[10px] sm:text-xs mt-1 ${
                index === currentStep ? 'text-primary font-medium' : 'text-gray-500'
              }`}
            >
              {step.title}
            </span>
          </div>
          {index < STEPS.length - 1 && (
            <div
              className={`w-8 sm:w-16 h-0.5 sm:h-1 mx-1 sm:mx-2 ${
                index < currentStep ? 'bg-green-500' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  // Step 1: Location (delegated to LocationStep)
  const handleLocationSubmit = async (locationData) => {
    setError('');
    try {
      await createLocation(locationData);
      setCompletedSteps(prev => ({ ...prev, location: true }));
      setCurrentStep(1);
    } catch (err) {
      setError(err.message || 'Eroare la crearea locatiei');
    }
  };

  // Step 2: Services (delegated to ServicesStep)
  const handleServicesSubmit = async (services) => {
    setError('');
    try {
      await updateServices(services);
      setCompletedSteps(prev => ({ ...prev, services: true }));
      setCurrentStep(2);
    } catch (err) {
      setError(err.message || 'Eroare la salvarea serviciilor');
    }
  };

  // Step 3: Completion
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
          <Check className="w-5 h-5 text-green-500 shrink-0" />
          <span className="text-gray-800">Profil companie</span>
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
        return (
          <LocationStep
            onNext={handleLocationSubmit}
            isSaving={isSavingLocation}
          />
        );
      case 1:
        return (
          <ServicesStep
            onNext={handleServicesSubmit}
            onBack={() => setCurrentStep(0)}
            isSaving={isSavingServices}
          />
        );
      case 2:
        return renderCompletionStep();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-1">ForjaIt</h1>
            <p className="text-gray-500 text-sm">Configureaza locatia si serviciile</p>
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
          {currentStep < 2 && (
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
