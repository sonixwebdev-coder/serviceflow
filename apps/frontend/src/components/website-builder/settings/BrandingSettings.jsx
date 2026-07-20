import { useState } from 'react';
import { Palette, Type, Image } from 'lucide-react';
import ImageUploadField from './ImageUploadField';

const fontOptions = [
  { value: 'system-ui, sans-serif', label: 'System Default' },
  { value: 'Inter, sans-serif', label: 'Inter' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: 'Open Sans, sans-serif', label: 'Open Sans' },
  { value: 'Lato, sans-serif', label: 'Lato' },
  { value: 'Poppins, sans-serif', label: 'Poppins' },
  { value: 'Montserrat, sans-serif', label: 'Montserrat' },
  { value: 'Playfair Display, serif', label: 'Playfair Display' },
  { value: 'Merriweather, serif', label: 'Merriweather' },
];

const BrandingSettings = ({ branding = {}, onChange, isLoading = false }) => {
  const [localBranding, setLocalBranding] = useState({
    primaryColor: branding.primaryColor || '#3b82f6',
    secondaryColor: branding.secondaryColor || '#6366f1',
    fontFamily: branding.fontFamily || 'system-ui, sans-serif',
    logoUrl: branding.logoUrl || '',
    faviconUrl: branding.faviconUrl || '',
  });

  const handleChange = (key, value) => {
    const updated = { ...localBranding, [key]: value };
    setLocalBranding(updated);
  };

  const handleSave = () => {
    onChange(localBranding);
  };

  const hasChanges =
    JSON.stringify(localBranding) !==
    JSON.stringify({
      primaryColor: branding.primaryColor || '#3b82f6',
      secondaryColor: branding.secondaryColor || '#6366f1',
      fontFamily: branding.fontFamily || 'system-ui, sans-serif',
      logoUrl: branding.logoUrl || '',
      faviconUrl: branding.faviconUrl || '',
    });

  return (
    <div className="space-y-6">
      {/* Colors */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Culori
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Definiti culorile principale ale website-ului
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Culoare principala
            </label>
            <div className="flex gap-2 mt-1">
              <input
                type="color"
                value={localBranding.primaryColor}
                onChange={(e) => handleChange('primaryColor', e.target.value)}
                className="w-16 h-10 p-1 cursor-pointer border border-gray-300 rounded"
              />
              <input
                type="text"
                value={localBranding.primaryColor}
                onChange={(e) => handleChange('primaryColor', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="#3b82f6"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Folosita pentru butoane, link-uri si elemente de accent
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Culoare secundara
            </label>
            <div className="flex gap-2 mt-1">
              <input
                type="color"
                value={localBranding.secondaryColor}
                onChange={(e) => handleChange('secondaryColor', e.target.value)}
                className="w-16 h-10 p-1 cursor-pointer border border-gray-300 rounded"
              />
              <input
                type="text"
                value={localBranding.secondaryColor}
                onChange={(e) => handleChange('secondaryColor', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="#6366f1"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Folosita pentru elemente secundare si hover states
            </p>
          </div>

          {/* Color Preview */}
          <div className="pt-4 border-t">
            <p className="text-sm text-gray-600 mb-2">Previzualizare:</p>
            <div className="flex gap-4">
              <div
                className="w-20 h-20 rounded-lg shadow-inner flex items-center justify-center text-white text-xs"
                style={{ backgroundColor: localBranding.primaryColor }}
              >
                Principal
              </div>
              <div
                className="w-20 h-20 rounded-lg shadow-inner flex items-center justify-center text-white text-xs"
                style={{ backgroundColor: localBranding.secondaryColor }}
              >
                Secundar
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Typography */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <Type className="h-5 w-5" />
            Tipografie
          </h3>
          <p className="text-sm text-gray-500 mt-1">Alegeti fontul principal pentru website</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Font principal</label>
            <select
              value={localBranding.fontFamily}
              onChange={(e) => handleChange('fontFamily', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {fontOptions.map((font) => (
                <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>

          {/* Font Preview */}
          <div className="pt-4 border-t">
            <p className="text-sm text-gray-600 mb-2">Previzualizare:</p>
            <div
              className="p-4 bg-gray-50 rounded-lg"
              style={{ fontFamily: localBranding.fontFamily }}
            >
              <p className="text-2xl font-bold mb-2">Titlu de exemplu</p>
              <p className="text-base">
                Acesta este un paragraf de exemplu pentru a vedea cum arata fontul selectat in
                context.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Logo & Favicon */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <Image className="h-5 w-5" />
            Logo & Favicon
          </h3>
          <p className="text-sm text-gray-500 mt-1">Incarcati logo-ul si favicon-ul website-ului</p>
        </div>
        <div className="p-6 space-y-5">
          <ImageUploadField
            value={localBranding.logoUrl}
            onChange={(url) => handleChange('logoUrl', url)}
            label="Logo"
            hint="Recomandat: format PNG sau SVG, minim 200x50px"
            accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
            previewClass="max-h-12 object-contain"
          />

          <ImageUploadField
            value={localBranding.faviconUrl}
            onChange={(url) => handleChange('faviconUrl', url)}
            label="Favicon"
            hint="Recomandat: format ICO sau PNG, 32x32px sau 64x64px"
            accept="image/x-icon,image/png,image/svg+xml"
            previewClass="w-8 h-8 object-contain"
          />
        </div>
      </div>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Se salveaza...' : 'Salveaza modificarile'}
          </button>
        </div>
      )}
    </div>
  );
};

export default BrandingSettings;
