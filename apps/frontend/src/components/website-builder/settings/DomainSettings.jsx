import { useState } from 'react';
import {
  Globe,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  Copy,
  AlertTriangle,
} from 'lucide-react';

const DomainSettings = ({
  subdomain = '',
  customDomain = '',
  domainVerified = false,
  onSubdomainChange,
  onCustomDomainChange,
  onVerifyDomain,
  checkingSubdomain = false,
  subdomainAvailable = null,
  isVerifying = false,
  isProfessional = false,
}) => {
  const [localSubdomain, setLocalSubdomain] = useState(subdomain);
  const [localCustomDomain, setLocalCustomDomain] = useState(customDomain || '');
  const [copied, setCopied] = useState(false);

  const handleSubdomainChange = (e) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setLocalSubdomain(value);
    if (value.length >= 3) {
      onSubdomainChange?.(value);
    }
  };

  const handleCustomDomainSubmit = () => {
    onCustomDomainChange?.(localCustomDomain);
  };

  const handleVerify = () => {
    onVerifyDomain?.(localCustomDomain);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const subdomainUrl = `https://${localSubdomain || 'company'}.serviceflow.ro`;
  const cnameTarget = 'websites.serviceflow.ro';

  return (
    <div className="space-y-6">
      {/* Subdomain */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Subdomain ServiceFlow
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Adresa gratuita pentru website-ul dvs.
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subdomain</label>
            <div className="flex mt-1">
              <input
                type="text"
                value={localSubdomain}
                onChange={handleSubdomainChange}
                placeholder="company"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="flex items-center px-3 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-gray-600 text-sm">
                .serviceflow.ro
              </div>
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
              <code className="px-2 py-1 bg-gray-100 rounded text-sm flex-1">
                {subdomainUrl}
              </code>
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

      {/* Custom Domain */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Domeniu personalizat
            </h3>
            {!isProfessional && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                Plan Professional
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Conectati propriul domeniu (ex: www.compania-mea.ro)
          </p>
        </div>
        <div className="p-6 space-y-4">
          {!isProfessional ? (
            <div className="flex gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">Upgrade necesar</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Conectarea unui domeniu personalizat este disponibila incepand cu planul Professional.
                  <button className="text-yellow-800 underline ml-1 hover:no-underline">
                    Upgrade acum
                  </button>
                </p>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Domeniu</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={localCustomDomain}
                    onChange={(e) => setLocalCustomDomain(e.target.value.toLowerCase())}
                    placeholder="www.compania-mea.ro"
                    disabled={!isProfessional}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <button
                    onClick={handleCustomDomainSubmit}
                    disabled={!localCustomDomain}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Salveaza
                  </button>
                </div>
              </div>

              {customDomain && (
                <div className="space-y-4">
                  {/* Verification Status */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Status:</span>
                    {domainVerified ? (
                      <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verificat
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Neverificat
                      </span>
                    )}
                  </div>

                  {/* DNS Instructions */}
                  {!domainVerified && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                      <h4 className="font-medium text-blue-800">Configurare DNS necesara</h4>
                      <p className="text-sm text-blue-700">
                        Adaugati urmatoarea inregistrare CNAME la setarile DNS ale domeniului dvs:
                      </p>
                      <div className="bg-gray-50 rounded-md p-3 text-sm font-mono">
                        <div className="grid grid-cols-3 gap-2">
                          <span className="text-gray-600">Tip:</span>
                          <span className="col-span-2">CNAME</span>
                          <span className="text-gray-600">Nume:</span>
                          <span className="col-span-2">www (sau @)</span>
                          <span className="text-gray-600">Valoare:</span>
                          <span className="col-span-2 flex items-center gap-2">
                            {cnameTarget}
                            <button
                              onClick={() => copyToClipboard(cnameTarget)}
                              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-blue-600">
                        Nota: Propagarea DNS poate dura pana la 48 de ore.
                      </p>
                      <button
                        onClick={handleVerify}
                        disabled={isVerifying}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isVerifying ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Se verifica...
                          </>
                        ) : (
                          'Verifica domeniu'
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
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
