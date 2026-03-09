import { useEffect, useState, useRef } from 'react';
import { Download, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useCompanySettings, useUpdateCompanySettings } from '../hooks/useCompanySettings.js';
import { useTerminology } from '../context/TerminologyContext';
import useToast from '../context/useToast';
import { exportAllData, downloadFile } from '../services/exportService';
import { validateVatNumber } from '../services/settingsService';
import API from '../utils/api.js';

const fields = [
  { name: 'companyName', label: 'Nume companie', required: true },
  { name: 'legalName', label: 'Denumire legala', placeholder: 'Entitate inregistrata (optional)' },
  { name: 'address', label: 'Adresa', component: 'textarea', rows: 3, required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'phone', label: 'Telefon', required: true },
  { name: 'contactPerson', label: 'Persoana de contact', placeholder: 'Punct de contact pentru clienti' },
  { name: 'website', label: 'Website', type: 'url', placeholder: 'https://example.com' },
  { name: 'bankName', label: 'Nume banca', placeholder: 'Institutie financiara (optional)' },
  { name: 'iban', label: 'IBAN', placeholder: 'RO...' },
  { name: 'swift', label: 'SWIFT / BIC', placeholder: 'Cod identificare banca' },
  { name: 'rampCount', label: 'Rampe atelier', type: 'number', placeholder: 'Numar de rampe disponibile' },
  { name: 'tvaEnabled', label: 'TVA activat', type: 'checkbox', description: 'Aplica TVA la facturi (nu se aplica la comenzile de service)' },
  { name: 'tvaPercentage', label: 'Procent TVA', type: 'number', placeholder: '19', min: 0, max: 100, step: 0.01, description: 'Procentul TVA care va fi aplicat la facturi' },
  { name: 'footerNote', label: 'Nota subsol document', component: 'textarea', rows: 3 },
  { name: 'gdprNote', label: 'Notificare GDPR', component: 'textarea', rows: 4, placeholder: 'Explicati cum sunt stocate si procesate datele clientilor.' },
  { name: 'additionalNote', label: 'Informatii aditionale', component: 'textarea', rows: 4, placeholder: 'Orice text suplimentar de inclus pe documentele generate.' },
];

const CompanySettings = () => {
  const { data, isLoading, error } = useCompanySettings();
  const updateMutation = useUpdateCompanySettings();
  const { invoiceSequence: currentInvoiceSequence } = useTerminology();
  const { showToast } = useToast();
  const [formState, setFormState] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isExportingAllData, setIsExportingAllData] = useState(false);
  const fileInputRef = useRef(null);

  const [invoiceSeq, setInvoiceSeq] = useState({
    prefix: 'INV',
    separator: '-',
    includeYear: true,
    paddingDigits: 5,
    startingNumber: 1,
  });
  const [savingInvoiceSeq, setSavingInvoiceSeq] = useState(false);

  // VAT validation state
  const [vatValidation, setVatValidation] = useState({ status: 'idle', message: '', data: null });

  const handleVerifyVat = async () => {
    const vat = formState.vatNumber?.trim();
    if (!vat) return;
    setVatValidation({ status: 'loading', message: '', data: null });
    try {
      const result = await validateVatNumber(vat);
      setVatValidation({ status: 'valid', message: `CUI valid — ${result.name}`, data: result });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Eroare la verificare';
      setVatValidation({ status: 'invalid', message: msg, data: null });
    }
  };

  const handleApplyViesData = () => {
    if (!vatValidation.data) return;
    if (vatValidation.data.name) handleChange('legalName', vatValidation.data.name);
    if (vatValidation.data.address) handleChange('address', vatValidation.data.address);
  };

  useEffect(() => {
    if (data) {
      // Ensure TVA fields have default values if not present
      const formData = {
        ...data,
        tvaEnabled: data.tvaEnabled !== undefined ? data.tvaEnabled : false,
        tvaPercentage: data.tvaPercentage !== undefined ? data.tvaPercentage : 19,
      };
      setFormState(formData);
      if (data.invoiceSequence) {
        setInvoiceSeq({
          prefix: data.invoiceSequence.prefix || 'INV',
          separator: data.invoiceSequence.separator !== undefined ? data.invoiceSequence.separator : '-',
          includeYear: data.invoiceSequence.includeYear !== false,
          paddingDigits: data.invoiceSequence.paddingDigits || 5,
          startingNumber: data.invoiceSequence.startingNumber || 1,
        });
      }
      // Convert relative logo URL to absolute URL for preview
      if (data.logoUrl) {
        const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
        setLogoPreview(`${baseUrl}${data.logoUrl}`);
      } else {
        setLogoPreview(null);
      }
      setIsDirty(false);
    }
  }, [data]);

  useEffect(() => {
    if (error) {
      showToast({
        title: 'Nu s-au putut incarca setarile',
        description: error.message || 'Te rugam sa incerci din nou.',
        type: 'error',
      });
    }
  }, [error, showToast]);

  const handleChange = (name, value) => {
    setFormState((prev) => ({ ...prev, [name]: value }));
    setIsDirty(true);
  };

  const handleLogoSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast({
        title: 'Format invalid',
        description: 'Te rugam sa selectezi o imagine (PNG, JPG, SVG)',
        type: 'error',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast({
        title: 'Fisier prea mare',
        description: 'Logo-ul nu poate depasi 5MB',
        type: 'error',
      });
      return;
    }

    setLogoFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target?.result);
    };
    reader.readAsDataURL(file);
    setIsDirty(true);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setFormState((prev) => ({ ...prev, logoUrl: null }));
    setIsDirty(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExportAllData = async () => {
    setIsExportingAllData(true);

    try {
      const blob = await exportAllData();
      const filename = `forjait-export-${new Date().toISOString().split('T')[0]}.zip`;
      downloadFile(blob, filename);

      showToast({
        title: 'Export complet',
        description: 'Toate datele au fost descarcate cu succes.',
        type: 'success',
      });
    } catch (error) {
      console.error('Export all data error:', error);

      let errorMessage = 'Nu s-au putut exporta datele.';

      if (error.message?.includes('Network')) {
        errorMessage = 'Eroare de retea. Verifica conexiunea.';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Timpul de asteptare a expirat. Incearca din nou.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      showToast({
        title: 'Eroare la export',
        description: errorMessage,
        type: 'error',
      });
    } finally {
      setIsExportingAllData(false);
    }
  };

  useEffect(() => {
    if (currentInvoiceSequence) {
      setInvoiceSeq({
        prefix: currentInvoiceSequence.prefix || 'INV',
        separator: currentInvoiceSequence.separator !== undefined ? currentInvoiceSequence.separator : '-',
        includeYear: currentInvoiceSequence.includeYear !== false,
        paddingDigits: currentInvoiceSequence.paddingDigits || 5,
        startingNumber: currentInvoiceSequence.startingNumber || 1,
      });
    }
  }, [currentInvoiceSequence]);

  const getInvoicePreview = (seq, sampleNum = 1) => {
    const prefix = (seq.prefix || 'INV').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'INV';
    const sep = seq.separator !== undefined ? seq.separator : '-';
    const pad = Math.max(3, Math.min(10, Number(seq.paddingDigits) || 5));
    const year = new Date().getFullYear();
    const num = String(Number(seq.startingNumber) || 1).padStart(pad, '0');
    if (seq.includeYear !== false) {
      return sep ? `${prefix}${sep}${year}${sep}${num}` : `${prefix}${year}${num}`;
    }
    return sep ? `${prefix}${sep}${num}` : `${prefix}${num}`;
  };

  const saveInvoiceSeq = async () => {
    setSavingInvoiceSeq(true);
    try {
      await API.patch('/organizations/me/settings/invoiceSequence', {
        prefix: invoiceSeq.prefix,
        separator: invoiceSeq.separator,
        includeYear: invoiceSeq.includeYear,
        paddingDigits: Number(invoiceSeq.paddingDigits),
        startingNumber: Number(invoiceSeq.startingNumber),
      });
      showToast({ title: 'Numerotare facturi salvata', type: 'success' });
    } catch (err) {
      showToast({
        title: 'Eroare',
        description: err.response?.data?.message || 'Nu s-a putut salva configuratia',
        type: 'error',
      });
    } finally {
      setSavingInvoiceSeq(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      let logoUrl = formState.logoUrl;

      // Upload logo if a new file was selected
      if (logoFile) {
        setIsUploadingLogo(true);
        const formData = new FormData();
        formData.append('logo', logoFile);

        try {
          const uploadResponse = await API.post('/settings/company/logo', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
          logoUrl = uploadResponse.data?.data?.logoUrl || uploadResponse.data?.logoUrl;
        } catch (uploadError) {
          showToast({
            title: 'Eroare la incarcarea logo-ului',
            description: uploadError?.response?.data?.message || 'Te rugam sa incerci din nou.',
            type: 'error',
          });
          setIsUploadingLogo(false);
          return;
        } finally {
          setIsUploadingLogo(false);
        }
      }

      // Build payload with explicit type conversions
      const payload = {
        companyName: formState.companyName,
        legalName: formState.legalName,
        address: formState.address,
        email: formState.email,
        phone: formState.phone,
        website: formState.website,
        logoUrl: logoUrl,
        vatNumber: formState.vatNumber,
        cnp: formState.entityType === 'PFA' ? (formState.cnp || '') : '',
        registrationNumber: formState.entityType === 'PFA' ? '' : (formState.registrationNumber || ''),
        bankName: formState.bankName,
        iban: formState.iban,
        swift: formState.swift,
        contactPerson: formState.contactPerson,
        footerNote: formState.footerNote,
        gdprNote: formState.gdprNote,
        additionalNote: formState.additionalNote,
        rampCount: formState.rampCount ? Number(formState.rampCount) : 4,
        tvaEnabled: formState.tvaEnabled === true || formState.tvaEnabled === 'true',
        tvaPercentage: formState.tvaPercentage ? Number(formState.tvaPercentage) : 19,
      };

      await updateMutation.mutateAsync(payload);
      showToast({ title: 'Setari salvate cu succes', type: 'success' });
      setIsDirty(false);
      setLogoFile(null);
    } catch (mutationError) {
      showToast({
        title: 'Eroare la salvarea setarilor',
        description: mutationError?.message || 'Te rugam sa incerci din nou.',
        type: 'error',
      });
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Setari companie</h1>
          <p className="text-gray-600 mt-2">
            Aceste detalii apar pe PDF-urile generate si comunicari. Pastreaza-le actualizate.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-gray-100 bg-white p-6 text-sm text-gray-500 shadow-sm">
          Se incarca profilul companiei...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="">
          {/* Logo Upload Section */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Logo companie</h2>
            <div className="flex items-start gap-6">
              {/* Logo Preview */}
              <div className="flex-shrink-0">
                {logoPreview ? (
                  <div className="relative">
                    <div className="h-32 w-32 overflow-hidden rounded-lg border-2 border-gray-200 bg-gray-50">
                      <img
                        src={logoPreview}
                        alt="Company logo"
                        className="h-full w-full object-contain p-2"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white shadow-lg hover:bg-red-600 transition"
                      title="Sterge logo"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="h-32 w-32 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
                    <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Upload Button */}
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  {logoPreview ? 'Schimba logo-ul' : 'Incarca logo'}
                </button>
                <p className="mt-2 text-xs text-gray-500">
                  PNG, JPG sau SVG. Max 5MB. Se recomanda dimensiuni de 500x500px pentru o calitate optima.
                </p>
              </div>
            </div>
          </div>

          {/* Company Details Section */}
          <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Detalii companie</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

              {/* Entity Type (read-only, set during onboarding) */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Tip entitate juridica</label>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-800">
                    {formState.entityType || 'SRL'}
                  </span>
                  <span className="text-xs text-gray-400">Setat la inregistrare</span>
                </div>
              </div>

              {/* Conditional fiscal fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {(formState.entityType || 'SRL') === 'PFA' ? 'NIF / CIF (optional)' : 'CUI'}
                </label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={formState.vatNumber ?? ''}
                    onChange={(e) => {
                      handleChange('vatNumber', e.target.value);
                      setVatValidation({ status: 'idle', message: '', data: null });
                    }}
                    placeholder={(formState.entityType || 'SRL') === 'PFA' ? 'Numar de identificare fiscala' : 'Cod unic de identificare'}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyVat}
                    disabled={!formState.vatNumber?.trim() || vatValidation.status === 'loading'}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium whitespace-nowrap transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {vatValidation.status === 'loading' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : 'Verifica'}
                  </button>
                </div>
                {vatValidation.status === 'valid' && (
                  <div className="mt-2">
                    <div className="flex items-center gap-1.5 text-green-600 text-sm">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{vatValidation.message}</span>
                    </div>
                    {vatValidation.data?.name && (
                      <button
                        type="button"
                        onClick={handleApplyViesData}
                        className="mt-1 text-xs text-primary hover:underline"
                      >
                        Completeaza automat denumirea legala si adresa
                      </button>
                    )}
                  </div>
                )}
                {vatValidation.status === 'invalid' && (
                  <div className="flex items-center gap-1.5 mt-2 text-red-600 text-sm">
                    <XCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{vatValidation.message}</span>
                  </div>
                )}
              </div>

              {(formState.entityType || 'SRL') === 'SRL' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nr. registru comert</label>
                  <input
                    type="text"
                    value={formState.registrationNumber ?? ''}
                    onChange={(e) => handleChange('registrationNumber', e.target.value)}
                    placeholder="J40/..."
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700">CNP</label>
                  <input
                    type="text"
                    value={formState.cnp ?? ''}
                    onChange={(e) => handleChange('cnp', e.target.value)}
                    placeholder="Cod numeric personal (13 cifre)"
                    maxLength={13}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}

              {fields.map((field) => {
                const commonProps = {
                  id: field.name,
                  name: field.name,
                  className:
                    field.type === 'checkbox'
                      ? 'h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary'
                      : 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
                };

                if (field.type === 'checkbox') {
                  return (
                    <div key={field.name} className="md:col-span-2">
                      <div className="flex items-start">
                        <div className="flex h-5 items-center">
                          <input
                            {...commonProps}
                            type="checkbox"
                            checked={formState[field.name] === true || formState[field.name] === 'true'}
                            onChange={(e) => handleChange(field.name, e.target.checked)}
                          />
                        </div>
                        <div className="ml-3">
                          <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
                            {field.label}
                            {field.required && <span className="ml-1 text-red-500">*</span>}
                          </label>
                          {field.description && (
                            <p className="text-xs text-gray-500 mt-1">{field.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={field.name} className={field.component === 'textarea' ? 'md:col-span-2' : undefined}>
                    <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
                      {field.label}
                      {field.required && <span className="ml-1 text-red-500">*</span>}
                    </label>
                    {field.component === 'textarea' ? (
                      <textarea
                        {...commonProps}
                        value={formState[field.name] ?? ''}
                        onChange={(event) => handleChange(field.name, event.target.value)}
                        rows={field.rows || 3}
                        placeholder={field.placeholder}
                      />
                    ) : (
                      <input
                        {...commonProps}
                        type={field.type || 'text'}
                        value={formState[field.name] ?? ''}
                        onChange={(event) => handleChange(field.name, event.target.value)}
                        placeholder={field.placeholder}
                        min={field.min}
                        max={field.max}
                        step={field.step}
                      />
                    )}
                    {field.description && !field.component && (
                      <p className="text-xs text-gray-500 mt-1">{field.description}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Invoice Numbering Section */}
          <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Numerotare facturi</h2>
            <p className="text-sm text-gray-500 mb-4">
              Configureaza formatul numerelor de factura. Util daca ai emis deja facturi si vrei sa continui de unde ai ramas.
            </p>

            {/* Preview */}
            <div className="mb-5 p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center gap-3">
              <span className="text-xs text-gray-500">Urmatoarea factura va fi:</span>
              <span className="font-mono font-semibold text-primary text-sm">{getInvoicePreview(invoiceSeq)}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Prefix */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prefix</label>
                <input
                  type="text"
                  value={invoiceSeq.prefix}
                  onChange={e => setInvoiceSeq(prev => ({ ...prev, prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))}
                  maxLength={10}
                  placeholder="INV"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Separator */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Separator</label>
                <select
                  value={invoiceSeq.separator}
                  onChange={e => setInvoiceSeq(prev => ({ ...prev, separator: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="-">Linie ( - )</option>
                  <option value="/">Slash ( / )</option>
                  <option value="_">Underscore ( _ )</option>
                  <option value="">Niciun separator</option>
                </select>
              </div>

              {/* Padding */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cifre numar secventa</label>
                <select
                  value={invoiceSeq.paddingDigits}
                  onChange={e => setInvoiceSeq(prev => ({ ...prev, paddingDigits: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {[3, 4, 5, 6, 7, 8].map(n => (
                    <option key={n} value={n}>{n} cifre (ex: {'0'.repeat(n - 1)}1)</option>
                  ))}
                </select>
              </div>

              {/* Include year */}
              <div className="flex items-center gap-3 pt-6">
                <input
                  type="checkbox"
                  id="includeYear"
                  checked={invoiceSeq.includeYear !== false}
                  onChange={e => setInvoiceSeq(prev => ({ ...prev, includeYear: e.target.checked }))}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="includeYear" className="text-sm font-medium text-gray-700">Include anul in numar</label>
              </div>

              {/* Starting number */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numarul de start pentru {new Date().getFullYear()}
                </label>
                <input
                  type="number"
                  min={1}
                  value={invoiceSeq.startingNumber}
                  onChange={e => setInvoiceSeq(prev => ({ ...prev, startingNumber: Math.max(1, Number(e.target.value)) }))}
                  className="w-full md:w-1/3 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Daca ai deja 50 de facturi emise in alt sistem, seteaza 51 pentru a continua de acolo. Se aplica pentru anul {new Date().getFullYear()}.
                </p>
              </div>
            </div>

            <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={saveInvoiceSeq}
                disabled={savingInvoiceSeq}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors"
              >
                {savingInvoiceSeq ? 'Se salveaza...' : 'Salveaza numerotarea'}
              </button>
            </div>
          </div>

          {/* Export All Data Section */}
          <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Exporta toate datele
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Descarca toate datele platformei intr-un singur fisier ZIP
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportAllData}
              disabled={isExportingAllData}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isExportingAllData ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Se genereaza...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Descarca toate datele
                </>
              )}
            </button>

            <p className="mt-3 text-xs text-gray-500">
              Fisierul va contine toate programarile, facturile, clientii, angajatii si alte date in format CSV.
            </p>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {isDirty ? 'Ai modificari nesalvate.' : 'Toate modificarile sunt salvate.'}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={!isDirty || updateMutation.isPending || isUploadingLogo}
                onClick={() => {
                  setFormState(data || {});
                  setLogoFile(null);
                  // Convert relative logo URL to absolute URL for preview
                  if (data?.logoUrl) {
                    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
                    setLogoPreview(`${baseUrl}${data.logoUrl}`);
                  } else {
                    setLogoPreview(null);
                  }
                  setIsDirty(false);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reseteaza
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending || isUploadingLogo || !isDirty}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUploadingLogo ? 'Se incarca logo-ul...' : updateMutation.isPending ? 'Se salveaza...' : 'Salveaza setarile'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default CompanySettings;
