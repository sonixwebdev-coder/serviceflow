import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Check,
  Eye,
  Layout,
  X,
  FileText,
  LayoutTemplate,
  Type,
  Image,
  MousePointerClick,
  Grid3x3,
  Users,
  MapPin,
  Calendar,
  Mail,
  Images,
  Quote,
  Minus,
  MoveVertical,
} from 'lucide-react';
import { templates, getTemplatesBySector } from './templateData';

const sectorLabels = {
  AUTOMOTIVE: 'Auto',
  BEAUTY: 'Frumusete',
  IT_ELECTRONICS: 'IT & Electronice',
  HOME_SERVICES: 'Servicii domiciliu',
};

const blockIcons = {
  hero: LayoutTemplate,
  text: Type,
  image: Image,
  button: MousePointerClick,
  'services-grid': Grid3x3,
  'team-grid': Users,
  'locations-map': MapPin,
  'booking-widget': Calendar,
  'contact-form': Mail,
  gallery: Images,
  testimonials: Quote,
  divider: Minus,
  spacer: MoveVertical,
};

const blockLabels = {
  hero: 'Hero',
  text: 'Text',
  image: 'Imagine',
  button: 'Buton',
  'services-grid': 'Servicii',
  'team-grid': 'Echipa',
  'locations-map': 'Locatii',
  'booking-widget': 'Programare',
  'contact-form': 'Contact',
  gallery: 'Galerie',
  testimonials: 'Testimoniale',
  divider: 'Separator',
  spacer: 'Spatiu',
};

const TemplateSelector = ({ onSelect, selectedSector, currentTemplateId }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPageIndex, setPreviewPageIndex] = useState(0);
  const [filter, setFilter] = useState('all');

  const filteredTemplates =
    filter === 'all'
      ? templates
      : filter === 'recommended'
        ? getTemplatesBySector(selectedSector)
        : templates.filter((t) => t.sector === filter);

  const handleSelect = (template) => {
    setSelectedTemplate(template);
  };

  const handleConfirm = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate);
    }
  };

  const handlePreview = (template) => {
    setSelectedTemplate(template);
    setPreviewPageIndex(0);
    setPreviewOpen(true);
  };

  const previewPages = selectedTemplate?.pages || [];
  const activePage = previewPages[previewPageIndex];

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
          onClick={() => setFilter('all')}
        >
          Toate
        </button>
        {selectedSector && (
          <button
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
              filter === 'recommended'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
            onClick={() => setFilter('recommended')}
          >
            Recomandate pentru tine
          </button>
        )}
        {Object.entries(sectorLabels).map(([sector, label]) => (
          <button
            key={sector}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
              filter === sector
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
            onClick={() => setFilter(sector)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className={cn(
              'bg-white rounded-lg border shadow-sm overflow-hidden cursor-pointer transition-all hover:shadow-lg',
              selectedTemplate?.id === template.id && 'ring-2 ring-blue-500',
              currentTemplateId === template.id && 'bg-blue-50'
            )}
            onClick={() => handleSelect(template)}
          >
            {/* Thumbnail */}
            <div className="aspect-video bg-gray-100 relative overflow-hidden">
              {template.thumbnail ? (
                <img
                  src={template.thumbnail}
                  alt={template.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Layout className="h-16 w-16 text-gray-300" />
                </div>
              )}
              {currentTemplateId === template.id && (
                <div className="absolute top-2 right-2">
                  <span className="inline-flex items-center px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded">
                    <Check className="h-3 w-3 mr-1" />
                    Activ
                  </span>
                </div>
              )}
            </div>

            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{template.name}</h3>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                  {sectorLabels[template.sector]}
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-3">{template.description}</p>

              {/* Page count badge */}
              <div className="flex items-center gap-1 text-xs text-gray-400 mb-4">
                <FileText className="h-3 w-3" />
                <span>{template.pages?.length || 0} pagini</span>
              </div>

              <div className="flex gap-2">
                <button
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreview(template);
                  }}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </button>
                <button
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTemplate(template);
                    handleConfirm();
                  }}
                >
                  Foloseste
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Layout className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <p>Niciun template disponibil pentru acest filtru</p>
        </div>
      )}

      {/* Blank Template Option */}
      <div className="border-t pt-6">
        <div className="bg-gray-50 rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <h3 className="font-semibold mb-2">Porneste de la zero</h3>
          <p className="text-sm text-gray-600 mb-4">
            Creeaza un website complet personalizat folosind editorul de blocuri
          </p>
          <button
            onClick={() => onSelect(null)}
            className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-white transition-colors"
          >
            Pagina goala
          </button>
        </div>
      </div>

      {/* Preview Dialog */}
      {previewOpen && selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPreviewOpen(false)} />

          <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-lg font-semibold">{selectedTemplate.name}</h2>
                <p className="text-sm text-gray-500">{selectedTemplate.description}</p>
              </div>
              <button
                onClick={() => setPreviewOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Page tabs */}
            <div className="flex gap-1 px-4 pt-3 bg-gray-50 border-b overflow-x-auto">
              {previewPages.map((page, index) => (
                <button
                  key={page.slug}
                  onClick={() => setPreviewPageIndex(index)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap',
                    previewPageIndex === index
                      ? 'bg-white text-gray-900 border border-b-white -mb-px'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <FileText className="h-3.5 w-3.5" />
                  {page.title}
                </button>
              ))}
            </div>

            {/* Content - Structured block preview */}
            <div className="flex-1 overflow-auto p-4 bg-gray-100">
              {activePage ? (
                <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                  {/* Page header */}
                  <div className="px-4 py-3 bg-gray-50 border-b flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 mx-8">
                      <div className="bg-white border rounded px-3 py-1 text-xs text-gray-400 text-center">
                        /{activePage.slug}
                      </div>
                    </div>
                  </div>

                  {/* Block wireframes */}
                  <div className="divide-y">
                    {(activePage.content || []).map((blk, index) => {
                      const Icon = blockIcons[blk.type] || Layout;
                      const label = blockLabels[blk.type] || blk.type;
                      const title = blk.data?.title || '';
                      const isHero = blk.type === 'hero';
                      const bgColor = blk.settings?.backgroundColor || 'transparent';
                      const hasBg = bgColor !== 'transparent' && bgColor !== '#ffffff';

                      return (
                        <div
                          key={blk.id || index}
                          className={cn(
                            'px-4 py-3 flex items-center gap-3',
                            isHero && 'bg-gray-900 text-white py-6',
                            !isHero && hasBg && 'bg-gray-50'
                          )}
                        >
                          <div
                            className={cn(
                              'w-8 h-8 rounded flex items-center justify-center flex-shrink-0',
                              isHero ? 'bg-white/20' : 'bg-blue-50'
                            )}
                          >
                            <Icon
                              className={cn('h-4 w-4', isHero ? 'text-white' : 'text-blue-600')}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span
                              className={cn(
                                'text-sm font-medium',
                                isHero ? 'text-white' : 'text-gray-700'
                              )}
                            >
                              {label}
                            </span>
                            {title && (
                              <p
                                className={cn(
                                  'text-xs truncate',
                                  isHero ? 'text-gray-300' : 'text-gray-400'
                                )}
                              >
                                {title}
                              </p>
                            )}
                          </div>
                          {isHero && blk.data?.backgroundImage && (
                            <img
                              src={blk.data.backgroundImage}
                              alt=""
                              className="w-20 h-12 rounded object-cover opacity-60"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {activePage.content?.length === 0 && (
                    <div className="p-8 text-center text-gray-400 text-sm">
                      Pagina nu contine blocuri
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  Selecteaza o pagina pentru preview
                </div>
              )}

              {/* Template info summary */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="bg-white rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">{previewPages.length}</p>
                  <p className="text-xs text-gray-500">Pagini</p>
                </div>
                <div className="bg-white rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {previewPages.reduce((sum, p) => sum + (p.content?.length || 0), 0)}
                  </p>
                  <p className="text-xs text-gray-500">Blocuri total</p>
                </div>
                <div className="bg-white rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {
                      new Set(previewPages.flatMap((p) => (p.content || []).map((b) => b.type)))
                        .size
                    }
                  </p>
                  <p className="text-xs text-gray-500">Tipuri de bloc</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-4 border-t">
              <button
                onClick={() => setPreviewOpen(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Inchide
              </button>
              <button
                onClick={() => {
                  setPreviewOpen(false);
                  handleConfirm();
                }}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Foloseste acest template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateSelector;
