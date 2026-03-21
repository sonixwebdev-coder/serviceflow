import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Send, Phone, MapPin, Mail, Clock, CheckCircle } from 'lucide-react';
import { websiteService } from '@/services/websiteService';

export default function ContactFormBlock({ data, subdomain, branding }) {
  const {
    title,
    subtitle,
    fields = [
      { key: 'firstName', label: 'Prenume', type: 'text', required: true },
      { key: 'lastName', label: 'Nume', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'email', required: true },
      { key: 'phone', label: 'Telefon', type: 'tel', required: false },
      { key: 'message', label: 'Mesaj', type: 'textarea', required: true },
    ],
    submitText = 'Trimite mesajul',
    showPhone = false,
    showAddress = false,
    contactInfo = {},
  } = data;

  const primaryColor = branding?.primaryColor || '#2563eb';
  const [formData, setFormData] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const hasContactInfo = (showPhone && contactInfo.phone) || (showAddress && contactInfo.address) || contactInfo.email || contactInfo.schedule;

  const mutation = useMutation({
    mutationFn: (data) => websiteService.submitLead(subdomain, data),
    onSuccess: () => {
      setSubmitted(true);
      setFormData({});
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const inputFocusStyle = (e) => {
    e.target.style.boxShadow = `0 0 0 2px ${primaryColor}40`;
    e.target.style.borderColor = primaryColor;
  };
  const inputBlurStyle = (e) => {
    e.target.style.boxShadow = '';
    e.target.style.borderColor = '';
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: `${primaryColor}15` }}
        >
          <CheckCircle className="h-8 w-8" style={{ color: primaryColor }} />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Mesaj trimis!</h3>
        <p className="text-gray-600 mb-6">Va multumim pentru mesaj. Va vom contacta in cel mai scurt timp.</p>
        <button
          onClick={() => setSubmitted(false)}
          className="font-medium hover:underline"
          style={{ color: primaryColor }}
        >
          Trimite alt mesaj
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header — full width above columns */}
      {(title || subtitle) && (
        <div className="text-center mb-10">
          {title && <h2 className="text-3xl font-bold text-gray-900 mb-3">{title}</h2>}
          {subtitle && <p className="text-lg text-gray-600 max-w-2xl mx-auto">{subtitle}</p>}
        </div>
      )}

      <div className={`grid gap-10 ${hasContactInfo ? 'lg:grid-cols-5' : 'lg:grid-cols-1 max-w-2xl mx-auto'}`}>
        {/* Form — takes more space */}
        <div className={hasContactInfo ? 'lg:col-span-3' : ''}>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Trimite-ne un mesaj</h3>
              <p className="text-sm text-gray-500 mt-1">Completeaza formularul si te vom contacta in cel mai scurt timp.</p>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                {fields.filter(f => f.key === 'firstName' || f.key === 'lastName').map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {field.label} {field.required && <span style={{ color: primaryColor }}>*</span>}
                    </label>
                    <input
                      type={field.type}
                      required={field.required}
                      value={formData[field.key] || ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none transition-shadow"
                      onFocus={inputFocusStyle}
                      onBlur={inputBlurStyle}
                    />
                  </div>
                ))}
              </div>

              {fields.filter(f => f.key !== 'firstName' && f.key !== 'lastName').map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {field.label} {field.required && <span style={{ color: primaryColor }}>*</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      required={field.required}
                      value={formData[field.key] || ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none transition-shadow resize-none"
                      onFocus={inputFocusStyle}
                      onBlur={inputBlurStyle}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      required={field.required}
                      value={formData[field.key] || ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none transition-shadow"
                      onFocus={inputFocusStyle}
                      onBlur={inputBlurStyle}
                    >
                      <option value="">Selecteaza...</option>
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      required={field.required}
                      value={formData[field.key] || ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none transition-shadow"
                      onFocus={inputFocusStyle}
                      onBlur={inputBlurStyle}
                    />
                  )}
                </div>
              ))}

              {mutation.isError && (
                <p className="text-red-600 text-sm">
                  {mutation.error?.message || 'A aparut o eroare. Va rugam incercati din nou.'}
                </p>
              )}

              <button
                type="submit"
                disabled={mutation.isPending}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-semibold transition-all hover:opacity-90 hover:shadow-lg disabled:opacity-50"
                style={{ backgroundColor: primaryColor }}
              >
                {mutation.isPending ? (
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    {submitText}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Contact Info Sidebar */}
        {hasContactInfo && (
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">Informatii de contact</h3>

            {showPhone && contactInfo.phone && (
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <Phone className="h-5 w-5" style={{ color: primaryColor }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Telefon</p>
                  <a href={`tel:${contactInfo.phone}`} className="text-gray-900 font-medium hover:underline">
                    {contactInfo.phone}
                  </a>
                </div>
              </div>
            )}

            {contactInfo.email && (
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <Mail className="h-5 w-5" style={{ color: primaryColor }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <a href={`mailto:${contactInfo.email}`} className="text-gray-900 font-medium hover:underline">
                    {contactInfo.email}
                  </a>
                </div>
              </div>
            )}

            {showAddress && contactInfo.address && (
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <MapPin className="h-5 w-5" style={{ color: primaryColor }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Adresa</p>
                  <p className="text-gray-900">{contactInfo.address}</p>
                </div>
              </div>
            )}

            {contactInfo.schedule && (
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <Clock className="h-5 w-5" style={{ color: primaryColor }} />
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
  );
}
