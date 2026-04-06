import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { X, ChevronDown, Plus, Trash2, ChevronUp, Star, Info, Copy, Check, Upload, Loader2 } from 'lucide-react';
import { blockTypes } from './blocks';
import { uploadWebsiteImage } from '@/services/websiteService';

function ImageUploadField({ value, onChange, label, placeholder = 'https://...' }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const handleFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Imaginea nu poate depasi 5MB');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadWebsiteImage(file);
      onChange(url);
    } catch {
      alert('Eroare la incarcarea imaginii');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [onChange]);

  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <div className="flex gap-2">
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="shrink-0 flex items-center gap-1 px-3 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50 transition-colors"
          title="Incarca imagine"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleFile} className="hidden" />
      {value && (
        <img src={value} alt="" className="mt-2 h-16 w-auto rounded border object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
      )}
    </div>
  );
}

// User-friendly tips for each block type
const BLOCK_HELPERS = {
  hero: {
    tips: [
      'Foloseste o imagine de fundal de calitate inalta (min 1920x800px) pentru un impact vizual puternic.',
      'Pastreaza titlul scurt si clar - max 8-10 cuvinte.',
      'Adauga un buton de actiune (CTA) vizibil, de ex. "Programeaza acum" sau "Afla mai multe".',
      'Ajusteaza opacitatea overlay-ului pentru a asigura lizibilitatea textului pe imagine.',
    ],
  },
  text: {
    tips: [
      'Scrie paragrafe scurte - max 3-4 randuri per paragraf pentru o citire usoara.',
      'Foloseste formatul "Titlu" pentru sectiuni importante si "Citat" pentru evidentierea unor idei.',
      'Evita blocurile mari de text - alterna cu imagini sau spatii libere.',
    ],
  },
  image: {
    tips: [
      'Foloseste imagini optimizate pentru web (JPEG/WebP, sub 500KB).',
      'Completeaza intotdeauna textul alternativ (ALT) - ajuta la SEO si accesibilitate.',
      'Alege un aspect ratio consistent pe tot site-ul pentru un aspect profesional.',
    ],
  },
  button: {
    tips: [
      'Foloseste un text clar si orientat spre actiune: "Programeaza", "Contacteaza-ne", "Vezi oferta".',
      'Limiteaza numarul de butoane pe pagina - prea multe optiuni pot deruta vizitatorii.',
      'Stilul "Principal" atrage cel mai mult atentia - foloseste-l pentru actiunea principala.',
    ],
  },
  'services-grid': {
    tips: [
      'Activeaza sincronizarea automata pentru a prelua serviciile direct din CRM.',
      'Afiseaza preturile si durata pentru transparenta - clientii prefera sa stie de la inceput.',
      'Foloseste 2-3 coloane pentru o vizualizare optima pe toate dispozitivele.',
      'Butonul de programare directa creste rata de conversie.',
    ],
  },
  'team-grid': {
    tips: [
      'Activeaza sincronizarea automata pentru a prelua echipa direct din CRM.',
      'Adauga poze profesionale ale echipei - creeaza incredere.',
      'Include un scurt subtitlu care prezinta valorile echipei.',
    ],
  },
  'locations-map': {
    tips: [
      'Activeaza sincronizarea automata pentru locatii actualizate in timp real.',
      'Verifica ca adresele din CRM sunt complete pentru afisarea corecta pe harta.',
      'Adauga un titlu descriptiv, de ex. "Unde ne gasesti" sau "Locatiile noastre".',
    ],
  },
  'contact-form': {
    tips: [
      'Mesajele trimise prin formular apar automat in sectiunea Leads din CRM.',
      'Personalizeaza mesajul de succes pentru a confirma vizitatorului ca a fost primit.',
      'Pastreaza formularul simplu - doar campurile esentiale (nume, email, mesaj).',
      'Adauga un subtitlu prietenos, de ex. "Raspundem in max 24 de ore".',
    ],
    advanced: {
      endpoints: [
        { label: 'Trimitere formular', method: 'POST', path: '/api/portal/website/{subdomain}/lead' },
      ],
    },
  },
  'booking-widget': {
    tips: [
      'Widget-ul se sincronizeaza automat cu calendarul si disponibilitatea din CRM.',
      'Activeaza selectia de servicii pentru ca vizitatorii sa aleaga ce doresc.',
      'Modul compact este ideal cand widget-ul nu este blocul principal al paginii.',
      'Vizitatorii primesc confirmare automata prin email dupa programare.',
    ],
    advanced: {
      endpoints: [
        { label: 'Info organizatie', method: 'GET', path: '/api/portal/public/{slug}' },
        { label: 'Date disponibile', method: 'GET', path: '/api/portal/public/{slug}/dates' },
        { label: 'Sloturi disponibile', method: 'GET', path: '/api/portal/public/{slug}/slots?date={date}' },
        { label: 'Creare programare', method: 'POST', path: '/api/portal/public/{slug}/book' },
      ],
    },
  },
  testimonials: {
    tips: [
      'Adauga minim 3 testimoniale pentru credibilitate.',
      'Include numele complet si rolul persoanei (ex: "Client fidel din 2020").',
      'Layout-ul carusel functioneaza cel mai bine pentru 4+ testimoniale.',
      'Avatarele personalizate cresc increderea - solicita poze de la clienti.',
    ],
  },
  faq: {
    tips: [
      'Raspunde la cele mai frecvente 5-8 intrebari ale clientilor tai.',
      'Foloseste intrebari din perspectiva clientului: "Cat dureaza o sedinta?" nu "Durata sedintei".',
      'Ordoneaza de la cele mai importante la cele mai putin frecvente.',
    ],
  },
  gallery: {
    tips: [
      'Foloseste imagini de aceeasi dimensiune pentru un grid uniform.',
      'Activeaza lightbox-ul pentru ca vizitatorii sa poata vedea imaginile la dimensiune completa.',
      'Layout-ul masonry este ideal pentru imagini cu dimensiuni diferite.',
    ],
  },
  stats: {
    tips: [
      'Foloseste numere rotunde si impresionante: "500+" clienti, "10+" ani experienta.',
      'Limiteaza la 3-4 statistici pentru a nu supraincarca vizitatorii.',
      'Adauga descrieri scurte sub fiecare numar pentru context.',
    ],
  },
  video: {
    tips: [
      'Foloseste link-uri YouTube sau Vimeo - sunt suportate nativ.',
      'Un thumbnail personalizat atrage mai multe click-uri decat cel implicit.',
      'Evita autoplay-ul - poate deranja vizitatorii, mai ales pe mobil.',
    ],
  },
  'pricing-table': {
    tips: [
      'Evidentiaza (featured) pachetul cel mai popular pentru a ghida alegerea.',
      'Listeaza 3-4 pachete maxim - prea multe optiuni ingreuneaza decizia.',
      'Include un buton de actiune clar pe fiecare pachet.',
      'Foloseste RON ca moneda si "luna" ca perioada pentru clienti romani.',
    ],
  },
  spacer: {
    tips: [
      'Foloseste spacer-e pentru a separa vizual sectiunile importante.',
      'O inaltime de 40-80px este suficienta pentru majoritatea cazurilor.',
    ],
  },
  divider: {
    tips: [
      'Stilul "Linie" este cel mai comun - foloseste "Puncte" pentru un aspect mai creativ.',
      'Stilul "Spatiu" adauga doar spatiu gol, fara element vizibil.',
    ],
  },
};

// Readonly endpoint display component
const EndpointField = ({ endpoint }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(endpoint.path);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">{endpoint.method}</span>
      <code className="flex-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded truncate" title={endpoint.path}>
        {endpoint.path}
      </code>
      <button type="button" onClick={handleCopy} className="shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded" title="Copiaza">
        {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
};

// Custom Accordion Component
const Accordion = ({ children, defaultOpen = [] }) => {
  const [openItems, setOpenItems] = useState(defaultOpen);

  const toggleItem = (value) => {
    setOpenItems((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  };

  return (
    <div className="space-y-2">
      {Array.isArray(children)
        ? children.map((child) =>
            child
              ? {
                  ...child,
                  props: {
                    ...child.props,
                    isOpen: openItems.includes(child.props.value),
                    onToggle: () => toggleItem(child.props.value),
                  },
                }
              : null
          )
        : children}
    </div>
  );
};

const AccordionItem = ({ children, value, isOpen, onToggle }) => {
  const trigger = Array.isArray(children)
    ? children.find((c) => c?.type === AccordionTrigger)
    : null;
  const content = Array.isArray(children)
    ? children.find((c) => c?.type === AccordionContent)
    : null;

  return (
    <div className="border rounded-lg">
      {trigger && { ...trigger, props: { ...trigger.props, isOpen, onToggle } }}
      {content && isOpen && content}
    </div>
  );
};

const AccordionTrigger = ({ children, isOpen, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className="flex items-center justify-between w-full px-4 py-3 text-left font-medium hover:bg-gray-50 transition-colors"
  >
    {children}
    <ChevronDown
      className={cn(
        'h-4 w-4 text-gray-500 transition-transform',
        isOpen && 'transform rotate-180'
      )}
    />
  </button>
);

const AccordionContent = ({ children, className }) => (
  <div className={cn('px-4 pb-4', className)}>{children}</div>
);

// Custom Slider Component
const Slider = ({ value = [0], onValueChange, min = 0, max = 100, step = 1 }) => {
  const handleChange = (e) => {
    onValueChange([parseFloat(e.target.value)]);
  };

  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value[0]}
      onChange={handleChange}
      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
    />
  );
};

// Custom Switch Component
const Switch = ({ checked, onCheckedChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onCheckedChange(!checked)}
    className={cn(
      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
      checked ? 'bg-blue-600' : 'bg-gray-200'
    )}
  >
    <span
      className={cn(
        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
        checked ? 'translate-x-6' : 'translate-x-1'
      )}
    />
  </button>
);

const BlockSettings = ({ block, onUpdate, onClose }) => {
  if (!block) return null;

  const blockConfig = blockTypes[block.type];

  const updateData = (key, value) => {
    onUpdate({
      ...block,
      data: { ...block.data, [key]: value },
    });
  };

  const updateSettings = (key, value) => {
    onUpdate({
      ...block,
      settings: { ...block.settings, [key]: value },
    });
  };

  const updatePadding = (side, value) => {
    onUpdate({
      ...block,
      settings: {
        ...block.settings,
        padding: {
          ...block.settings?.padding,
          [side]: value,
        },
      },
    });
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">{blockConfig?.name || block.type}</h3>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <Accordion defaultOpen={['content', 'style']}>
          {/* Content Settings */}
          <AccordionItem value="content">
            <AccordionTrigger>Continut</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              {/* Block-specific content settings */}
              {block.type === 'hero' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Titlu</label>
                    <input
                      type="text"
                      value={block.data?.title || ''}
                      onChange={(e) => updateData('title', e.target.value)}
                      placeholder="Titlu principal"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subtitlu</label>
                    <textarea
                      value={block.data?.subtitle || ''}
                      onChange={(e) => updateData('subtitle', e.target.value)}
                      placeholder="Descriere scurta"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <ImageUploadField
                    label="Imagine de fundal"
                    value={block.data?.backgroundImage || ''}
                    onChange={(url) => updateData('backgroundImage', url)}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Opacitate overlay ({Math.round((block.data?.backgroundOverlay || 0.4) * 100)}%)
                    </label>
                    <Slider
                      value={[block.data?.backgroundOverlay || 0.4]}
                      onValueChange={([v]) => updateData('backgroundOverlay', v)}
                      min={0}
                      max={1}
                      step={0.1}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Text buton principal</label>
                    <input
                      type="text"
                      value={block.data?.ctaText || ''}
                      onChange={(e) => updateData('ctaText', e.target.value)}
                      placeholder="Programeaza"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Link buton principal</label>
                    <input
                      type="text"
                      value={block.data?.ctaLink || ''}
                      onChange={(e) => updateData('ctaLink', e.target.value)}
                      placeholder="/booking"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Text buton secundar</label>
                    <input
                      type="text"
                      value={block.data?.secondaryCtaText || ''}
                      onChange={(e) => updateData('secondaryCtaText', e.target.value)}
                      placeholder="Afla mai multe"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Link buton secundar</label>
                    <input
                      type="text"
                      value={block.data?.secondaryCtaLink || ''}
                      onChange={(e) => updateData('secondaryCtaLink', e.target.value)}
                      placeholder="/servicii"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Layout</label>
                    <select
                      value={block.data?.layout || 'centered'}
                      onChange={(e) => updateData('layout', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="centered">Centrat</option>
                      <option value="left">Stanga</option>
                      <option value="right">Dreapta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Inaltime</label>
                    <select
                      value={block.data?.height || 'medium'}
                      onChange={(e) => updateData('height', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="small">Mica</option>
                      <option value="medium">Medie</option>
                      <option value="large">Mare</option>
                      <option value="full">Ecran complet</option>
                    </select>
                  </div>
                </>
              )}

              {block.type === 'text' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Continut</label>
                    <textarea
                      value={block.data?.content || ''}
                      onChange={(e) => updateData('content', e.target.value)}
                      placeholder="Textul dvs..."
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                    <select
                      value={block.data?.format || 'prose'}
                      onChange={(e) => updateData('format', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="prose">Paragraf</option>
                      <option value="heading">Titlu</option>
                      <option value="quote">Citat</option>
                    </select>
                  </div>
                </>
              )}

              {block.type === 'image' && (
                <>
                  <ImageUploadField
                    label="Imagine"
                    value={block.data?.src || ''}
                    onChange={(url) => updateData('src', url)}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Text alternativ (ALT)</label>
                    <input
                      type="text"
                      value={block.data?.alt || ''}
                      onChange={(e) => updateData('alt', e.target.value)}
                      placeholder="Descriere imagine"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Legenda</label>
                    <input
                      type="text"
                      value={block.data?.caption || ''}
                      onChange={(e) => updateData('caption', e.target.value)}
                      placeholder="Legenda optionala"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Latime</label>
                    <select
                      value={block.data?.width || 'medium'}
                      onChange={(e) => updateData('width', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="small">Mica</option>
                      <option value="medium">Medie</option>
                      <option value="large">Mare</option>
                      <option value="full">Toata latimea</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Aspect ratio</label>
                    <select
                      value={block.data?.aspectRatio || 'auto'}
                      onChange={(e) => updateData('aspectRatio', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="auto">Auto</option>
                      <option value="1:1">1:1 (Patrat)</option>
                      <option value="4:3">4:3</option>
                      <option value="16:9">16:9 (Video)</option>
                      <option value="21:9">21:9 (Panoramic)</option>
                    </select>
                  </div>
                </>
              )}

              {block.type === 'button' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Text buton</label>
                    <input
                      type="text"
                      value={block.data?.text || ''}
                      onChange={(e) => updateData('text', e.target.value)}
                      placeholder="Click aici"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Link</label>
                    <input
                      type="text"
                      value={block.data?.link || ''}
                      onChange={(e) => updateData('link', e.target.value)}
                      placeholder="/pagina sau https://..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stil</label>
                    <select
                      value={block.data?.style || 'primary'}
                      onChange={(e) => updateData('style', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="primary">Principal</option>
                      <option value="secondary">Secundar</option>
                      <option value="outline">Contur</option>
                      <option value="ghost">Transparent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Marime</label>
                    <select
                      value={block.data?.size || 'md'}
                      onChange={(e) => updateData('size', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="sm">Mic</option>
                      <option value="md">Mediu</option>
                      <option value="lg">Mare</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Deschide in tab nou</label>
                    <Switch
                      checked={block.data?.openInNewTab || false}
                      onCheckedChange={(v) => updateData('openInNewTab', v)}
                    />
                  </div>
                </>
              )}

              {/* Services, Team, Locations blocks with auto-sync */}
              {['services-grid', 'team-grid', 'locations-map'].includes(block.type) && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Titlu</label>
                    <input
                      type="text"
                      value={block.data?.title || ''}
                      onChange={(e) => updateData('title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subtitlu</label>
                    <textarea
                      value={block.data?.subtitle || ''}
                      onChange={(e) => updateData('subtitle', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Sincronizare automata cu CRM</label>
                    <Switch
                      checked={block.data?.autoSync || false}
                      onCheckedChange={(v) => updateData('autoSync', v)}
                    />
                  </div>
                  {block.type === 'services-grid' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Coloane</label>
                        <select
                          value={String(block.data?.columns || 3)}
                          onChange={(e) => updateData('columns', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                          <option value="4">4</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">Afiseaza preturi</label>
                        <Switch
                          checked={block.data?.showPrices !== false}
                          onCheckedChange={(v) => updateData('showPrices', v)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">Afiseaza durata</label>
                        <Switch
                          checked={block.data?.showDuration !== false}
                          onCheckedChange={(v) => updateData('showDuration', v)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">Buton de programare</label>
                        <Switch
                          checked={block.data?.showBookButton !== false}
                          onCheckedChange={(v) => updateData('showBookButton', v)}
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              {block.type === 'contact-form' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Titlu</label>
                    <input
                      type="text"
                      value={block.data?.title || ''}
                      onChange={(e) => updateData('title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subtitlu</label>
                    <textarea
                      value={block.data?.subtitle || ''}
                      onChange={(e) => updateData('subtitle', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Text buton submit</label>
                    <input
                      type="text"
                      value={block.data?.submitText || ''}
                      onChange={(e) => updateData('submitText', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mesaj de succes</label>
                    <textarea
                      value={block.data?.successMessage || ''}
                      onChange={(e) => updateData('successMessage', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Afiseaza telefon</label>
                    <Switch
                      checked={block.data?.showPhone !== false}
                      onCheckedChange={(v) => updateData('showPhone', v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Afiseaza adresa</label>
                    <Switch
                      checked={block.data?.showAddress !== false}
                      onCheckedChange={(v) => updateData('showAddress', v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Afiseaza harta</label>
                    <Switch
                      checked={block.data?.showMap || false}
                      onCheckedChange={(v) => updateData('showMap', v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Afiseaza locatiile din CRM</label>
                    <Switch
                      checked={block.data?.showLocations || false}
                      onCheckedChange={(v) => updateData('showLocations', v)}
                    />
                  </div>

                  {/* Contact info values */}
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Informatii de contact</p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                        <input
                          type="tel"
                          value={block.data?.contactInfo?.phone || ''}
                          onChange={(e) => updateData('contactInfo', { ...block.data?.contactInfo, phone: e.target.value })}
                          placeholder="+40 700 000 000"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={block.data?.contactInfo?.email || ''}
                          onChange={(e) => updateData('contactInfo', { ...block.data?.contactInfo, email: e.target.value })}
                          placeholder="contact@firma.ro"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Adresa</label>
                        <input
                          type="text"
                          value={block.data?.contactInfo?.address || ''}
                          onChange={(e) => updateData('contactInfo', { ...block.data?.contactInfo, address: e.target.value })}
                          placeholder="Str. Exemplu, nr. 1, Cluj-Napoca"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Program</label>
                        <textarea
                          value={block.data?.contactInfo?.schedule || ''}
                          onChange={(e) => updateData('contactInfo', { ...block.data?.contactInfo, schedule: e.target.value })}
                          placeholder={"Luni - Vineri: 09:00 - 18:00\nSâmbătă: 10:00 - 14:00"}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {block.type === 'booking-widget' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Titlu</label>
                    <input
                      type="text"
                      value={block.data?.title || ''}
                      onChange={(e) => updateData('title', e.target.value)}
                      placeholder="Programeaza o intalnire"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subtitlu</label>
                    <textarea
                      value={block.data?.subtitle || ''}
                      onChange={(e) => updateData('subtitle', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Afiseaza selectie servicii</label>
                    <Switch
                      checked={block.data?.showServices !== false}
                      onCheckedChange={(v) => updateData('showServices', v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Afiseaza selectie specialist</label>
                    <Switch
                      checked={block.data?.showEmployee || false}
                      onCheckedChange={(v) => updateData('showEmployee', v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Mod compact</label>
                    <Switch
                      checked={block.data?.compactMode || false}
                      onCheckedChange={(v) => updateData('compactMode', v)}
                    />
                  </div>
                </>
              )}

              {block.type === 'spacer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Inaltime ({block.data?.height || 60}px)
                  </label>
                  <Slider
                    value={[block.data?.height || 60]}
                    onValueChange={([v]) => updateData('height', v)}
                    min={10}
                    max={200}
                    step={10}
                  />
                </div>
              )}

              {block.type === 'testimonials' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Titlu</label>
                    <input
                      type="text"
                      value={block.data?.title || ''}
                      onChange={(e) => updateData('title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subtitlu</label>
                    <input
                      type="text"
                      value={block.data?.subtitle || ''}
                      onChange={(e) => updateData('subtitle', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Layout</label>
                    <select
                      value={block.data?.layout || 'carousel'}
                      onChange={(e) => updateData('layout', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="carousel">Carusel</option>
                      <option value="grid">Grid</option>
                      <option value="list">Lista</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Afiseaza rating</label>
                    <Switch
                      checked={block.data?.showRating !== false}
                      onCheckedChange={(v) => updateData('showRating', v)}
                    />
                  </div>

                  {/* Testimonials manager */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-semibold text-gray-700">
                        Testimoniale ({(block.data?.testimonials || []).length})
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const testimonials = [...(block.data?.testimonials || [])];
                          testimonials.push({ name: '', content: '', rating: 5, role: '' });
                          updateData('testimonials', testimonials);
                        }}
                        className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        <Plus className="h-3.5 w-3.5" /> Adauga
                      </button>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {(block.data?.testimonials || []).map((testimonial, idx) => (
                        <div key={idx} className="border rounded-lg p-3 bg-gray-50 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-500">#{idx + 1}</span>
                            <div className="flex items-center gap-1">
                              {idx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const testimonials = [...(block.data?.testimonials || [])];
                                    [testimonials[idx - 1], testimonials[idx]] = [testimonials[idx], testimonials[idx - 1]];
                                    updateData('testimonials', testimonials);
                                  }}
                                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                                >
                                  <ChevronUp className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {idx < (block.data?.testimonials || []).length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const testimonials = [...(block.data?.testimonials || [])];
                                    [testimonials[idx], testimonials[idx + 1]] = [testimonials[idx + 1], testimonials[idx]];
                                    updateData('testimonials', testimonials);
                                  }}
                                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                                >
                                  <ChevronDown className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  const testimonials = [...(block.data?.testimonials || [])];
                                  testimonials.splice(idx, 1);
                                  updateData('testimonials', testimonials);
                                }}
                                className="p-1 text-red-400 hover:text-red-600 rounded"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={testimonial.name || ''}
                            onChange={(e) => {
                              const testimonials = [...(block.data?.testimonials || [])];
                              testimonials[idx] = { ...testimonials[idx], name: e.target.value };
                              updateData('testimonials', testimonials);
                            }}
                            placeholder="Nume"
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                          />
                          <textarea
                            value={testimonial.content || ''}
                            onChange={(e) => {
                              const testimonials = [...(block.data?.testimonials || [])];
                              testimonials[idx] = { ...testimonials[idx], content: e.target.value };
                              updateData('testimonials', testimonials);
                            }}
                            placeholder="Continut recenzie"
                            rows={2}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                          />
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={testimonial.role || ''}
                              onChange={(e) => {
                                const testimonials = [...(block.data?.testimonials || [])];
                                testimonials[idx] = { ...testimonials[idx], role: e.target.value };
                                updateData('testimonials', testimonials);
                              }}
                              placeholder="Rol (ex: Client)"
                              className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                            />
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => {
                                    const testimonials = [...(block.data?.testimonials || [])];
                                    testimonials[idx] = { ...testimonials[idx], rating: star };
                                    updateData('testimonials', testimonials);
                                  }}
                                  className="p-0"
                                >
                                  <Star
                                    className={cn(
                                      'h-4 w-4',
                                      star <= (testimonial.rating || 0)
                                        ? 'text-yellow-400 fill-yellow-400'
                                        : 'text-gray-300'
                                    )}
                                  />
                                </button>
                              ))}
                            </div>
                          </div>
                          <input
                            type="text"
                            value={testimonial.avatar || ''}
                            onChange={(e) => {
                              const testimonials = [...(block.data?.testimonials || [])];
                              testimonials[idx] = { ...testimonials[idx], avatar: e.target.value };
                              updateData('testimonials', testimonials);
                            }}
                            placeholder="URL avatar (optional)"
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {block.type === 'gallery' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Titlu</label>
                    <input
                      type="text"
                      value={block.data?.title || ''}
                      onChange={(e) => updateData('title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subtitlu</label>
                    <input
                      type="text"
                      value={block.data?.subtitle || ''}
                      onChange={(e) => updateData('subtitle', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Coloane</label>
                    <select
                      value={String(block.data?.columns || 3)}
                      onChange={(e) => updateData('columns', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Layout</label>
                    <select
                      value={block.data?.layout || 'grid'}
                      onChange={(e) => updateData('layout', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="grid">Grid</option>
                      <option value="masonry">Masonry</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Lightbox</label>
                    <Switch
                      checked={block.data?.showLightbox !== false}
                      onCheckedChange={(v) => updateData('showLightbox', v)}
                    />
                  </div>

                  {/* Gallery images manager */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-semibold text-gray-700">
                        Imagini ({(block.data?.images || []).length})
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const images = [...(block.data?.images || [])];
                          images.push({ src: '', alt: '' });
                          updateData('images', images);
                        }}
                        className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        <Plus className="h-3.5 w-3.5" /> Adauga
                      </button>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {(block.data?.images || []).map((image, idx) => (
                        <div key={idx} className="border rounded-lg p-3 bg-gray-50 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {image.src && (
                                <img src={image.src} alt="" className="w-10 h-10 object-cover rounded" />
                              )}
                              <span className="text-xs font-medium text-gray-500">#{idx + 1}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {idx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const images = [...(block.data?.images || [])];
                                    [images[idx - 1], images[idx]] = [images[idx], images[idx - 1]];
                                    updateData('images', images);
                                  }}
                                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                                >
                                  <ChevronUp className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {idx < (block.data?.images || []).length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const images = [...(block.data?.images || [])];
                                    [images[idx], images[idx + 1]] = [images[idx + 1], images[idx]];
                                    updateData('images', images);
                                  }}
                                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                                >
                                  <ChevronDown className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  const images = [...(block.data?.images || [])];
                                  images.splice(idx, 1);
                                  updateData('images', images);
                                }}
                                className="p-1 text-red-400 hover:text-red-600 rounded"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          <ImageUploadField
                            value={image.src || ''}
                            onChange={(url) => {
                              const images = [...(block.data?.images || [])];
                              images[idx] = { ...images[idx], src: url };
                              updateData('images', images);
                            }}
                            placeholder="URL imagine"
                          />
                          <input
                            type="text"
                            value={image.alt || ''}
                            onChange={(e) => {
                              const images = [...(block.data?.images || [])];
                              images[idx] = { ...images[idx], alt: e.target.value };
                              updateData('images', images);
                            }}
                            placeholder="Text alternativ (ALT)"
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {block.type === 'faq' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Titlu</label>
                    <input
                      type="text"
                      value={block.data?.title || ''}
                      onChange={(e) => updateData('title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subtitlu</label>
                    <input
                      type="text"
                      value={block.data?.subtitle || ''}
                      onChange={(e) => updateData('subtitle', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Permite deschiderea multipla</label>
                    <Switch
                      checked={block.data?.allowMultiple || false}
                      onCheckedChange={(v) => updateData('allowMultiple', v)}
                    />
                  </div>

                  {/* FAQ items manager */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-semibold text-gray-700">
                        Intrebari ({(block.data?.items || []).length})
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const items = [...(block.data?.items || [])];
                          items.push({ question: '', answer: '' });
                          updateData('items', items);
                        }}
                        className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        <Plus className="h-3.5 w-3.5" /> Adauga
                      </button>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {(block.data?.items || []).map((item, idx) => (
                        <div key={idx} className="border rounded-lg p-3 bg-gray-50 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-500">#{idx + 1}</span>
                            <div className="flex items-center gap-1">
                              {idx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const items = [...(block.data?.items || [])];
                                    [items[idx - 1], items[idx]] = [items[idx], items[idx - 1]];
                                    updateData('items', items);
                                  }}
                                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                                >
                                  <ChevronUp className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {idx < (block.data?.items || []).length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const items = [...(block.data?.items || [])];
                                    [items[idx], items[idx + 1]] = [items[idx + 1], items[idx]];
                                    updateData('items', items);
                                  }}
                                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                                >
                                  <ChevronDown className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  const items = [...(block.data?.items || [])];
                                  items.splice(idx, 1);
                                  updateData('items', items);
                                }}
                                className="p-1 text-red-400 hover:text-red-600 rounded"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={item.question || ''}
                            onChange={(e) => {
                              const items = [...(block.data?.items || [])];
                              items[idx] = { ...items[idx], question: e.target.value };
                              updateData('items', items);
                            }}
                            placeholder="Intrebare"
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                          />
                          <textarea
                            value={item.answer || ''}
                            onChange={(e) => {
                              const items = [...(block.data?.items || [])];
                              items[idx] = { ...items[idx], answer: e.target.value };
                              updateData('items', items);
                            }}
                            placeholder="Raspuns"
                            rows={2}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {block.type === 'stats' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Titlu</label>
                    <input
                      type="text"
                      value={block.data?.title || ''}
                      onChange={(e) => updateData('title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subtitlu</label>
                    <input
                      type="text"
                      value={block.data?.subtitle || ''}
                      onChange={(e) => updateData('subtitle', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Coloane</label>
                    <select
                      value={String(block.data?.columns || 4)}
                      onChange={(e) => updateData('columns', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                    </select>
                  </div>

                  {/* Stats manager */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-semibold text-gray-700">
                        Statistici ({(block.data?.stats || []).length})
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const stats = [...(block.data?.stats || [])];
                          stats.push({ value: '0', label: '', description: '' });
                          updateData('stats', stats);
                        }}
                        className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        <Plus className="h-3.5 w-3.5" /> Adauga
                      </button>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {(block.data?.stats || []).map((stat, idx) => (
                        <div key={idx} className="border rounded-lg p-3 bg-gray-50 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-500">#{idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const stats = [...(block.data?.stats || [])];
                                stats.splice(idx, 1);
                                updateData('stats', stats);
                              }}
                              className="p-1 text-red-400 hover:text-red-600 rounded"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <input
                            type="text"
                            value={stat.value || ''}
                            onChange={(e) => {
                              const stats = [...(block.data?.stats || [])];
                              stats[idx] = { ...stats[idx], value: e.target.value };
                              updateData('stats', stats);
                            }}
                            placeholder="Valoare (ex: 500+)"
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            value={stat.label || ''}
                            onChange={(e) => {
                              const stats = [...(block.data?.stats || [])];
                              stats[idx] = { ...stats[idx], label: e.target.value };
                              updateData('stats', stats);
                            }}
                            placeholder="Eticheta (ex: Clienti multumiti)"
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            value={stat.description || ''}
                            onChange={(e) => {
                              const stats = [...(block.data?.stats || [])];
                              stats[idx] = { ...stats[idx], description: e.target.value };
                              updateData('stats', stats);
                            }}
                            placeholder="Descriere (optional)"
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {block.type === 'video' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Titlu</label>
                    <input
                      type="text"
                      value={block.data?.title || ''}
                      onChange={(e) => updateData('title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subtitlu</label>
                    <input
                      type="text"
                      value={block.data?.subtitle || ''}
                      onChange={(e) => updateData('subtitle', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">URL Video (YouTube sau Vimeo)</label>
                    <input
                      type="text"
                      value={block.data?.url || ''}
                      onChange={(e) => updateData('url', e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail personalizat (URL)</label>
                    <input
                      type="text"
                      value={block.data?.thumbnail || ''}
                      onChange={(e) => updateData('thumbnail', e.target.value)}
                      placeholder="https://... (optional)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Aspect ratio</label>
                    <select
                      value={block.data?.aspectRatio || '16:9'}
                      onChange={(e) => updateData('aspectRatio', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="16:9">16:9 (Video)</option>
                      <option value="4:3">4:3</option>
                      <option value="1:1">1:1 (Patrat)</option>
                      <option value="21:9">21:9 (Panoramic)</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Autoplay</label>
                    <Switch
                      checked={block.data?.autoplay || false}
                      onCheckedChange={(v) => updateData('autoplay', v)}
                    />
                  </div>
                </>
              )}

              {block.type === 'pricing-table' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Titlu</label>
                    <input
                      type="text"
                      value={block.data?.title || ''}
                      onChange={(e) => updateData('title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subtitlu</label>
                    <input
                      type="text"
                      value={block.data?.subtitle || ''}
                      onChange={(e) => updateData('subtitle', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Text buton implicit</label>
                    <input
                      type="text"
                      value={block.data?.ctaText || ''}
                      onChange={(e) => updateData('ctaText', e.target.value)}
                      placeholder="Programeaza"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Afiseaza buton CTA</label>
                    <Switch
                      checked={block.data?.showCta !== false}
                      onCheckedChange={(v) => updateData('showCta', v)}
                    />
                  </div>

                  {/* Plans manager */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-semibold text-gray-700">
                        Pachete ({(block.data?.plans || []).length})
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const plans = [...(block.data?.plans || [])];
                          plans.push({ name: '', price: '', currency: 'RON', period: 'luna', features: [], featured: false });
                          updateData('plans', plans);
                        }}
                        className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        <Plus className="h-3.5 w-3.5" /> Adauga
                      </button>
                    </div>

                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {(block.data?.plans || []).map((plan, idx) => (
                        <div key={idx} className="border rounded-lg p-3 bg-gray-50 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-500">Pachet #{idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const plans = [...(block.data?.plans || [])];
                                plans.splice(idx, 1);
                                updateData('plans', plans);
                              }}
                              className="p-1 text-red-400 hover:text-red-600 rounded"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <input
                            type="text"
                            value={plan.name || ''}
                            onChange={(e) => {
                              const plans = [...(block.data?.plans || [])];
                              plans[idx] = { ...plans[idx], name: e.target.value };
                              updateData('plans', plans);
                            }}
                            placeholder="Nume pachet"
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            value={plan.description || ''}
                            onChange={(e) => {
                              const plans = [...(block.data?.plans || [])];
                              plans[idx] = { ...plans[idx], description: e.target.value };
                              updateData('plans', plans);
                            }}
                            placeholder="Descriere (optional)"
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                          />
                          <div className="grid grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={plan.price || ''}
                              onChange={(e) => {
                                const plans = [...(block.data?.plans || [])];
                                plans[idx] = { ...plans[idx], price: e.target.value };
                                updateData('plans', plans);
                              }}
                              placeholder="Pret"
                              className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                            />
                            <input
                              type="text"
                              value={plan.currency || ''}
                              onChange={(e) => {
                                const plans = [...(block.data?.plans || [])];
                                plans[idx] = { ...plans[idx], currency: e.target.value };
                                updateData('plans', plans);
                              }}
                              placeholder="RON"
                              className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                            />
                            <input
                              type="text"
                              value={plan.period || ''}
                              onChange={(e) => {
                                const plans = [...(block.data?.plans || [])];
                                plans[idx] = { ...plans[idx], period: e.target.value };
                                updateData('plans', plans);
                              }}
                              placeholder="luna"
                              className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-gray-600">Evidentiaza (featured)</label>
                            <Switch
                              checked={plan.featured || false}
                              onCheckedChange={(v) => {
                                const plans = [...(block.data?.plans || [])];
                                plans[idx] = { ...plans[idx], featured: v };
                                updateData('plans', plans);
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Caracteristici (una per linie)
                            </label>
                            <textarea
                              value={(plan.features || []).map((f) => typeof f === 'string' ? f : f.text).join('\n')}
                              onChange={(e) => {
                                const plans = [...(block.data?.plans || [])];
                                const features = e.target.value.split('\n').filter(Boolean).map((text) => ({ text, included: true }));
                                plans[idx] = { ...plans[idx], features };
                                updateData('plans', plans);
                              }}
                              placeholder="Caracteristica 1&#10;Caracteristica 2&#10;..."
                              rows={3}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {block.type === 'divider' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stil</label>
                    <select
                      value={block.data?.style || 'line'}
                      onChange={(e) => updateData('style', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="line">Linie</option>
                      <option value="dots">Puncte</option>
                      <option value="space">Spatiu</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Grosime</label>
                    <select
                      value={block.data?.thickness || 'thin'}
                      onChange={(e) => updateData('thickness', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="thin">Subtire</option>
                      <option value="medium">Medie</option>
                      <option value="thick">Groasa</option>
                    </select>
                  </div>
                </>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Style Settings */}
          <AccordionItem value="style">
            <AccordionTrigger>Stil</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Culoare fundal</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={block.settings?.backgroundColor || '#ffffff'}
                    onChange={(e) => updateSettings('backgroundColor', e.target.value)}
                    className="w-12 h-10 p-1 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={block.settings?.backgroundColor || '#ffffff'}
                    onChange={(e) => updateSettings('backgroundColor', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Culoare text</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={block.settings?.textColor || '#1f2937'}
                    onChange={(e) => updateSettings('textColor', e.target.value)}
                    className="w-12 h-10 p-1 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={block.settings?.textColor || '#1f2937'}
                    onChange={(e) => updateSettings('textColor', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Padding sus ({block.settings?.padding?.top || 40}px)
                </label>
                <Slider
                  value={[block.settings?.padding?.top || 40]}
                  onValueChange={([v]) => updatePadding('top', v)}
                  min={0}
                  max={120}
                  step={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Padding jos ({block.settings?.padding?.bottom || 40}px)
                </label>
                <Slider
                  value={[block.settings?.padding?.bottom || 40]}
                  onValueChange={([v]) => updatePadding('bottom', v)}
                  min={0}
                  max={120}
                  step={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Latime maxima</label>
                <select
                  value={block.settings?.maxWidth || 'lg'}
                  onChange={(e) => updateSettings('maxWidth', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="sm">Mica (640px)</option>
                  <option value="md">Medie (768px)</option>
                  <option value="lg">Mare (1024px)</option>
                  <option value="xl">Extra mare (1280px)</option>
                  <option value="full">Toata latimea</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aliniere</label>
                <select
                  value={block.settings?.alignment || 'center'}
                  onChange={(e) => updateSettings('alignment', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="left">Stanga</option>
                  <option value="center">Centru</option>
                  <option value="right">Dreapta</option>
                </select>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Tips - shown for all block types that have helper data */}
          {BLOCK_HELPERS[block.type] && (
            <AccordionItem value="info">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  Sfaturi
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-2">
                {BLOCK_HELPERS[block.type].tips && (
                  <ul className="space-y-2 text-sm text-gray-600">
                    {BLOCK_HELPERS[block.type].tips.map((tip, i) => (
                      <li key={i} className="flex gap-2 leading-relaxed">
                        <span className="text-blue-400 mt-1 shrink-0">&#8226;</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {BLOCK_HELPERS[block.type].advanced?.endpoints && (
                  <details className="mt-3">
                    <summary className="text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700">
                      Avansat - Endpoint-uri API
                    </summary>
                    <div className="space-y-2 mt-2">
                      {BLOCK_HELPERS[block.type].advanced.endpoints.map((ep, i) => (
                        <div key={i}>
                          <span className="text-xs text-gray-500 mb-0.5 block">{ep.label}</span>
                          <EndpointField endpoint={ep} />
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </div>
    </div>
  );
};

export default BlockSettings;
