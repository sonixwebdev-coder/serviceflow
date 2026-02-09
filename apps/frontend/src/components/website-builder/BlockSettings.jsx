import { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, ChevronDown, Plus, Trash2, ChevronUp, Star } from 'lucide-react';
import { blockTypes } from './blocks';

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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Imagine de fundal (URL)</label>
                    <input
                      type="text"
                      value={block.data?.backgroundImage || ''}
                      onChange={(e) => updateData('backgroundImage', e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">URL imagine</label>
                    <input
                      type="text"
                      value={block.data?.src || ''}
                      onChange={(e) => updateData('src', e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
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
                          <input
                            type="text"
                            value={image.src || ''}
                            onChange={(e) => {
                              const images = [...(block.data?.images || [])];
                              images[idx] = { ...images[idx], src: e.target.value };
                              updateData('images', images);
                            }}
                            placeholder="URL imagine"
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
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
        </Accordion>
      </div>
    </div>
  );
};

export default BlockSettings;
