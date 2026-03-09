import { useState } from 'react';
import { Wrench, Plus, Trash2 } from 'lucide-react';

const inputClass = 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition';

const ServicesStep = ({ onNext, onBack, isSaving }) => {
  const [services, setServices] = useState([
    { id: crypto.randomUUID(), name: '', price: '', duration: '' },
  ]);
  const [errors, setErrors] = useState({});

  const addService = () => {
    setServices(prev => [...prev, { id: crypto.randomUUID(), name: '', price: '', duration: '' }]);
  };

  const removeService = (id) => {
    if (services.length <= 1) return;
    setServices(prev => prev.filter(s => s.id !== id));
    setErrors(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const updateService = (id, field, value) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    if (errors[id]) {
      setErrors(prev => ({ ...prev, [id]: undefined }));
    }
  };

  const validate = () => {
    const newErrors = {};
    services.forEach(s => {
      if (!s.name.trim()) newErrors[s.id] = 'Numele serviciului este obligatoriu';
    });
    return newErrors;
  };

  const handleSubmit = () => {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    const cleaned = services.map(s => ({
      id: s.id,
      name: s.name.trim(),
      price: s.price ? String(s.price) : '',
      duration: s.duration ? String(s.duration) : '',
    }));
    onNext(cleaned);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-3">
          <Wrench className="w-6 h-6 text-purple-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800">Servicii</h2>
        <p className="text-gray-500 text-sm mt-1">Adauga serviciile oferite de afacerea ta</p>
      </div>

      <div className="space-y-4">
        {services.map((service, index) => (
          <div key={service.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-600">Serviciu {index + 1}</span>
              {services.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeService(service.id)}
                  className="p-1 text-red-400 hover:text-red-600 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nume serviciu *</label>
                <input
                  type="text"
                  value={service.name}
                  onChange={e => updateService(service.id, 'name', e.target.value)}
                  placeholder="ex: Consultanta, Reparatie, etc."
                  className={`${inputClass} ${errors[service.id] ? 'border-red-500' : ''}`}
                />
                {errors[service.id] && <p className="text-red-500 text-xs mt-1">{errors[service.id]}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pret (RON)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={service.price}
                  onChange={e => updateService(service.id, 'price', e.target.value)}
                  placeholder="0.00"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Durata (min)</label>
                <input
                  type="number"
                  min="0"
                  value={service.duration}
                  onChange={e => updateService(service.id, 'duration', e.target.value)}
                  placeholder="60"
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addService}
        className="flex items-center gap-2 text-primary hover:text-primary/80 font-medium text-sm transition"
      >
        <Plus className="w-4 h-4" />
        Adauga alt serviciu
      </button>

      {/* Actions */}
      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-2.5 text-gray-600 hover:text-gray-800 font-medium transition"
        >
          Inapoi
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSaving}
          className="px-8 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium transition disabled:opacity-50"
        >
          {isSaving ? 'Se salveaza...' : 'Continua'}
        </button>
      </div>
    </div>
  );
};

export default ServicesStep;
