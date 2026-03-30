import { useState, useEffect, useRef } from 'react';
import {
  Lightbulb,
  X,
  Layout,
  Image,
  Palette,
  Smartphone,
  MousePointerClick,
  AlignLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const GENERAL_TIPS = [
  { icon: Layout, title: 'Structura paginii', description: 'Incepe cu un bloc Hero, urmat de servicii, testimoniale si contact. Aceasta ordine ghideaza natural vizitatorii.' },
  { icon: Image, title: 'Imagini de calitate', description: 'Foloseste imagini clare, bine luminate, de min 1200px latime. Comprima-le inainte de upload (tinypng.com).' },
  { icon: Palette, title: 'Branding consistent', description: 'Foloseste aceleasi culori si fonturi pe tot site-ul. Seteaza-le din Setari branding pentru uniformitate.' },
  { icon: Smartphone, title: 'Mobile-friendly', description: 'Previzualizeaza site-ul pe mobil. Toate blocurile se adapteaza automat, dar verifica textul si imaginile.' },
  { icon: MousePointerClick, title: 'Call-to-action clar', description: 'Fiecare pagina trebuie sa aiba un singur obiectiv clar: programare, contact, sau informare.' },
  { icon: AlignLeft, title: 'Continut concis', description: 'Scrie texte scurte si la obiect. Vizitatorii scaneaza rapid - pune informatia importanta prima.' },
];

const BLOCK_TIPS = {
  hero: [
    'Foloseste o imagine de fundal de calitate inalta (min 1920x800px).',
    'Pastreaza titlul scurt - max 8-10 cuvinte.',
    'Adauga un buton CTA vizibil ("Programeaza acum").',
  ],
  text: [
    'Scrie paragrafe scurte - max 3-4 randuri.',
    'Alterna cu imagini sau spatii libere.',
  ],
  image: [
    'Imagini optimizate pentru web (JPEG/WebP, sub 500KB).',
    'Completeaza textul ALT pentru SEO.',
  ],
  'services-grid': [
    'Activeaza sincronizarea automata cu CRM-ul.',
    'Afiseaza preturile si durata pentru transparenta.',
    'Butonul de programare creste conversiile.',
  ],
  'team-grid': [
    'Poze profesionale ale echipei creeaza incredere.',
    'Activeaza sincronizarea automata cu CRM-ul.',
  ],
  'contact-form': [
    'Mesajele ajung automat in sectiunea Leads.',
    'Pastreaza formularul simplu - doar campuri esentiale.',
  ],
  'booking-widget': [
    'Se sincronizeaza automat cu calendarul CRM.',
    'Modul compact este ideal cand nu e blocul principal.',
  ],
  testimonials: [
    'Adauga minim 3 testimoniale.',
    'Layout carusel pentru 4+ testimoniale.',
  ],
  faq: [
    'Raspunde la cele mai frecvente 5-8 intrebari.',
    'Ordoneaza de la cele mai importante.',
  ],
  gallery: [
    'Imagini de aceeasi dimensiune pentru grid uniform.',
    'Activeaza lightbox-ul pentru vizualizare completa.',
  ],
  'pricing-table': [
    'Evidentiaza pachetul cel mai popular.',
    'Maxim 3-4 pachete pentru a nu ingreuneaza decizia.',
  ],
};

export default function FloatingHelperWidget({ selectedBlockType }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const panelRef = useRef(null);

  const handleOpen = () => {
    setIsOpen(true);
    requestAnimationFrame(() => setIsAnimating(true));
  };

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => setIsOpen(false), 200);
  };

  // Close on escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) handleClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        handleClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const blockTips = selectedBlockType ? BLOCK_TIPS[selectedBlockType] : null;

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed z-40 bottom-24 right-6 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg transition-all hover:bg-amber-600 hover:shadow-xl hover:scale-105 focus:outline-none"
          title="Sfaturi website builder"
        >
          <Lightbulb className="h-5 w-5" />
        </button>
      )}

      {/* Helper Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className={cn(
            'fixed z-40 bottom-24 right-6 w-[340px] max-h-[70vh] flex flex-col rounded-2xl bg-white shadow-2xl shadow-gray-900/20 ring-1 ring-gray-900/5 transition-all duration-200',
            isAnimating
              ? 'translate-y-0 opacity-100 scale-100'
              : 'translate-y-4 opacity-0 scale-95'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                <Lightbulb className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-gray-900">Sfaturi</h3>
                <p className="text-[11px] text-gray-500">Website Builder</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Block-specific tips */}
            {blockTips && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                  Sfaturi pentru blocul selectat
                </h4>
                <ul className="space-y-1.5">
                  {blockTips.map((tip, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-600 leading-relaxed">
                      <ChevronRight className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {blockTips && <hr className="border-gray-100" />}

            {/* General tips */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Sfaturi generale
              </h4>
              {GENERAL_TIPS.map((tip, i) => (
                <div key={i} className="flex gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 shrink-0">
                    <tip.icon className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800">{tip.title}</p>
                    <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{tip.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
