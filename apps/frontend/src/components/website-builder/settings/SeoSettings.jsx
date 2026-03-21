import { useState } from 'react';
import { Search, Share2, X, Code, Shield, Link2 } from 'lucide-react';
import ImageUploadField from './ImageUploadField';

const SeoSettings = ({ seoDefaults = {}, onChange, siteName = '', isLoading = false }) => {
  const [localSeo, setLocalSeo] = useState({
    title: seoDefaults.title || '',
    description: seoDefaults.description || '',
    keywords: seoDefaults.keywords || [],
    ogImage: seoDefaults.ogImage || '',
    canonicalUrl: seoDefaults.canonicalUrl || '',
    robotsIndex: seoDefaults.robotsIndex !== false,
    robotsFollow: seoDefaults.robotsFollow !== false,
    customSchema: seoDefaults.customSchema || '',
    customHeadCode: seoDefaults.customHeadCode || '',
  });
  const [keywordInput, setKeywordInput] = useState('');

  const handleChange = (key, value) => {
    const updated = { ...localSeo, [key]: value };
    setLocalSeo(updated);
  };

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !localSeo.keywords.includes(keywordInput.trim())) {
      handleChange('keywords', [...localSeo.keywords, keywordInput.trim()]);
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword) => {
    handleChange('keywords', localSeo.keywords.filter((k) => k !== keyword));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const handleSave = () => {
    onChange(localSeo);
  };

  const hasChanges =
    JSON.stringify(localSeo) !== JSON.stringify({
      title: seoDefaults.title || '',
      description: seoDefaults.description || '',
      keywords: seoDefaults.keywords || [],
      ogImage: seoDefaults.ogImage || '',
      canonicalUrl: seoDefaults.canonicalUrl || '',
      robotsIndex: seoDefaults.robotsIndex !== false,
      robotsFollow: seoDefaults.robotsFollow !== false,
      customSchema: seoDefaults.customSchema || '',
      customHeadCode: seoDefaults.customHeadCode || '',
    });

  const titleLength = localSeo.title.length;
  const descriptionLength = localSeo.description.length;

  return (
    <div className="space-y-6">
      {/* Search Engine Preview */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <Search className="h-5 w-5" />
            Previzualizare Google
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Asa va aparea website-ul in rezultatele cautarii Google
          </p>
        </div>
        <div className="p-6">
          <div className="border rounded-lg p-4 bg-white">
            <div className="text-blue-800 text-lg hover:underline cursor-pointer">
              {localSeo.title || siteName || 'Titlul website-ului'}
            </div>
            <div className="text-green-700 text-sm mt-1">
              www.exemplu.ro
            </div>
            <div className="text-gray-600 text-sm mt-1 line-clamp-2">
              {localSeo.description || 'Descrierea website-ului va aparea aici. O descriere buna ajuta utilizatorii sa inteleaga despre ce este pagina dvs.'}
            </div>
          </div>
        </div>
      </div>

      {/* Meta Title */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-b">
          <h3 className="font-semibold">Titlu (Meta Title)</h3>
          <p className="text-sm text-gray-500 mt-1">
            Titlul care apare in rezultatele cautarii si in tab-ul browserului
          </p>
        </div>
        <div className="p-6 space-y-2">
          <input
            type="text"
            value={localSeo.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Titlul website-ului - Cuvinte cheie"
            maxLength={70}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="flex justify-between text-xs">
            <span className={titleLength > 60 ? 'text-orange-600' : 'text-gray-500'}>
              {titleLength}/70 caractere
            </span>
            <span className="text-gray-500">
              {titleLength < 30 && 'Prea scurt - adaugati mai mult context'}
              {titleLength >= 30 && titleLength <= 60 && 'Lungime optima'}
              {titleLength > 60 && 'Poate fi trunchiat in rezultate'}
            </span>
          </div>
        </div>
      </div>

      {/* Meta Description */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-b">
          <h3 className="font-semibold">Descriere (Meta Description)</h3>
          <p className="text-sm text-gray-500 mt-1">
            Descrierea care apare sub titlu in rezultatele cautarii
          </p>
        </div>
        <div className="p-6 space-y-2">
          <textarea
            value={localSeo.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="O descriere clara si atractiva a website-ului dvs..."
            maxLength={160}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="flex justify-between text-xs">
            <span className={descriptionLength > 155 ? 'text-orange-600' : 'text-gray-500'}>
              {descriptionLength}/160 caractere
            </span>
            <span className="text-gray-500">
              {descriptionLength < 70 && 'Prea scurt - adaugati mai multe detalii'}
              {descriptionLength >= 70 && descriptionLength <= 155 && 'Lungime optima'}
              {descriptionLength > 155 && 'Poate fi trunchiat in rezultate'}
            </span>
          </div>
        </div>
      </div>

      {/* Keywords */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-b">
          <h3 className="font-semibold">Cuvinte cheie (Keywords)</h3>
          <p className="text-sm text-gray-500 mt-1">
            Cuvinte relevante care descriu continutul website-ului
          </p>
        </div>
        <div className="p-6 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Adaugati un cuvant cheie"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="button"
              onClick={handleAddKeyword}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Adauga
            </button>
          </div>
          {localSeo.keywords.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {localSeo.keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                >
                  {keyword}
                  <button
                    onClick={() => handleRemoveKeyword(keyword)}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500">
            Recomandat: 5-10 cuvinte cheie relevante pentru afacerea dvs.
          </p>
        </div>
      </div>

      {/* Social Media Preview */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Imagine Social Media (Open Graph)
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Imaginea care apare cand website-ul este distribuit pe social media
          </p>
        </div>
        <div className="p-6">
          <ImageUploadField
            value={localSeo.ogImage}
            onChange={(url) => handleChange('ogImage', url)}
            hint="Recomandat: imagine 1200x630px pentru afisare optima pe Facebook si Twitter"
            accept="image/jpeg,image/png,image/webp"
            previewClass="max-h-40 object-contain"
          />
        </div>
      </div>

      {/* Canonical URL */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            URL Canonical
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            URL-ul principal al website-ului. Ajuta motoarele de cautare sa evite continutul duplicat.
          </p>
        </div>
        <div className="p-6">
          <input
            type="url"
            value={localSeo.canonicalUrl}
            onChange={(e) => handleChange('canonicalUrl', e.target.value)}
            placeholder="https://www.exemplu.ro"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Robots Meta */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Indexare motoare de cautare
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Controleaza cum interactioneaza motoarele de cautare cu website-ul
          </p>
        </div>
        <div className="p-6 space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={localSeo.robotsIndex}
              onChange={(e) => handleChange('robotsIndex', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">Permite indexarea</span>
              <p className="text-xs text-gray-500">Motoarele de cautare vor include website-ul in rezultate</p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={localSeo.robotsFollow}
              onChange={(e) => handleChange('robotsFollow', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">Permite urmarirea link-urilor</span>
              <p className="text-xs text-gray-500">Motoarele de cautare vor urma link-urile de pe website</p>
            </div>
          </label>
        </div>
      </div>

      {/* Custom Schema.org / JSON-LD */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <Code className="h-5 w-5" />
            Schema.org (Date structurate)
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Adaugati date structurate JSON-LD personalizate pentru a imbunatati aparitia in rezultatele Google (rich snippets)
          </p>
        </div>
        <div className="p-6 space-y-2">
          <textarea
            value={localSeo.customSchema}
            onChange={(e) => handleChange('customSchema', e.target.value)}
            placeholder={'{\n  "@context": "https://schema.org",\n  "@type": "LocalBusiness",\n  "name": "Numele afacerii"\n}'}
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          />
          <p className="text-xs text-gray-500">
            Introduceti un obiect JSON-LD valid. Se adauga automat schema LocalBusiness si FAQPage din continutul paginilor.
          </p>
        </div>
      </div>

      {/* Custom Head Code */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <Code className="h-5 w-5" />
            Cod personalizat (Head)
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Adaugati cod HTML in sectiunea &lt;head&gt; a website-ului (ex: Google Analytics, verificare Search Console, pixeli de tracking)
          </p>
        </div>
        <div className="p-6 space-y-2">
          <textarea
            value={localSeo.customHeadCode}
            onChange={(e) => handleChange('customHeadCode', e.target.value)}
            placeholder={'<!-- Google Analytics -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX"></script>'}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          />
          <p className="text-xs text-gray-500">
            Codul va fi inserat in &lt;head&gt; pe toate paginile website-ului.
          </p>
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

export default SeoSettings;
