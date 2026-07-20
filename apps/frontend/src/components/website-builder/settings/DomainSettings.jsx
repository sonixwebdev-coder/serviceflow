import { useState } from 'react';
import { Globe, CheckCircle, XCircle, Loader2, ExternalLink, Copy } from 'lucide-react';
import { buildHostedWebsiteUrl, runtimeConfig } from '@/config/runtime';

const DomainSettings = ({
  subdomain = '',
  onSubdomainChange,
  checkingSubdomain = false,
  subdomainAvailable = null,
}) => {
  const [localSubdomain, setLocalSubdomain] = useState(subdomain);
  const [copied, setCopied] = useState(false);

  const handleSubdomainChange = (e) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setLocalSubdomain(value);
    if (value.length >= 3) {
      onSubdomainChange?.(value);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const subdomainUrl = buildHostedWebsiteUrl(localSubdomain);

  return (
    <div className="space-y-6">
      {/* Subdomain */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Adresă {runtimeConfig.platformName}
          </h3>
          <p className="text-sm text-gray-500 mt-1">Adresa gratuita pentru website-ul dvs.</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subdomain</label>
            <div className="flex mt-1">
              <div className="flex max-w-[50%] items-center truncate rounded-l-lg border border-r-0 border-gray-300 bg-gray-100 px-3 text-sm text-gray-600">
                {runtimeConfig.websiteUrl.replace(/^https?:\/\//, '')}/
              </div>
              <input
                type="text"
                value={localSubdomain}
                onChange={handleSubdomainChange}
                placeholder="company"
                className="min-w-0 flex-1 rounded-r-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2 mt-2">
              {checkingSubdomain && (
                <span className="text-sm text-gray-500 flex items-center gap-1">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Se verifica...
                </span>
              )}
              {!checkingSubdomain && subdomainAvailable === true && localSubdomain.length >= 3 && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Disponibil
                </span>
              )}
              {!checkingSubdomain && subdomainAvailable === false && (
                <span className="text-sm text-red-600 flex items-center gap-1">
                  <XCircle className="h-4 w-4" />
                  Nu este disponibil
                </span>
              )}
            </div>
          </div>

          <div className="pt-2">
            <label className="text-sm text-gray-600">Adresa website-ului:</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="px-2 py-1 bg-gray-100 rounded text-sm flex-1">{subdomainUrl}</code>
              <button
                onClick={() => copyToClipboard(subdomainUrl)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                onClick={() => window.open(subdomainUrl, '_blank')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Copy Confirmation */}
      {copied && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg">
          Copiat in clipboard!
        </div>
      )}
    </div>
  );
};

export default DomainSettings;
