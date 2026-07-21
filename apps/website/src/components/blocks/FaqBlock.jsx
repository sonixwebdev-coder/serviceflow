import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FaqBlock({ data, branding }) {
  const { title, subtitle, items = [], allowMultiple = false } = data;

  const primaryColor = branding?.primaryColor || '#2563eb';
  const [openItems, setOpenItems] = useState([]);

  const toggleItem = (index) => {
    setOpenItems((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index);
      }
      return allowMultiple ? [...prev, index] : [index];
    });
  };

  return (
    <div>
      {(title || subtitle) && (
        <div className="text-center mb-10">
          {title && <h2 className="text-3xl font-bold text-gray-900 mb-3">{title}</h2>}
          {subtitle && <p className="text-lg text-gray-600">{subtitle}</p>}
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-center text-gray-500">Nu exista intrebari frecvente.</p>
      ) : (
        <div className="max-w-3xl mx-auto space-y-3">
          {items.map((item, index) => {
            const isOpen = openItems.includes(index);
            return (
              <div
                key={index}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-shadow hover:shadow-xs"
              >
                <button
                  onClick={() => toggleItem(index)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left"
                >
                  <span className="font-semibold text-gray-900 pr-4">{item.question}</span>
                  <ChevronDown
                    className={cn(
                      'h-5 w-5 shrink-0 transition-transform duration-200',
                      isOpen ? 'rotate-180' : ''
                    )}
                    style={{ color: isOpen ? primaryColor : '#9ca3af' }}
                  />
                </button>
                <div
                  className={cn(
                    'grid transition-all duration-200 ease-in-out',
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="px-6 pb-5 text-gray-600 leading-relaxed">{item.answer}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
