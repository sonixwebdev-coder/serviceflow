import { useEffect, useState, useRef } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { useCompanySettings, useUpdateCompanySettings } from '../hooks/useCompanySettings.js';
import useToast from '../context/useToast';
import { exportAllData, downloadFile } from '../services/exportService';
import API from '../utils/api.js';

const fields = [
  { name: 'companyName', label: 'Nume companie', required: true },
  { name: 'legalName', label: 'Denumire legala', placeholder: 'Entitate inregistrata (optional)' },
  { name: 'vatNumber', label: 'CUI', placeholder: 'Cod unic de identificare' },
  { name: 'registrationNumber', label: 'Nr. registru comert', placeholder: 'J40/...' },
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
  const { showToast } = useToast();
  const [formState, setFormState] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isExportingAllData, setIsExportingAllData] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (data) {
      // Ensure TVA fields have default values if not present
      const formData = {
        ...data,
        tvaEnabled: data.tvaEnabled !== undefined ? data.tvaEnabled : false,
        tvaPercentage: data.tvaPercentage !== undefined ? data.tvaPercentage : 19,
      };
      setFormState(formData);
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
      const filename = `viper-export-${new Date().toISOString().split('T')[0]}.zip`;
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
        registrationNumber: formState.registrationNumber,
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
              {fields.map((field) => {
                const commonProps = {
                  id: field.name,
                  name: field.name,
                  className:
                    field.type === 'checkbox'
                      ? 'h-4 w-4 rounded border-gray-300 text-viperx-primary focus:ring-viperx-primary'
                      : 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary',
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
              className="inline-flex items-center gap-2 rounded-lg bg-viperx-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-viperx-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
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
                className="rounded-lg bg-viperx-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-viperx-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
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
