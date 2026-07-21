import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, HelpCircle } from 'lucide-react';

const FaqBlock = ({ data, settings, isEditing = false, onClick }) => {
  const {
    title = 'Intrebari frecvente',
    subtitle = '',
    items = [],
    allowMultiple = false,
  } = data || {};

  const {
    backgroundColor = '#ffffff',
    textColor = '#1f2937',
    padding = { top: 60, bottom: 60 },
    maxWidth = 'lg',
  } = settings || {};

  const maxWidthClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-3xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-full',
  };

  const [openItems, setOpenItems] = useState([]);

  const toggleItem = (index) => {
    if (isEditing) return;
    setOpenItems((prev) => {
      if (prev.includes(index)) return prev.filter((i) => i !== index);
      return allowMultiple ? [...prev, index] : [index];
    });
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
          <div className="text-center mb-10">
            {title && (
              <h2 className="text-3xl font-bold mb-4" style={{ color: textColor }}>
                {title}
              </h2>
            )}
            {subtitle && <p className="text-lg text-gray-600 max-w-2xl mx-auto">{subtitle}</p>}
          </div>
        )}

        {items.length > 0 ? (
          <div className="max-w-3xl mx-auto space-y-3">
            {items.map((item, index) => {
              const isOpen = openItems.includes(index);
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleItem(index);
                    }}
                    className="w-full flex items-center justify-between px-6 py-5 text-left"
                    disabled={isEditing}
                  >
                    <span className="font-semibold text-gray-900 pr-4">{item.question}</span>
                    <ChevronDown
                      className={cn(
                        'h-5 w-5 shrink-0 transition-transform duration-200',
                        isOpen ? 'rotate-180 text-blue-500' : 'text-gray-400'
                      )}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-gray-600 leading-relaxed">{item.answer}</div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <HelpCircle className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p>Adaugati intrebari din setari</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const faqBlockDefaults = {
  title: 'Intrebari frecvente',
  subtitle: 'Raspunsuri la cele mai frecvente intrebari',
  items: [],
  allowMultiple: false,
};

export default FaqBlock;
