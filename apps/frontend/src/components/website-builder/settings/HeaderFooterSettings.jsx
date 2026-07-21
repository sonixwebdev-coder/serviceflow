import { useState } from 'react';
import { PanelTop, PanelBottom } from 'lucide-react';

const Toggle = ({ checked, onChange, label, description }) => (
  <div className="flex items-center justify-between py-2">
    <div>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
        checked ? 'bg-blue-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

const DEFAULTS = {
  header: {
    showBookingButton: true,
    bookingButtonText: 'Programeaza',
    sticky: true,
  },
  footer: {
    showAbout: true,
    showQuickLinks: true,
    showContact: true,
    showHours: true,
    showSocialLinks: false,
    socialLinks: { facebook: '', instagram: '', tiktok: '', youtube: '' },
    copyrightText: '',
  },
};

const buildInitial = (theme) => ({
  header: {
    showBookingButton: theme?.header?.showBookingButton ?? DEFAULTS.header.showBookingButton,
    bookingButtonText: theme?.header?.bookingButtonText ?? DEFAULTS.header.bookingButtonText,
    sticky: theme?.header?.sticky ?? DEFAULTS.header.sticky,
  },
  footer: {
    showAbout: theme?.footer?.showAbout ?? DEFAULTS.footer.showAbout,
    showQuickLinks: theme?.footer?.showQuickLinks ?? DEFAULTS.footer.showQuickLinks,
    showContact: theme?.footer?.showContact ?? DEFAULTS.footer.showContact,
    showHours: theme?.footer?.showHours ?? DEFAULTS.footer.showHours,
    showSocialLinks: theme?.footer?.showSocialLinks ?? DEFAULTS.footer.showSocialLinks,
    socialLinks: {
      facebook: theme?.footer?.socialLinks?.facebook ?? '',
      instagram: theme?.footer?.socialLinks?.instagram ?? '',
      tiktok: theme?.footer?.socialLinks?.tiktok ?? '',
      youtube: theme?.footer?.socialLinks?.youtube ?? '',
    },
    copyrightText: theme?.footer?.copyrightText ?? '',
  },
});

const HeaderFooterSettings = ({ theme = {}, onChange, isLoading = false }) => {
  const [local, setLocal] = useState(() => buildInitial(theme));

  const updateHeader = (key, value) => {
    setLocal((prev) => ({ ...prev, header: { ...prev.header, [key]: value } }));
  };

  const updateFooter = (key, value) => {
    setLocal((prev) => ({ ...prev, footer: { ...prev.footer, [key]: value } }));
  };

  const updateSocialLink = (key, value) => {
    setLocal((prev) => ({
      ...prev,
      footer: {
        ...prev.footer,
        socialLinks: { ...prev.footer.socialLinks, [key]: value },
      },
    }));
  };

  const handleSave = () => {
    onChange({ ...theme, header: local.header, footer: local.footer });
  };

  const hasChanges = JSON.stringify(local) !== JSON.stringify(buildInitial(theme));

  return (
    <div className="space-y-6">
      {/* Header Settings */}
      <div className="bg-white rounded-lg border shadow-xs">
        <div className="p-6 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <PanelTop className="h-5 w-5" />
            Header
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Configurati comportamentul si elementele din header
          </p>
        </div>
        <div className="p-6 space-y-3">
          <Toggle
            checked={local.header.showBookingButton}
            onChange={(v) => updateHeader('showBookingButton', v)}
            label="Buton programare"
            description="Afiseaza butonul de programare in header"
          />
          {local.header.showBookingButton && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Text buton programare
              </label>
              <input
                type="text"
                value={local.header.bookingButtonText}
                onChange={(e) => updateHeader('bookingButtonText', e.target.value)}
                placeholder="Programeaza"
                maxLength={30}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
          <Toggle
            checked={local.header.sticky}
            onChange={(v) => updateHeader('sticky', v)}
            label="Header fix"
            description="Header-ul ramane vizibil la scroll"
          />
        </div>
      </div>

      {/* Footer Settings */}
      <div className="bg-white rounded-lg border shadow-xs">
        <div className="p-6 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <PanelBottom className="h-5 w-5" />
            Footer
          </h3>
          <p className="text-sm text-gray-500 mt-1">Alegeti ce sectiuni sa apara in footer</p>
        </div>
        <div className="p-6 space-y-3">
          <Toggle
            checked={local.footer.showAbout}
            onChange={(v) => updateFooter('showAbout', v)}
            label="Despre"
            description="Sectiunea cu descrierea organizatiei"
          />
          <Toggle
            checked={local.footer.showQuickLinks}
            onChange={(v) => updateFooter('showQuickLinks', v)}
            label="Link-uri rapide"
            description="Lista cu link-uri catre pagini"
          />
          <Toggle
            checked={local.footer.showContact}
            onChange={(v) => updateFooter('showContact', v)}
            label="Informatii de contact"
            description="Telefon, email si adresa"
          />
          <Toggle
            checked={local.footer.showHours}
            onChange={(v) => updateFooter('showHours', v)}
            label="Program de lucru"
            description="Orele de functionare"
          />

          <div className="border-t pt-3 mt-3">
            <Toggle
              checked={local.footer.showSocialLinks}
              onChange={(v) => updateFooter('showSocialLinks', v)}
              label="Link-uri social media"
              description="Afiseaza iconite pentru retelele sociale"
            />
          </div>

          {local.footer.showSocialLinks && (
            <div className="space-y-3 pl-4 border-l-2 border-blue-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Facebook</label>
                <input
                  type="text"
                  value={local.footer.socialLinks.facebook}
                  onChange={(e) => updateSocialLink('facebook', e.target.value)}
                  placeholder="https://facebook.com/pagina-ta"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                <input
                  type="text"
                  value={local.footer.socialLinks.instagram}
                  onChange={(e) => updateSocialLink('instagram', e.target.value)}
                  placeholder="https://instagram.com/contul-tau"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">TikTok</label>
                <input
                  type="text"
                  value={local.footer.socialLinks.tiktok}
                  onChange={(e) => updateSocialLink('tiktok', e.target.value)}
                  placeholder="https://tiktok.com/@contul-tau"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">YouTube</label>
                <input
                  type="text"
                  value={local.footer.socialLinks.youtube}
                  onChange={(e) => updateSocialLink('youtube', e.target.value)}
                  placeholder="https://youtube.com/@canalul-tau"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          <div className="border-t pt-3 mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Text copyright personalizat
            </label>
            <input
              type="text"
              value={local.footer.copyrightText}
              onChange={(e) => updateFooter('copyrightText', e.target.value)}
              placeholder="Lasat gol pentru textul implicit"
              maxLength={200}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Implicit: "&copy; {new Date().getFullYear()} Numele organizatiei. Toate drepturile
              rezervate."
            </p>
          </div>
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

export default HeaderFooterSettings;
