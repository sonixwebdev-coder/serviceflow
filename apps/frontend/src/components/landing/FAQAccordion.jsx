import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export function FAQItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left group"
      >
        <span className="text-base font-medium text-gray-900 pr-4 group-hover:text-primary transition-colors">
          {question}
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-gray-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-96 pb-5' : 'max-h-0'}`}
      >
        <p className="text-sm leading-relaxed text-gray-600">{answer}</p>
      </div>
    </div>
  );
}

export default function FAQAccordion({ items }) {
  return (
    <div>
      {items.map((item) => (
        <FAQItem key={item.q} question={item.q} answer={item.a} />
      ))}
    </div>
  );
}
