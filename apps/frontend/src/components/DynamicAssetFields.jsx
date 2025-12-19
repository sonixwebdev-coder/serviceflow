import { useTerminology } from '../context/TerminologyContext';
import { getVisibleFields } from '../constants/assetFieldTemplates';
import DatePicker from './ui/DatePicker';

/**
 * DynamicAssetFields Component
 *
 * Renders asset form fields dynamically based on:
 * - Asset type (vehicle, appliance, hvac_unit, equipment, other)
 * - Organization's field configuration (visibility, labels, required fields)
 *
 * @param {string} assetType - The type of asset
 * @param {object} formData - Current form values (includes metadata object)
 * @param {function} onChange - Handler for field changes
 * @param {object} errors - Validation errors object
 * @param {boolean} readOnly - If true, renders fields as read-only
 */
const DynamicAssetFields = ({ assetType, formData, onChange, errors = {}, readOnly = false }) => {
  const { assetFieldConfig } = useTerminology();

  if (!assetType) {
    return null;
  }

  const visibleFields = getVisibleFields(assetType, assetFieldConfig);

  const handleFieldChange = (fieldKey, value) => {
    // Update the metadata object within formData
    onChange({
      ...formData,
      metadata: {
        ...formData.metadata,
        [fieldKey]: value,
      },
    });
  };

  const getFieldValue = (fieldKey) => {
    return formData?.metadata?.[fieldKey] || '';
  };

  const renderField = (field) => {
    const value = getFieldValue(field.key);
    const hasError = errors[field.key];
    const inputClasses = `w-full rounded-lg border ${
      hasError ? 'border-red-500' : 'border-gray-300'
    } px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary ${
      readOnly ? 'bg-gray-50 cursor-not-allowed' : ''
    }`;

    switch (field.type) {
      case 'text':
      case 'number':
        return (
          <div key={field.key} className="space-y-1">
            <label htmlFor={field.key} className="block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type={field.type}
              id={field.key}
              name={field.key}
              value={value}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              readOnly={readOnly}
              disabled={readOnly}
              className={inputClasses}
            />
            {hasError && (
              <p className="text-xs text-red-500 mt-1">{errors[field.key]}</p>
            )}
          </div>
        );

      case 'date':
        // Format date without timezone conversion to avoid day shift
        const formatDateForInput = (dateObj) => {
          if (!dateObj) return '';
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        return (
          <div key={field.key}>
            <DatePicker
              label={
                <>
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </>
              }
              value={value ? new Date(value) : null}
              onChange={(date) => handleFieldChange(field.key, date ? formatDateForInput(date) : '')}
              placeholder={field.placeholder || 'Selecteaza data'}
              required={field.required}
              disabled={readOnly}
            />
            {hasError && (
              <p className="text-xs text-red-500 mt-1">{errors[field.key]}</p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.key} className="space-y-1">
            <label htmlFor={field.key} className="block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              id={field.key}
              name={field.key}
              value={value}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              required={field.required}
              disabled={readOnly}
              className={inputClasses}
            >
              <option value="">Selecteaza...</option>
              {field.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {hasError && (
              <p className="text-xs text-red-500 mt-1">{errors[field.key]}</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (visibleFields.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        Nu sunt campuri configurate pentru acest tip de activ.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {visibleFields.map(renderField)}
    </div>
  );
};

export default DynamicAssetFields;
