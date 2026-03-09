import { useState } from 'react';
import { MapPin, Clock } from 'lucide-react';
import TimePicker from '../ui/TimePicker';

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Luni' },
  { key: 'tuesday', label: 'Marti' },
  { key: 'wednesday', label: 'Miercuri' },
  { key: 'thursday', label: 'Joi' },
  { key: 'friday', label: 'Vineri' },
  { key: 'saturday', label: 'Sambata' },
  { key: 'sunday', label: 'Duminica' },
];

const DEFAULT_OPERATING_HOURS = {
  monday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
  tuesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
  wednesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
  thursday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
  friday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
  saturday: { isOpen: false, openTime: '10:00', closeTime: '14:00' },
  sunday: { isOpen: false, openTime: '10:00', closeTime: '14:00' },
};

const inputClass = 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition';

/** Transform frontend shape to the shape the backend schema expects */
const toBackendHours = (operatingHours) => {
  const result = {};
  for (const [day, hours] of Object.entries(operatingHours)) {
    result[day] = {
      open: hours.openTime,
      close: hours.closeTime,
      closed: !hours.isOpen,
    };
  }
  return result;
};

const LocationStep = ({ onNext, onBack, isSaving }) => {
  const [formData, setFormData] = useState({
    name: 'Sediu Principal',
    address: '',
    city: '',
    county: '',
    phone: '',
    email: '',
    operatingHours: DEFAULT_OPERATING_HOURS,
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Numele locatiei este obligatoriu';
    if (!formData.address.trim()) newErrors.address = 'Adresa este obligatorie';
    if (!formData.city.trim()) newErrors.city = 'Orasul este obligatoriu';
    return newErrors;
  };

  const handleSubmit = () => {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onNext({
      ...formData,
      operatingHours: toBackendHours(formData.operatingHours),
      isPrimary: true,
      isActive: true,
    });
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleHoursChange = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: { ...prev.operatingHours[day], [field]: value },
      },
    }));
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
          <MapPin className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800">Prima locatie</h2>
        <p className="text-gray-500 text-sm mt-1">Adauga locatia principala a afacerii tale</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Numele locatiei *</label>
          <input
            type="text"
            value={formData.name}
            onChange={e => handleChange('name', e.target.value)}
            className={`${inputClass} ${errors.name ? 'border-red-500' : ''}`}
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Adresa *</label>
          <input
            type="text"
            value={formData.address}
            onChange={e => handleChange('address', e.target.value)}
            className={`${inputClass} ${errors.address ? 'border-red-500' : ''}`}
          />
          {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Oras *</label>
          <input
            type="text"
            value={formData.city}
            onChange={e => handleChange('city', e.target.value)}
            className={`${inputClass} ${errors.city ? 'border-red-500' : ''}`}
          />
          {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Judet</label>
          <input
            type="text"
            value={formData.county}
            onChange={e => handleChange('county', e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={e => handleChange('phone', e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={e => handleChange('email', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Operating Hours */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-700">Program de lucru</h3>
        </div>
        <div className="space-y-2">
          {DAYS_OF_WEEK.map(({ key, label }) => {
            const dayHours = formData.operatingHours[key];
            return (
              <div key={key} className="flex items-center gap-3">
                <label className="flex items-center gap-2 w-28">
                  <input
                    type="checkbox"
                    checked={dayHours.isOpen}
                    onChange={e => handleHoursChange(key, 'isOpen', e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
                {dayHours.isOpen && (
                  <div className="flex items-center gap-2">
                    <TimePicker
                      value={dayHours.openTime}
                      onChange={v => handleHoursChange(key, 'openTime', v)}
                    />
                    <span className="text-gray-400">-</span>
                    <TimePicker
                      value={dayHours.closeTime}
                      onChange={v => handleHoursChange(key, 'closeTime', v)}
                    />
                  </div>
                )}
                {!dayHours.isOpen && <span className="text-sm text-gray-400">Inchis</span>}
              </div>
            );
          })}
        </div>
      </div>

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

export default LocationStep;
