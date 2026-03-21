import { useState } from 'react';
import { cn } from '@/lib/utils';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle } from 'lucide-react';

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
    contactInfo = {},
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

  const hasContactSidebar = (showPhone && contactInfo?.phone) || (showAddress && contactInfo?.address) || contactInfo?.email || contactInfo?.schedule;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isEditing) return;
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
        {/* Header — full width */}
        {(title || subtitle) && (
          <div className="text-center mb-10">
            {title && (
              <h2 className="text-3xl font-bold mb-3" style={{ color: textColor }}>
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">{subtitle}</p>
            )}
          </div>
        )}

        <div className={cn(
          'grid gap-10',
          hasContactSidebar ? 'lg:grid-cols-5' : 'lg:grid-cols-1 max-w-2xl mx-auto'
        )}>
          {/* Form */}
          <div className={hasContactSidebar ? 'lg:col-span-3' : ''}>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100">
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
                    <div className="grid sm:grid-cols-2 gap-4">
                      {fields.filter(f => f.key === 'firstName' || f.key === 'lastName').map((field) => (
                        <div key={field.key}>
                          <label htmlFor={field.key} className="block text-sm font-medium text-gray-700 mb-1">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          <input
                            id={field.key}
                            type={field.type}
                            placeholder={field.label}
                            required={field.required}
                            disabled={isEditing}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                          />
                        </div>
                      ))}
                    </div>

                    {fields.filter(f => f.key !== 'firstName' && f.key !== 'lastName').map((field) => (
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
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed resize-none"
                          />
                        ) : field.type === 'select' ? (
                          <select
                            id={field.key}
                            required={field.required}
                            disabled={isEditing}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                          >
                            <option value="">-- Selectati --</option>
                            {field.options?.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            id={field.key}
                            type={field.type}
                            placeholder={field.label}
                            required={field.required}
                            disabled={isEditing}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                          />
                        )}
                      </div>
                    ))}

                    <button
                      type="submit"
                      disabled={isEditing}
                      className="w-full inline-flex items-center justify-center px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {submitText}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* Contact Info Sidebar */}
          {hasContactSidebar && (
            <div className="lg:col-span-2 space-y-6">
              <h3 className="text-xl font-semibold text-gray-900">Informatii de contact</h3>

              {showPhone && contactInfo?.phone && (
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Phone className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Telefon</p>
                    <p className="text-gray-900 font-medium">{contactInfo.phone}</p>
                  </div>
                </div>
              )}

              {contactInfo?.email && (
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <p className="text-gray-900 font-medium">{contactInfo.email}</p>
                  </div>
                </div>
              )}

              {showAddress && contactInfo?.address && (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Adresa</p>
                    <p className="text-gray-900">{contactInfo.address}</p>
                  </div>
                </div>
              )}

              {contactInfo?.schedule && (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Program</p>
                    <p className="text-gray-900 whitespace-pre-line">{contactInfo.schedule}</p>
                  </div>
                </div>
              )}
            </div>
          )}
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
  contactInfo: {},
};

export default ContactFormBlock;
