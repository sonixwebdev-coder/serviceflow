import { Link } from 'react-router-dom';
import { Calendar, Clock, ArrowRight, ListChecks } from 'lucide-react';

export default function BookingWidgetBlock({ data, subdomain, branding }) {
  const { title, subtitle, buttonText = 'Programeaza acum' } = data;

  const primaryColor = branding?.primaryColor || '#2563eb';

  const steps = [
    { icon: ListChecks, label: 'Alege serviciul', step: 1 },
    { icon: Calendar, label: 'Selecteaza data', step: 2 },
    { icon: Clock, label: 'Alege ora', step: 3 },
  ];

  return (
    <div
      className="rounded-2xl p-8 md:p-12"
      style={{
        background: `linear-gradient(135deg, ${primaryColor}08, ${primaryColor}15)`,
      }}
    >
      <div className="max-w-2xl mx-auto text-center">
        <div className="flex justify-center mb-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${primaryColor}20` }}
          >
            <Calendar className="h-8 w-8" style={{ color: primaryColor }} />
          </div>
        </div>

        {title && <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">{title}</h2>}
        {subtitle && <p className="text-gray-600 mb-10">{subtitle}</p>}

        <div className="flex flex-col sm:flex-row justify-center items-center gap-6 sm:gap-8 mb-10">
          {steps.map(({ icon: Icon, label, step }, index) => (
            <div key={step} className="flex items-center gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: primaryColor }}
                >
                  {step}
                </div>
                <div className="flex items-center gap-2 text-gray-700 font-medium">
                  <Icon className="h-5 w-5 text-gray-400" />
                  <span>{label}</span>
                </div>
              </div>
              {index < steps.length - 1 && (
                <ArrowRight className="h-4 w-4 text-gray-300 hidden sm:block ml-2" />
              )}
            </div>
          ))}
        </div>

        <Link
          to={`/${subdomain}/booking`}
          className="inline-flex items-center gap-2 px-10 py-4 rounded-lg text-white font-semibold text-lg transition-all hover:opacity-90 hover:shadow-xl shadow-lg"
          style={{ backgroundColor: primaryColor }}
        >
          {buttonText}
          <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
}
