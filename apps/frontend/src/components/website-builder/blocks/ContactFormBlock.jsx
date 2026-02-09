import { useState } from 'react';
import { cn } from '@/lib/utils';
import { MapPin, Phone, Mail, Send, CheckCircle } from 'lucide-react';

const ContactFormBlock = ({ data, settings, isEditing = false, onClick }) => {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    title = 'Contacteaza-ne',
    subtitle = '',
    fields = [
      { key: 'firstName', label: 'Prenume', type: 'text', required: true },
      { key: 'lastName', label: 'Nume', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'email', required: true },
      { key: 'phone', label: 'Telefon', type: 'phone', required: false },
      { key: 'message', label: 'Mesaj', type: 'textarea', required: false },
    ],
    submitText = 'Trimite mesaj',
    successMessage = 'Multumim pentru mesaj! Veti fi contactat in curand.',
    showPhone = true,
    showAddress = true,
    showMap = false,
  } = data || {};

  const {
    backgroundColor = '#ffffff',
    textColor = '#1f2937',
    padding = { top: 60, bottom: 60 },
    maxWidth = 'lg',
  } = settings || {};

  const maxWidthClasses = {
    sm: 'max-w-xl',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-5xl',
    full: 'max-w-full',
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isEditing) return;
    // In real implementation, this would call the API
    setIsSubmitted(true);
  };

  return (
    <div
      className={cn(
        'w-full px-6',
        isEditing && 'cursor-pointer hover:ring-2 hover:ring-blue-500 hover:ring-offset-2'
      )}
      style={{
        backgroundColor,
        paddingTop: `${padding.top}px`,
        paddingBottom: `${padding.bottom}px`,
      }}
      onClick={onClick}
    >
      <div className={cn('mx-auto', maxWidthClasses[maxWidth])}>
        {/* Header */}
        {(title || subtitle) && (
          <div className="text-center mb-12">
            {title && (
              <h2
                className="text-3xl font-bold mb-4"
                style={{ color: textColor }}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                {subtitle}
              </p>
            )}
          </div>
        )}

        <div className={cn(
          'grid gap-8',
          (showPhone || showAddress) ? 'md:grid-cols-2' : 'md:grid-cols-1'
        )}>
          {/* Contact Info */}
          {(showPhone || showAddress) && (
            <div className="space-y-6">
              {showAddress && (
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Adresa</h3>
                    <p className="text-gray-600">
                      Str. Exemplu nr. 123<br />
                      Bucuresti, Romania
                    </p>
                  </div>
                </div>
              )}

              {showPhone && (
                <>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Phone className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Telefon</h3>
                      <p className="text-gray-600">+40 721 234 567</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Email</h3>
                      <p className="text-gray-600">contact@exemplu.ro</p>
                    </div>
                  </div>
                </>
              )}

              {showMap && (
                <div className="h-48 bg-gray-200 rounded-lg flex items-center justify-center mt-4">
                  <span className="text-gray-500 text-sm">Harta</span>
                </div>
              )}
            </div>
          )}

          {/* Contact Form */}
          <div className="bg-white rounded-lg border shadow-sm">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">Trimite-ne un mesaj</h3>
              <p className="text-sm text-gray-500 mt-1">
                Completeaza formularul si te vom contacta in cel mai scurt timp.
              </p>
            </div>
            <div className="p-6">
              {isSubmitted && !isEditing ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-medium text-green-700">{successMessage}</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {fields.map((field) => (
                    <div key={field.key}>
                      <label htmlFor={field.key} className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {field.type === 'textarea' ? (
                        <textarea
                          id={field.key}
                          placeholder={field.label}
                          required={field.required}
                          disabled={isEditing}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      ) : field.type === 'select' ? (
                        <select
                          id={field.key}
                          required={field.required}
                          disabled={isEditing}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                          <option value="">-- Selectati --</option>
                          {field.options?.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={field.key}
                          type={field.type}
                          placeholder={field.label}
                          required={field.required}
                          disabled={isEditing}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      )}
                    </div>
                  ))}

                  <button
                    type="submit"
                    disabled={isEditing}
                    className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {submitText}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const contactFormBlockDefaults = {
  title: 'Contacteaza-ne',
  subtitle: 'Suntem aici sa va ajutam',
  fields: [
    { key: 'firstName', label: 'Prenume', type: 'text', required: true },
    { key: 'lastName', label: 'Nume', type: 'text', required: true },
    { key: 'email', label: 'Email', type: 'email', required: true },
    { key: 'phone', label: 'Telefon', type: 'phone', required: false },
    { key: 'message', label: 'Mesaj', type: 'textarea', required: false },
  ],
  submitText: 'Trimite mesaj',
  successMessage: 'Multumim pentru mesaj! Veti fi contactat in curand.',
  showPhone: true,
  showAddress: true,
  showMap: false,
};

export default ContactFormBlock;
