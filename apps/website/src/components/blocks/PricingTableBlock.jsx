import { Check, X as XIcon, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function PricingTableBlock({ data, subdomain, branding }) {
  const {
    title,
    subtitle,
    plans = [],
    showCta = true,
    ctaText = 'Programeaza',
  } = data;

  const primaryColor = branding?.primaryColor || '#2563eb';

  return (
    <div>
      {(title || subtitle) && (
        <div className="text-center mb-12">
          {title && <h2 className="text-3xl font-bold text-gray-900 mb-3">{title}</h2>}
          {subtitle && <p className="text-lg text-gray-600">{subtitle}</p>}
        </div>
      )}

      {plans.length === 0 ? (
        <p className="text-center text-gray-500">Nu exista pachete de preturi.</p>
      ) : (
        <div className={cn(
          'grid gap-8 items-start',
          plans.length === 1 && 'max-w-md mx-auto',
          plans.length === 2 && 'max-w-3xl mx-auto md:grid-cols-2',
          plans.length >= 3 && 'md:grid-cols-2 lg:grid-cols-3',
        )}>
          {plans.map((plan, index) => (
            <div
              key={index}
              className={cn(
                'rounded-2xl border-2 p-8 relative transition-shadow hover:shadow-lg',
                plan.featured ? 'shadow-xl' : 'bg-white'
              )}
              style={{
                borderColor: plan.featured ? primaryColor : '#e5e7eb',
              }}
            >
              {plan.featured && (
                <div
                  className="absolute -top-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-4 py-1 rounded-full text-white text-sm font-medium"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Star className="h-3.5 w-3.5 fill-white" />
                  Popular
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                {plan.description && (
                  <p className="text-gray-500 text-sm">{plan.description}</p>
                )}
              </div>

              <div className="text-center mb-8">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  {plan.currency && (
                    <span className="text-gray-500 font-medium">{plan.currency}</span>
                  )}
                </div>
                {plan.period && (
                  <span className="text-gray-400 text-sm">/ {plan.period}</span>
                )}
              </div>

              {plan.features && plan.features.length > 0 && (
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => {
                    const isIncluded = feature.included !== false;
                    return (
                      <li key={i} className="flex items-start gap-3">
                        {isIncluded ? (
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ backgroundColor: `${primaryColor}15` }}
                          >
                            <Check className="h-3 w-3" style={{ color: primaryColor }} />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-gray-100">
                            <XIcon className="h-3 w-3 text-gray-400" />
                          </div>
                        )}
                        <span className={cn('text-sm', isIncluded ? 'text-gray-700' : 'text-gray-400')}>
                          {feature.text || feature}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}

              {showCta && (
                <Link
                  to={plan.ctaLink || `/${subdomain}/booking`}
                  className={cn(
                    'block w-full text-center py-3 px-4 rounded-lg font-medium transition-all',
                    plan.featured
                      ? 'text-white hover:opacity-90 shadow-md'
                      : 'border-2 hover:shadow-md'
                  )}
                  style={
                    plan.featured
                      ? { backgroundColor: primaryColor }
                      : { borderColor: primaryColor, color: primaryColor }
                  }
                >
                  {plan.ctaText || ctaText}
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
