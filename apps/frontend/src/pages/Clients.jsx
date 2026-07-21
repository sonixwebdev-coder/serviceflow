import { useState, useEffect } from 'react';
import confirm from '../utils/confirm';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  X,
  Eye,
  Car,
  Calendar,
  FileText,
  Phone,
  Mail,
  Building2,
  User,
  Hash,
  CreditCard,
  Edit2,
  Save,
  Plus,
  Trash2,
  Upload,
  Download,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import roDateLocale from 'date-fns/locale/ro';
import { useClients } from '../hooks/useClients.js';
import ExportButton from '../components/ExportButton.jsx';
import Pagination from '../components/Pagination.jsx';
import API from '../utils/api.js';
import useToast from '../context/useToast.js';
import { useTerminology } from '../context/TerminologyContext';
import DatePicker from '../components/ui/DatePicker';
import LocationBadge from '../components/LocationBadge';
import { useClientLoyalty } from '../hooks/useLoyalty';
import TierBadge from '../components/loyalty/TierBadge';
import ProgressToNextTier from '../components/loyalty/ProgressToNextTier';
import AdjustPointsDialog from '../components/loyalty/AdjustPointsDialog';

const formatDateTime = (value) => {
  if (!value) return '-';
  try {
    return format(new Date(value), 'dd MMM yyyy HH:mm', { locale: roDateLocale });
  } catch {
    return '-';
  }
};

function ClientLoyaltySection({ clientId }) {
  const { data: loyaltyData, isLoading } = useClientLoyalty(clientId);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const account = loyaltyData?.data || loyaltyData;
  if (isLoading || !account) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <CreditCard size={18} className="text-indigo-600" />
          Fidelitate
        </h3>
        <button
          onClick={() => setAdjustOpen(true)}
          className="inline-flex items-center gap-1 rounded-lg border border-indigo-500 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
        >
          <Edit2 size={14} />
          Ajusteaza puncte
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="text-xs font-medium text-gray-500">Nivel</label>
          <div className="mt-1">
            <TierBadge tier={account.currentTier} size="lg" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">Puncte curente</label>
          <p className="text-lg font-bold text-indigo-600 mt-1">{account.currentPoints}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">Puncte lifetime</label>
          <p className="text-lg font-bold text-gray-900 mt-1">{account.lifetimePoints}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">Vizite completate</label>
          <p className="text-lg font-bold text-gray-900 mt-1">{account.completedVisits}</p>
        </div>
      </div>
      {account.program && (
        <ProgressToNextTier
          currentTier={account.currentTier}
          lifetimePoints={account.lifetimePoints}
          thresholds={account.program}
        />
      )}
      {account.referralCode && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <label className="text-xs font-medium text-gray-500">Cod referral</label>
          <p className="text-sm font-mono text-gray-900 mt-0.5">{account.referralCode}</p>
        </div>
      )}
      {adjustOpen && (
        <AdjustPointsDialog clientId={clientId} onClose={() => setAdjustOpen(false)} />
      )}
    </div>
  );
}

const STATUS_META = {
  PENDING: { label: 'In asteptare', class: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
  APPROVED: { label: 'Aprobata', class: 'bg-blue-50 text-blue-800 border-blue-200' },
  IN_PROGRESS: { label: 'In lucru', class: 'bg-amber-50 text-amber-800 border-amber-200' },
  COMPLETED: { label: 'Finalizata', class: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  CANCELLED: { label: 'Anulata', class: 'bg-red-50 text-red-800 border-red-200' },
};

const getStatusMeta = (status) => {
  const normalized = status?.toString().toUpperCase().replace(/-/g, '_');
  return (
    STATUS_META[normalized] || { label: status, class: 'bg-gray-50 text-gray-800 border-gray-200' }
  );
};

const fetchClientDetails = async (clientId) => {
  const response = await API.get(`/clients/${clientId}`);
  return response.data?.data || response.data;
};

const PAGE_SIZE = 20;

const Clients = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search');
  const [search, setSearch] = useState(initialSearch || '');
  const [currentPage, setCurrentPage] = useState(1);

  // Clear search param from URL after reading it (optional: keep URL clean)
  useEffect(() => {
    if (initialSearch) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('search');
      setSearchParams(nextParams, { replace: true });
    }
  }, [initialSearch, searchParams, setSearchParams]);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editingAssetId, setEditingAssetId] = useState(null);
  const [assetForm, setAssetForm] = useState({});
  const [isAddingAsset, setIsAddingAsset] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const {
    assetSingular,
    assetPlural,
    assetIdentifier,
    features,
    assetType: sectorAssetType,
  } = useTerminology();
  const hasAssets = features?.useAssets !== false; // Default to true if undefined

  const { data, isLoading, isFetching } = useClients({
    search: search || undefined,
    page: currentPage,
    limit: PAGE_SIZE,
  });

  // Reset to page 1 when search changes
  const handleSearchChange = (value) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const { data: selectedClient, isLoading: clientLoading } = useQuery({
    queryKey: ['client', selectedClientId],
    queryFn: () => fetchClientDetails(selectedClientId),
    enabled: Boolean(selectedClientId),
  });

  const clients = data?.items || [];
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 };

  const updateClientMutation = useMutation({
    mutationFn: async ({ clientId, data }) => {
      const response = await API.patch(`/clients/${clientId}`, data);
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client', selectedClientId] });
      setIsEditing(false);
      showToast({ title: 'Client actualizat cu succes', type: 'success' });
    },
    onError: (error) => {
      showToast({
        title: 'Eroare la actualizare',
        description: error?.response?.data?.message || error.message,
        type: 'error',
      });
    },
  });

  const updateAssetMutation = useMutation({
    mutationFn: async ({ assetId, data }) => {
      const response = await API.patch(`/assets/${assetId}`, data);
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', selectedClientId] });
      setEditingAssetId(null);
      setAssetForm({});
      showToast({ title: `${assetSingular} actualizat cu succes`, type: 'success' });
    },
    onError: (error) => {
      showToast({
        title: `Eroare la actualizare ${assetSingular.toLowerCase()}`,
        description: error?.response?.data?.message || error.message,
        type: 'error',
      });
    },
  });

  const addAssetMutation = useMutation({
    mutationFn: async ({ clientId, data }) => {
      const response = await API.post(`/assets`, { ...data, clientId });
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', selectedClientId] });
      setIsAddingAsset(false);
      setAssetForm({});
      showToast({ title: `${assetSingular} adaugat cu succes`, type: 'success' });
    },
    onError: (error) => {
      showToast({
        title: `Eroare la adaugare ${assetSingular.toLowerCase()}`,
        description: error?.response?.data?.message || error.message,
        type: 'error',
      });
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async ({ assetId }) => {
      await API.delete(`/assets/${assetId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', selectedClientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      showToast({ title: `${assetSingular} sters cu succes`, type: 'success' });
    },
    onError: (error) => {
      showToast({
        title: `Eroare la stergere ${assetSingular.toLowerCase()}`,
        description: error?.response?.data?.message || error.message,
        type: 'error',
      });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (clientId) => {
      await API.delete(`/clients/${clientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      showToast({ title: 'Client sters cu succes', type: 'success' });
    },
    onError: (error) => {
      showToast({
        title: 'Eroare la stergere client',
        description: error?.response?.data?.message || error.message,
        type: 'error',
      });
    },
  });

  const closeDrawer = () => {
    setSelectedClientId(null);
    setIsEditing(false);
    setEditForm({});
    setEditingAssetId(null);
    setAssetForm({});
    setIsAddingAsset(false);
  };

  const startEditing = () => {
    setEditForm({
      type: selectedClient.type || 'PF',
      firstName: selectedClient.firstName || '',
      lastName: selectedClient.lastName || '',
      companyName: selectedClient.companyName || '',
      contactName: selectedClient.contactName || '',
      phone: selectedClient.phone || '',
      email: selectedClient.email || '',
      vatNumber: selectedClient.vatNumber || '',
      registrationNumber: selectedClient.registrationNumber || '',
      address: selectedClient.address || '',
      fidelityCardSerie: selectedClient.fidelityCardSerie || '',
      notes: selectedClient.notes || '',
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    // Filter out empty strings to avoid validation errors
    const cleanedData = Object.entries(editForm).reduce((acc, [key, value]) => {
      if (typeof value === 'string' && value.trim() === '') {
        return acc; // Skip empty strings
      }
      acc[key] = value;
      return acc;
    }, {});

    updateClientMutation.mutate({
      clientId: selectedClientId,
      data: cleanedData,
    });
  };

  const handleInputChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const startEditingAsset = (asset) => {
    setAssetForm({
      name: asset.name || '',
      type: asset.type || sectorAssetType,
      manufacturer: asset.manufacturer || '',
      model: asset.model || '',
      year: asset.year || '',
      identifier: asset.identifier || '',
      metadata: {
        ...(asset.metadata || {}),
        // Ensure common metadata fields are accessible
        vin: asset.metadata?.vin || '',
        color: asset.metadata?.color || '',
        odometerKm: asset.metadata?.odometerKm || '',
        fuelType: asset.metadata?.fuelType || '',
        category: asset.metadata?.category || '',
        warrantyExpiry: asset.metadata?.warrantyExpiry || '',
        unitType: asset.metadata?.unitType || '',
        capacity: asset.metadata?.capacity || '',
        refrigerant: asset.metadata?.refrigerant || '',
        installationDate: asset.metadata?.installationDate || '',
        equipmentCategory: asset.metadata?.equipmentCategory || '',
        location: asset.metadata?.location || '',
      },
    });
    setEditingAssetId(asset.id);
  };

  const startAddingAsset = () => {
    setAssetForm({
      name: '',
      type: sectorAssetType,
      manufacturer: '',
      model: '',
      year: '',
      identifier: '',
      metadata: {},
    });
    setIsAddingAsset(true);
  };

  const handleAssetInputChange = (field, value) => {
    setAssetForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAssetMetadataChange = (field, value) => {
    setAssetForm((prev) => ({
      ...prev,
      metadata: { ...(prev.metadata || {}), [field]: value },
    }));
  };

  const handleSaveAsset = () => {
    if (isAddingAsset) {
      addAssetMutation.mutate({
        clientId: selectedClientId,
        data: assetForm,
      });
    } else if (editingAssetId) {
      updateAssetMutation.mutate({
        assetId: editingAssetId,
        data: assetForm,
      });
    }
  };

  const handleDeleteAsset = async (assetId) => {
    if (
      await confirm({
        title: 'Sterge',
        text: `Sigur doresti sa stergi acest ${assetSingular.toLowerCase()}?`,
        confirmText: 'Sterge',
        danger: true,
      })
    ) {
      deleteAssetMutation.mutate({
        assetId,
      });
    }
  };

  const cancelAssetEdit = () => {
    setEditingAssetId(null);
    setIsAddingAsset(false);
    setAssetForm({});
  };

  const handleDeleteClient = async (clientId, clientName) => {
    if (
      await confirm({
        title: 'Sterge client',
        text: `Sigur doresti sa stergi clientul "${clientName}"? Aceasta actiune nu poate fi anulata.`,
        confirmText: 'Sterge',
        danger: true,
      })
    ) {
      deleteClientMutation.mutate(clientId);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await API.get('/clients/import/template', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'template_import_clienti.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showToast({ title: 'Template descarcat', type: 'success' });
    } catch (error) {
      showToast({
        title: 'Eroare la descarcarea template-ului',
        description: error?.response?.data?.message || error.message,
        type: 'error',
      });
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        showToast({
          title: 'Fisier invalid',
          description: 'Te rugam sa selectezi un fisier CSV',
          type: 'error',
        });
        return;
      }
      setSelectedFile(file);
      setImportResults(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setIsImporting(true);
    setImportResults(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Import as offline clients (isOnline=false)
      const response = await API.post('/clients/import?isOnline=false', formData);

      const results = response.data?.data || response.data;
      setImportResults(results);
      queryClient.invalidateQueries({ queryKey: ['clients'] });

      showToast({
        title: 'Import finalizat',
        description: `${results.successful} clienti adaugati cu succes`,
        type: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Eroare la import',
        description: error?.response?.data?.message || error.message,
        type: 'error',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const closeImportModal = () => {
    setIsImportModalOpen(false);
    setSelectedFile(null);
    setImportResults(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header">
          <h1 className="page-title">Clienti</h1>
          <p className="page-subtitle">
            Gestioneaza profilurile clientilor, informatii de contact si istoric servicii.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-xs hover:bg-gray-50 hover:shadow-md transition-all"
          >
            <Upload size={16} />
            Importa CSV
          </button>
          <ExportButton
            entityType="clients"
            filters={{
              search,
              isOnline: false,
            }}
          />
        </div>
      </div>

      {/* Search Filter */}
      <div className="filter-bar">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Cauta dupa nume, companie, email, telefon sau card fidelitate..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        {search && (
          <button
            type="button"
            onClick={() => handleSearchChange('')}
            className="text-sm text-gray-500 hover:text-primary transition-colors flex items-center gap-1"
          >
            <X size={14} />
            Sterge cautarea
          </button>
        )}
      </div>

      <div
        className={`bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden transition-opacity ${isFetching && !isLoading ? 'opacity-70' : ''}`}
      >
        <div className="hidden lg:block">
          <div
            className={`grid gap-4 px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100 bg-gray-50/50 ${hasAssets ? 'grid-cols-7' : 'grid-cols-6'}`}
          >
            <span>Client</span>
            <span>Email</span>
            <span>Telefon</span>
            <span>Companie</span>
            <span>Card fidelitate</span>
            {hasAssets && <span>{assetPlural}</span>}
            <span>Actiuni</span>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          ) : clients.length === 0 ? (
            <div className="empty-state">
              <User className="empty-state-icon" />
              <p className="empty-state-title">
                {search ? 'Niciun client gasit' : 'Nu exista clienti inca'}
              </p>
              <p className="empty-state-text">
                {search
                  ? 'Incearca o alta cautare.'
                  : 'Clientii vor aparea aici dupa ce ii adaugi.'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className={`grid gap-4 px-6 py-4 text-sm text-gray-700 hover:bg-gray-50 transition-colors ${hasAssets ? 'grid-cols-7' : 'grid-cols-6'}`}
                >
                  <div className="font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <span>
                        {client.type === 'SRL'
                          ? client.companyName || 'Client companie'
                          : `${client.firstName || ''} ${client.lastName || ''}`.trim() ||
                            client.contactName ||
                            '-'}
                      </span>
                      <LocationBadge locationId={client.locationId} size="xs" />
                    </div>
                    {client.type === 'SRL' && client.contactName ? (
                      <p className="text-xs text-gray-500">Contact: {client.contactName}</p>
                    ) : null}
                  </div>
                  <div>{client.email || '-'}</div>
                  <div>{client.phone || '-'}</div>
                  <div>{client.companyName || <span className="text-gray-400">PF</span>}</div>
                  <div>
                    {client.fidelityCardSerie ? (
                      <div className="flex items-center gap-1 text-sm">
                        <CreditCard className="h-4 w-4 text-gray-400" />
                        <span>{client.fidelityCardSerie}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>
                  {hasAssets && <div>{client.assets?.length || 0}</div>}
                  <div>
                    <button
                      type="button"
                      onClick={() => setSelectedClientId(client.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Eye size={14} />
                      Vezi detalii
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:hidden">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          ) : clients.length === 0 ? (
            <div className="empty-state">
              <User className="empty-state-icon" />
              <p className="empty-state-title">
                {search ? 'Niciun client gasit' : 'Nu exista clienti inca'}
              </p>
              <p className="empty-state-text">
                {search
                  ? 'Incearca o alta cautare.'
                  : 'Clientii vor aparea aici dupa ce ii adaugi.'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {clients.map((client) => (
                <div key={client.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">
                          {client.type === 'SRL'
                            ? client.companyName || 'Client companie'
                            : `${client.firstName || ''} ${client.lastName || ''}`.trim() ||
                              client.contactName ||
                              '-'}
                        </p>
                        <LocationBadge locationId={client.locationId} size="xs" />
                      </div>
                      {client.type === 'SRL' && client.contactName && (
                        <p className="text-xs text-gray-500 mt-1">Contact: {client.contactName}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                      {client.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail size={14} className="text-gray-400" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone size={14} className="text-gray-400" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                      {client.fidelityCardSerie && (
                        <div className="flex items-center gap-1.5">
                          <CreditCard size={14} className="text-gray-400" />
                          <span>{client.fidelityCardSerie}</span>
                        </div>
                      )}
                      {hasAssets && (
                        <div className="flex items-center gap-1.5">
                          <Car size={14} className="text-gray-400" />
                          <span>
                            {client.assets?.length || 0} {assetPlural.toLowerCase()}
                          </span>
                        </div>
                      )}
                      {client.companyName && client.type === 'PF' && (
                        <div className="flex items-center gap-1.5">
                          <Building2 size={14} className="text-gray-400" />
                          <span className="truncate">{client.companyName}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedClientId(client.id)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Eye size={16} />
                        Vezi detalii
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const clientName =
                            client.type === 'SRL'
                              ? client.companyName || 'Client companie'
                              : `${client.firstName || ''} ${client.lastName || ''}`.trim() ||
                                client.contactName ||
                                'Client';
                          handleDeleteClient(client.id, clientName);
                        }}
                        disabled={deleteClientMutation.isPending}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        title="Sterge client"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.pages}
              totalItems={pagination.total}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Client Details Drawer */}
      {selectedClientId && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ margin: 0 }}>
          <div className="flex-1 bg-gray-900/40" onClick={closeDrawer} />
          <aside className="flex h-screen w-full sm:max-w-3xl flex-col bg-white shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 bg-white">
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                  {isEditing ? 'Editeaza Client' : 'Detalii Client'}
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">
                  {isEditing
                    ? 'Modifica informatiile clientului'
                    : 'Informatii complete despre client'}
                </p>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-2">
                {!isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={startEditing}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 sm:px-4 py-1.5 sm:py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Edit2 size={16} />
                      <span className="hidden sm:inline">Editeaza</span>
                    </button>
                    <button
                      type="button"
                      onClick={closeDrawer}
                      className="rounded-lg border border-gray-200 p-1.5 sm:p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                    >
                      <X size={18} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={updateClientMutation.isPending}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2 sm:px-4 py-1.5 sm:py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save size={16} />
                      <span className="hidden sm:inline">
                        {updateClientMutation.isPending ? 'Se salveaza...' : 'Salveaza'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      disabled={updateClientMutation.isPending}
                      className="rounded-lg border border-gray-200 px-2 sm:px-4 py-1.5 sm:py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      <span className="hidden sm:inline">Anuleaza</span>
                      <X size={14} className="sm:hidden" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {clientLoading ? (
                <div className="flex justify-center py-12">
                  <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
                </div>
              ) : selectedClient ? (
                <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                  {isEditing ? (
                    /* Edit Form */
                    <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
                      <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900 mb-4">
                        <User size={18} className="text-primary" />
                        Editeaza Informatii Client
                      </h3>

                      {/* Client Type Selector */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tip client
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="PF"
                              checked={editForm.type === 'PF'}
                              onChange={(e) => handleInputChange('type', e.target.value)}
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-700">Persoana Fizica</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="SRL"
                              checked={editForm.type === 'SRL'}
                              onChange={(e) => handleInputChange('type', e.target.value)}
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-700">Companie (SRL)</span>
                          </label>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        {editForm.type === 'SRL' ? (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nume Companie *
                              </label>
                              <input
                                type="text"
                                value={editForm.companyName}
                                onChange={(e) => handleInputChange('companyName', e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Persoana de contact
                              </label>
                              <input
                                type="text"
                                value={editForm.contactName}
                                onChange={(e) => handleInputChange('contactName', e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                CUI
                              </label>
                              <input
                                type="text"
                                value={editForm.vatNumber}
                                onChange={(e) => handleInputChange('vatNumber', e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nr. Reg. Com.
                              </label>
                              <input
                                type="text"
                                value={editForm.registrationNumber}
                                onChange={(e) =>
                                  handleInputChange('registrationNumber', e.target.value)
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Prenume *
                              </label>
                              <input
                                type="text"
                                value={editForm.firstName}
                                onChange={(e) => handleInputChange('firstName', e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nume *
                              </label>
                              <input
                                type="text"
                                value={editForm.lastName}
                                onChange={(e) => handleInputChange('lastName', e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                                required
                              />
                            </div>
                          </>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                          </label>
                          <input
                            type="email"
                            value={editForm.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Telefon
                          </label>
                          <input
                            type="tel"
                            value={editForm.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Adresa
                          </label>
                          <input
                            type="text"
                            value={editForm.address}
                            onChange={(e) => handleInputChange('address', e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Card fidelitate
                          </label>
                          <input
                            type="text"
                            value={editForm.fidelityCardSerie}
                            onChange={(e) => handleInputChange('fidelityCardSerie', e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                            placeholder="Serie card fidelitate"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={editForm.isOnline || false}
                              onChange={(e) => handleInputChange('isOnline', e.target.checked)}
                              className="h-4 w-4 rounded-sm border-gray-300 text-primary focus:ring-primary"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              Client online (disponibil si in magazin fizic)
                            </span>
                          </label>
                          <p className="text-xs text-gray-500 mt-1 ml-6">
                            Clientii online pot fi facuti disponibili si in lista de clienti normala
                          </p>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notite
                          </label>
                          <textarea
                            value={editForm.notes}
                            onChange={(e) => handleInputChange('notes', e.target.value)}
                            rows={3}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                            placeholder="Notite despre client..."
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Read-only View */
                    <>
                      {/* Client Information */}
                      <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900 mb-4">
                          <User size={18} className="text-primary" />
                          Informatii Client
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          {selectedClient.type === 'SRL' ? (
                            <>
                              <div>
                                <label className="text-xs font-medium text-gray-500">
                                  Nume Companie
                                </label>
                                <p className="text-sm text-gray-900 mt-1">
                                  {selectedClient.companyName || 'Persoana fizica'}
                                </p>
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-500">
                                  Persoana de contact
                                </label>
                                <p className="text-sm text-gray-900 mt-1">
                                  {selectedClient.contactName || '-'}
                                </p>
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-500">CUI</label>
                                <p className="text-sm text-gray-900 mt-1">
                                  {selectedClient.vatNumber || '-'}
                                </p>
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-500">
                                  Nr. Reg. Com.
                                </label>
                                <p className="text-sm text-gray-900 mt-1">
                                  {selectedClient.registrationNumber || '-'}
                                </p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div>
                                <label className="text-xs font-medium text-gray-500">Prenume</label>
                                <p className="text-sm text-gray-900 mt-1">
                                  {selectedClient.firstName || '-'}
                                </p>
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-500">Nume</label>
                                <p className="text-sm text-gray-900 mt-1">
                                  {selectedClient.lastName || '-'}
                                </p>
                              </div>
                            </>
                          )}
                          <div>
                            <label className="text-xs font-medium text-gray-500">Email</label>
                            <p className="text-sm text-gray-900 mt-1 flex items-center gap-2">
                              <Mail size={14} className="text-gray-400" />
                              {selectedClient.email || '-'}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500">Telefon</label>
                            <p className="text-sm text-gray-900 mt-1 flex items-center gap-2">
                              <Phone size={14} className="text-gray-400" />
                              {selectedClient.phone || '-'}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <label className="text-xs font-medium text-gray-500">
                              Card fidelitate
                            </label>
                            <p className="text-sm text-gray-900 mt-1 flex items-center gap-2">
                              <CreditCard size={14} className="text-gray-400" />
                              {selectedClient.fidelityCardSerie || (
                                <span className="text-gray-400 italic">Necompletat</span>
                              )}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <label className="text-xs font-medium text-gray-500">Tip client</label>
                            <p className="text-sm text-gray-900 mt-1">
                              {selectedClient.isOnline ? (
                                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                                  Client online (disponibil in magazin)
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                                  Client magazin fizic
                                </span>
                              )}
                            </p>
                          </div>
                          {selectedClient.notes && (
                            <div className="col-span-2">
                              <label className="text-xs font-medium text-gray-500">Notite</label>
                              <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">
                                {selectedClient.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Loyalty Section */}
                      <ClientLoyaltySection clientId={selectedClient.id} />

                      {/* Assets - only shown for sectors with assets */}
                      {hasAssets && (
                        <div className="rounded-xl border border-gray-200 bg-white p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                              <Car size={18} className="text-primary" />
                              {assetPlural} ({selectedClient.assets?.length || 0})
                            </h3>
                            {!isEditing && !isAddingAsset && (
                              <button
                                type="button"
                                onClick={startAddingAsset}
                                className="inline-flex items-center gap-1 rounded-lg border border-primary bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors"
                              >
                                <Plus size={14} />
                                Adauga {assetSingular}
                              </button>
                            )}
                          </div>

                          {isAddingAsset ? (
                            /* Add Asset Form */
                            <div className="rounded-lg border-2 border-primary bg-blue-50 p-4">
                              <h4 className="font-semibold text-gray-900 mb-3">
                                {assetSingular} Nou
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="col-span-2">
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Nume (generat automat daca e gol)
                                  </label>
                                  <input
                                    type="text"
                                    value={assetForm.name}
                                    onChange={(e) => handleAssetInputChange('name', e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                    placeholder="Ex: Toyota Camry 2019"
                                  />
                                </div>

                                {/* Common Fields */}
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Producator *
                                  </label>
                                  <input
                                    type="text"
                                    value={assetForm.manufacturer}
                                    onChange={(e) =>
                                      handleAssetInputChange('manufacturer', e.target.value)
                                    }
                                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Model *
                                  </label>
                                  <input
                                    type="text"
                                    value={assetForm.model}
                                    onChange={(e) =>
                                      handleAssetInputChange('model', e.target.value)
                                    }
                                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    An
                                  </label>
                                  <input
                                    type="number"
                                    value={assetForm.year}
                                    onChange={(e) => handleAssetInputChange('year', e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    {assetIdentifier}
                                  </label>
                                  <input
                                    type="text"
                                    value={assetForm.identifier}
                                    onChange={(e) =>
                                      handleAssetInputChange('identifier', e.target.value)
                                    }
                                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                  />
                                </div>

                                {/* Vehicle-specific fields */}
                                {sectorAssetType === 'vehicle' && (
                                  <>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">
                                        VIN
                                      </label>
                                      <input
                                        type="text"
                                        value={assetForm.metadata?.vin || ''}
                                        onChange={(e) =>
                                          handleAssetMetadataChange('vin', e.target.value)
                                        }
                                        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Culoare
                                      </label>
                                      <input
                                        type="text"
                                        value={assetForm.metadata?.color || ''}
                                        onChange={(e) =>
                                          handleAssetMetadataChange('color', e.target.value)
                                        }
                                        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Kilometraj (km)
                                      </label>
                                      <input
                                        type="number"
                                        value={assetForm.metadata?.odometerKm || ''}
                                        onChange={(e) =>
                                          handleAssetMetadataChange('odometerKm', e.target.value)
                                        }
                                        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Combustibil
                                      </label>
                                      <select
                                        value={assetForm.metadata?.fuelType || ''}
                                        onChange={(e) =>
                                          handleAssetMetadataChange('fuelType', e.target.value)
                                        }
                                        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                      >
                                        <option value="">Selecteaza</option>
                                        <option value="benzina">Benzina</option>
                                        <option value="diesel">Diesel</option>
                                        <option value="electric">Electric</option>
                                        <option value="hibrid">Hibrid</option>
                                        <option value="gpl">GPL</option>
                                      </select>
                                    </div>
                                  </>
                                )}

                                {/* Appliance-specific fields */}
                                {sectorAssetType === 'appliance' && (
                                  <>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Categorie
                                      </label>
                                      <select
                                        value={assetForm.metadata?.category || ''}
                                        onChange={(e) =>
                                          handleAssetMetadataChange('category', e.target.value)
                                        }
                                        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                      >
                                        <option value="">Selecteaza</option>
                                        <option value="frigider">Frigider</option>
                                        <option value="masina_spalat">Masina de spalat</option>
                                        <option value="cuptor">Cuptor</option>
                                        <option value="aragaz">Aragaz</option>
                                        <option value="aspirator">Aspirator</option>
                                        <option value="altele">Altele</option>
                                      </select>
                                    </div>
                                    <div>
                                      <DatePicker
                                        label="Data garantiei"
                                        value={
                                          assetForm.metadata?.warrantyExpiry
                                            ? new Date(assetForm.metadata.warrantyExpiry)
                                            : null
                                        }
                                        onChange={(date) =>
                                          handleAssetMetadataChange(
                                            'warrantyExpiry',
                                            date ? date.toISOString().split('T')[0] : ''
                                          )
                                        }
                                        placeholder="Selecteaza data"
                                      />
                                    </div>
                                  </>
                                )}

                                {/* HVAC-specific fields */}
                                {sectorAssetType === 'hvac_unit' && (
                                  <>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Tip unitate
                                      </label>
                                      <select
                                        value={assetForm.metadata?.unitType || ''}
                                        onChange={(e) =>
                                          handleAssetMetadataChange('unitType', e.target.value)
                                        }
                                        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                      >
                                        <option value="">Selecteaza</option>
                                        <option value="aer_conditionat">Aer conditionat</option>
                                        <option value="centrala">Centrala termica</option>
                                        <option value="pompa_caldura">Pompa de caldura</option>
                                        <option value="ventilatie">Ventilatie</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Capacitate (BTU)
                                      </label>
                                      <input
                                        type="number"
                                        value={assetForm.metadata?.capacity || ''}
                                        onChange={(e) =>
                                          handleAssetMetadataChange('capacity', e.target.value)
                                        }
                                        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Refrigerent
                                      </label>
                                      <input
                                        type="text"
                                        value={assetForm.metadata?.refrigerant || ''}
                                        onChange={(e) =>
                                          handleAssetMetadataChange('refrigerant', e.target.value)
                                        }
                                        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                        placeholder="Ex: R410A"
                                      />
                                    </div>
                                    <div>
                                      <DatePicker
                                        label="Data instalarii"
                                        value={
                                          assetForm.metadata?.installationDate
                                            ? new Date(assetForm.metadata.installationDate)
                                            : null
                                        }
                                        onChange={(date) =>
                                          handleAssetMetadataChange(
                                            'installationDate',
                                            date ? date.toISOString().split('T')[0] : ''
                                          )
                                        }
                                        placeholder="Selecteaza data"
                                      />
                                    </div>
                                  </>
                                )}

                                {/* Equipment-specific fields */}
                                {sectorAssetType === 'equipment' && (
                                  <>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Categorie echipament
                                      </label>
                                      <input
                                        type="text"
                                        value={assetForm.metadata?.equipmentCategory || ''}
                                        onChange={(e) =>
                                          handleAssetMetadataChange(
                                            'equipmentCategory',
                                            e.target.value
                                          )
                                        }
                                        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Locatie
                                      </label>
                                      <input
                                        type="text"
                                        value={assetForm.metadata?.location || ''}
                                        onChange={(e) =>
                                          handleAssetMetadataChange('location', e.target.value)
                                        }
                                        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                      />
                                    </div>
                                  </>
                                )}
                              </div>
                              <div className="flex gap-2 mt-3">
                                <button
                                  type="button"
                                  onClick={handleSaveAsset}
                                  disabled={addAssetMutation.isPending}
                                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                                >
                                  <Save size={14} />
                                  {addAssetMutation.isPending ? 'Se salveaza...' : 'Salveaza'}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelAssetEdit}
                                  disabled={addAssetMutation.isPending}
                                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                >
                                  Anuleaza
                                </button>
                              </div>
                            </div>
                          ) : !selectedClient.assets?.length ? (
                            <p className="text-sm text-gray-500">
                              Niciun {assetSingular.toLowerCase()} inregistrat.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {selectedClient.assets.map((asset) => (
                                <div
                                  key={asset.id}
                                  className={`rounded-lg border p-4 ${editingAssetId === asset.id ? 'border-2 border-primary bg-blue-50' : 'border-gray-200 bg-gray-50'}`}
                                >
                                  {editingAssetId === asset.id ? (
                                    /* Edit Asset Form */
                                    <>
                                      <h4 className="font-semibold text-gray-900 mb-3">
                                        Editeaza {assetSingular}
                                      </h4>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="col-span-2">
                                          <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Nume
                                          </label>
                                          <input
                                            type="text"
                                            value={assetForm.name}
                                            onChange={(e) =>
                                              handleAssetInputChange('name', e.target.value)
                                            }
                                            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                          />
                                        </div>

                                        {/* Common Fields */}
                                        <div>
                                          <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Producator *
                                          </label>
                                          <input
                                            type="text"
                                            value={assetForm.manufacturer}
                                            onChange={(e) =>
                                              handleAssetInputChange('manufacturer', e.target.value)
                                            }
                                            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Model *
                                          </label>
                                          <input
                                            type="text"
                                            value={assetForm.model}
                                            onChange={(e) =>
                                              handleAssetInputChange('model', e.target.value)
                                            }
                                            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-gray-700 mb-1">
                                            An
                                          </label>
                                          <input
                                            type="number"
                                            value={assetForm.year}
                                            onChange={(e) =>
                                              handleAssetInputChange('year', e.target.value)
                                            }
                                            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-gray-700 mb-1">
                                            {assetIdentifier}
                                          </label>
                                          <input
                                            type="text"
                                            value={assetForm.identifier}
                                            onChange={(e) =>
                                              handleAssetInputChange('identifier', e.target.value)
                                            }
                                            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                          />
                                        </div>

                                        {/* Vehicle-specific fields */}
                                        {sectorAssetType === 'vehicle' && (
                                          <>
                                            <div>
                                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                                VIN
                                              </label>
                                              <input
                                                type="text"
                                                value={assetForm.metadata?.vin || ''}
                                                onChange={(e) =>
                                                  handleAssetMetadataChange('vin', e.target.value)
                                                }
                                                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Culoare
                                              </label>
                                              <input
                                                type="text"
                                                value={assetForm.metadata?.color || ''}
                                                onChange={(e) =>
                                                  handleAssetMetadataChange('color', e.target.value)
                                                }
                                                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Kilometraj (km)
                                              </label>
                                              <input
                                                type="number"
                                                value={assetForm.metadata?.odometerKm || ''}
                                                onChange={(e) =>
                                                  handleAssetMetadataChange(
                                                    'odometerKm',
                                                    e.target.value
                                                  )
                                                }
                                                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Combustibil
                                              </label>
                                              <select
                                                value={assetForm.metadata?.fuelType || ''}
                                                onChange={(e) =>
                                                  handleAssetMetadataChange(
                                                    'fuelType',
                                                    e.target.value
                                                  )
                                                }
                                                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                              >
                                                <option value="">Selecteaza</option>
                                                <option value="benzina">Benzina</option>
                                                <option value="diesel">Diesel</option>
                                                <option value="electric">Electric</option>
                                                <option value="hibrid">Hibrid</option>
                                                <option value="gpl">GPL</option>
                                              </select>
                                            </div>
                                          </>
                                        )}

                                        {/* Appliance-specific fields */}
                                        {sectorAssetType === 'appliance' && (
                                          <>
                                            <div>
                                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Categorie
                                              </label>
                                              <select
                                                value={assetForm.metadata?.category || ''}
                                                onChange={(e) =>
                                                  handleAssetMetadataChange(
                                                    'category',
                                                    e.target.value
                                                  )
                                                }
                                                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                              >
                                                <option value="">Selecteaza</option>
                                                <option value="frigider">Frigider</option>
                                                <option value="masina_spalat">
                                                  Masina de spalat
                                                </option>
                                                <option value="cuptor">Cuptor</option>
                                                <option value="aragaz">Aragaz</option>
                                                <option value="aspirator">Aspirator</option>
                                                <option value="altele">Altele</option>
                                              </select>
                                            </div>
                                            <div>
                                              <DatePicker
                                                label="Data garantiei"
                                                value={
                                                  assetForm.metadata?.warrantyExpiry
                                                    ? new Date(assetForm.metadata.warrantyExpiry)
                                                    : null
                                                }
                                                onChange={(date) =>
                                                  handleAssetMetadataChange(
                                                    'warrantyExpiry',
                                                    date ? date.toISOString().split('T')[0] : ''
                                                  )
                                                }
                                                placeholder="Selecteaza data"
                                              />
                                            </div>
                                          </>
                                        )}

                                        {/* HVAC-specific fields */}
                                        {sectorAssetType === 'hvac_unit' && (
                                          <>
                                            <div>
                                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Tip unitate
                                              </label>
                                              <select
                                                value={assetForm.metadata?.unitType || ''}
                                                onChange={(e) =>
                                                  handleAssetMetadataChange(
                                                    'unitType',
                                                    e.target.value
                                                  )
                                                }
                                                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                              >
                                                <option value="">Selecteaza</option>
                                                <option value="aer_conditionat">
                                                  Aer conditionat
                                                </option>
                                                <option value="centrala">Centrala termica</option>
                                                <option value="pompa_caldura">
                                                  Pompa de caldura
                                                </option>
                                                <option value="ventilatie">Ventilatie</option>
                                              </select>
                                            </div>
                                            <div>
                                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Capacitate (BTU)
                                              </label>
                                              <input
                                                type="number"
                                                value={assetForm.metadata?.capacity || ''}
                                                onChange={(e) =>
                                                  handleAssetMetadataChange(
                                                    'capacity',
                                                    e.target.value
                                                  )
                                                }
                                                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Refrigerent
                                              </label>
                                              <input
                                                type="text"
                                                value={assetForm.metadata?.refrigerant || ''}
                                                onChange={(e) =>
                                                  handleAssetMetadataChange(
                                                    'refrigerant',
                                                    e.target.value
                                                  )
                                                }
                                                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                                placeholder="Ex: R410A"
                                              />
                                            </div>
                                            <div>
                                              <DatePicker
                                                label="Data instalarii"
                                                value={
                                                  assetForm.metadata?.installationDate
                                                    ? new Date(assetForm.metadata.installationDate)
                                                    : null
                                                }
                                                onChange={(date) =>
                                                  handleAssetMetadataChange(
                                                    'installationDate',
                                                    date ? date.toISOString().split('T')[0] : ''
                                                  )
                                                }
                                                placeholder="Selecteaza data"
                                              />
                                            </div>
                                          </>
                                        )}

                                        {/* Equipment-specific fields */}
                                        {sectorAssetType === 'equipment' && (
                                          <>
                                            <div>
                                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Categorie echipament
                                              </label>
                                              <input
                                                type="text"
                                                value={assetForm.metadata?.equipmentCategory || ''}
                                                onChange={(e) =>
                                                  handleAssetMetadataChange(
                                                    'equipmentCategory',
                                                    e.target.value
                                                  )
                                                }
                                                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Locatie
                                              </label>
                                              <input
                                                type="text"
                                                value={assetForm.metadata?.location || ''}
                                                onChange={(e) =>
                                                  handleAssetMetadataChange(
                                                    'location',
                                                    e.target.value
                                                  )
                                                }
                                                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                              />
                                            </div>
                                          </>
                                        )}
                                      </div>
                                      <div className="flex gap-2 mt-3">
                                        <button
                                          type="button"
                                          onClick={handleSaveAsset}
                                          disabled={updateAssetMutation.isPending}
                                          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                                        >
                                          <Save size={14} />
                                          {updateAssetMutation.isPending
                                            ? 'Se salveaza...'
                                            : 'Salveaza'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={cancelAssetEdit}
                                          disabled={updateAssetMutation.isPending}
                                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                        >
                                          Anuleaza
                                        </button>
                                      </div>
                                    </>
                                  ) : (
                                    /* Read-only Asset Display */
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <p className="font-semibold text-gray-900">
                                          {asset.name ||
                                            `${asset.manufacturer} ${asset.model} ${asset.year ? `(${asset.year})` : ''}`}
                                        </p>
                                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                                          {asset.identifier && (
                                            <p className="flex items-center gap-2">
                                              <Hash size={14} />
                                              Identificator: {asset.identifier}
                                            </p>
                                          )}
                                          {asset.metadata?.color && (
                                            <p>Culoare: {asset.metadata?.color}</p>
                                          )}
                                          {asset.metadata?.odometerKm && (
                                            <p>
                                              Kilometraj:{' '}
                                              {asset.metadata?.odometerKm.toLocaleString('ro-RO')}{' '}
                                              km
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      {!isEditing && (
                                        <div className="flex gap-1 ml-2">
                                          <button
                                            type="button"
                                            onClick={() => startEditingAsset(asset)}
                                            className="rounded-lg border border-gray-200 p-1.5 text-gray-600 hover:bg-white hover:text-primary transition-colors"
                                            title={`Editeaza ${assetSingular.toLowerCase()}`}
                                          >
                                            <Edit2 size={14} />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteAsset(asset.id)}
                                            className="rounded-lg border border-gray-200 p-1.5 text-gray-600 hover:bg-white hover:text-red-600 transition-colors"
                                            title={`Sterge ${assetSingular.toLowerCase()}`}
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Appointments */}
                      <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900 mb-4">
                          <Calendar size={18} className="text-primary" />
                          Programari recente ({selectedClient.appointments?.length || 0})
                        </h3>
                        {!selectedClient.appointments?.length ? (
                          <p className="text-sm text-gray-500">Nicio programare inregistrata.</p>
                        ) : (
                          <div className="space-y-3">
                            {selectedClient.appointments.map((appointment) => {
                              const statusMeta = getStatusMeta(appointment.status);
                              return (
                                <div
                                  key={appointment.id}
                                  className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <p className="font-semibold text-gray-900">
                                      {appointment.title}
                                    </p>
                                    <span
                                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusMeta.class}`}
                                    >
                                      {statusMeta.label}
                                    </span>
                                  </div>
                                  <div className="space-y-1 text-sm text-gray-600">
                                    <p className="flex items-center gap-2">
                                      <Calendar size={14} />
                                      {formatDateTime(appointment.scheduledStart)}
                                      {appointment.scheduledEnd &&
                                        ` - ${format(new Date(appointment.scheduledEnd), 'HH:mm')}`}
                                    </p>
                                    {(appointment.asset || appointment.vehicle) && (
                                      <p className="flex items-center gap-2">
                                        <Car size={14} />
                                        {appointment.asset
                                          ? `${appointment.asset.name || `${appointment.asset.manufacturer} ${appointment.asset.model}`} (${appointment.asset.identifier || 'fara nr.'})`
                                          : `${appointment.vehicle.make} ${appointment.vehicle.model} (${appointment.vehicle.plateNumber || 'fara nr.'})`}
                                      </p>
                                    )}
                                    {appointment.assignees?.length > 0 && (
                                      <p className="flex items-center gap-2">
                                        <User size={14} />
                                        {appointment.assignees
                                          .map((a) =>
                                            `${a.user?.firstName || ''} ${a.user?.lastName || ''}`.trim()
                                          )
                                          .join(', ')}
                                      </p>
                                    )}
                                    {appointment.serviceOrder && (
                                      <p className="flex items-center gap-2 text-primary">
                                        <FileText size={14} />
                                        Comanda service:{' '}
                                        {new Intl.NumberFormat('ro-RO', {
                                          style: 'currency',
                                          currency: 'RON',
                                        }).format(appointment.serviceOrder.total || 0)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="p-6 text-sm text-gray-500">Client nu a fost gasit.</div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          style={{ margin: 0 }}
        >
          <div className="relative w-full max-w-2xl rounded-xl bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Importa Clienti din CSV</h2>
                <p className="text-sm text-gray-500">
                  Incarca un fisier CSV pentru a importa clienti in masa
                </p>
              </div>
              <button
                type="button"
                onClick={closeImportModal}
                disabled={isImporting}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Template Download */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <FileText size={20} className="text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-blue-900">Template CSV</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Descarca template-ul pentru a vedea structura corecta a fisierului CSV
                    </p>
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-blue-600 bg-white px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <Download size={14} />
                      Descarca Template
                    </button>
                  </div>
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecteaza fisier CSV
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    disabled={isImporting}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90 disabled:opacity-50"
                  />
                </div>
                {selectedFile && (
                  <p className="mt-2 text-sm text-gray-600">
                    Fisier selectat: <span className="font-medium">{selectedFile.name}</span>
                  </p>
                )}
              </div>

              {/* Import Results */}
              {importResults && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900">Rezultate Import</h3>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg bg-white p-3 border border-gray-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle size={16} className="text-green-600" />
                        <span className="text-xs font-medium text-gray-500">Succes</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {importResults.successful}
                      </p>
                    </div>
                    <div className="rounded-lg bg-white p-3 border border-gray-200">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={16} className="text-red-600" />
                        <span className="text-xs font-medium text-gray-500">Erori</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {importResults.failed}
                      </p>
                    </div>
                    <div className="rounded-lg bg-white p-3 border border-gray-200">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={16} className="text-yellow-600" />
                        <span className="text-xs font-medium text-gray-500">Duplicate</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {importResults.skipped}
                      </p>
                    </div>
                  </div>

                  {/* Error Details */}
                  {importResults.errors?.length > 0 && (
                    <div className="mt-3">
                      <h4 className="text-xs font-semibold text-red-900 mb-2">Erori Validare:</h4>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {importResults.errors.map((error, index) => (
                          <div
                            key={index}
                            className="text-xs text-red-700 bg-red-50 rounded-sm p-2"
                          >
                            <span className="font-medium">Rand {error.row}:</span>{' '}
                            {error.errors.join(', ')}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Duplicate Details */}
                  {importResults.duplicates?.length > 0 && (
                    <div className="mt-3">
                      <h4 className="text-xs font-semibold text-yellow-900 mb-2">
                        Clienti Duplicate (sarite):
                      </h4>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {importResults.duplicates.map((dup, index) => (
                          <div
                            key={index}
                            className="text-xs text-yellow-700 bg-yellow-50 rounded-sm p-2"
                          >
                            <span className="font-medium">Rand {dup.row}:</span> {dup.reason}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t px-6 py-4">
              <button
                type="button"
                onClick={closeImportModal}
                disabled={isImporting}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {importResults ? 'Inchide' : 'Anuleaza'}
              </button>
              {!importResults && (
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={!selectedFile || isImporting}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isImporting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Importa...
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      Importa Clienti
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
