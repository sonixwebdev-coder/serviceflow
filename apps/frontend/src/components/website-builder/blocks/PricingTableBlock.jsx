import { cn } from '@/lib/utils';
import { Check, X as XIcon, Star, CreditCard } from 'lucide-react';

const PricingTableBlock = ({ data, settings, isEditing = false, onClick }) => {
  const {
    title = 'Pachete de preturi',
    subtitle = '',
    plans = [],
    showCta = true,
    ctaText = 'Programeaza',
  } = data || {};

  const {
    backgroundColor = '#ffffff',
    textColor = '#1f2937',
    padding = { top: 60, bottom: 60 },
    maxWidth = 'xl',
  } = settings || {};

  const maxWidthClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-3xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-full',
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
        {(title || subtitle) && (
          <div className="text-center mb-12">
            {title && (
              <h2 className="text-3xl font-bold mb-4" style={{ color: textColor }}>
                {title}
              </h2>
            )}
            {subtitle && <p className="text-lg text-gray-600 max-w-2xl mx-auto">{subtitle}</p>}
          </div>
        )}

        {plans.length > 0 ? (
          <div
            className={cn(
              'grid gap-8 items-start',
              plans.length === 1 && 'max-w-md mx-auto',
              plans.length === 2 && 'max-w-3xl mx-auto md:grid-cols-2',
              plans.length >= 3 && 'md:grid-cols-2 lg:grid-cols-3'
            )}
          >
            {plans.map((plan, index) => (
              <div
                key={index}
                className={cn(
                  'rounded-2xl border-2 p-8 relative',
                  plan.featured ? 'shadow-xl border-blue-500' : 'bg-white border-gray-200'
                )}
              >
                {plan.featured && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-4 py-1 rounded-full bg-blue-600 text-white text-sm font-medium">
                    <Star className="h-3.5 w-3.5 fill-white" />
                    Popular
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  {plan.description && <p className="text-gray-500 text-sm">{plan.description}</p>}
                </div>

                <div className="text-center mb-8">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    {plan.currency && (
                      <span className="text-gray-500 font-medium">{plan.currency}</span>
                    )}
                  </div>
                  {plan.period && <span className="text-gray-400 text-sm">/ {plan.period}</span>}
                </div>

                {plan.features && plan.features.length > 0 && (
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, i) => {
                      const isIncluded = typeof feature === 'string' || feature.included !== false;
                      const text = typeof feature === 'string' ? feature : feature.text;
                      return (
                        <li key={i} className="flex items-start gap-3">
                          {isIncluded ? (
                            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-blue-50">
                              <Check className="h-3 w-3 text-blue-600" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-gray-100">
                              <XIcon className="h-3 w-3 text-gray-400" />
                            </div>
                          )}
                          <span
                            className={cn(
                              'text-sm',
                              isIncluded ? 'text-gray-700' : 'text-gray-400'
                            )}
                          >
                            {text}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {showCta && (
                  <div
                    className={cn(
                      'block w-full text-center py-3 px-4 rounded-lg font-medium',
                      plan.featured
                        ? 'bg-blue-600 text-white'
                        : 'border-2 border-blue-600 text-blue-600'
                    )}
                  >
                    {plan.ctaText || ctaText}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <CreditCard className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p>Adaugati pachete de preturi din setari</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const pricingTableBlockDefaults = {
  title: 'Pachete de preturi',
  subtitle: 'Alege pachetul potrivit pentru tine',
  plans: [],
  showCta: true,
  ctaText: 'Programeaza',
};

export default PricingTableBlock;
