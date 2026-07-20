/**
 * Online Clients Page
 *
 * Displays clients who have the isOnline flag set to true.
 * This page is used to manage online customers separately from physical shop clients.
 *
 * Features:
 * - Filter to show only online clients (isOnline = true)
 * - Display address field prominently
 * - Toggle isOnline status to move clients between online/offline
 * - Search functionality across all client fields including address
 * - Export functionality (CSV, Excel, JSON, PDF)
 * - Responsive design (cards for mobile, table for desktop)
 * - Statistics (total online clients, percentage, recent additions)
 */

import { useState, useMemo } from 'react';
import confirm from '../utils/confirm';
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
  MapPin,
  Globe,
  TrendingUp,
  Users as UsersIcon,
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
import { format, subDays, isAfter } from 'date-fns';
import roDateLocale from 'date-fns/locale/ro';
import { useClients } from '../hooks/useClients.js';
import ExportButton from '../components/ExportButton.jsx';
import API from '../utils/api.js';
import useToast from '../context/useToast.js';
import { getErrorMessage } from '../utils/errorUtils.js';

const formatDateTime = (value) => {
  if (!value) return '-';
  try {
    return format(new Date(value), 'dd MMM yyyy HH:mm', { locale: roDateLocale });
  } catch {
    return '-';
  }
};

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

const fetchAllClients = async () => {
  const response = await API.get('/clients', { params: { limit: 100 } });
  return response.data?.data || response.data;
};

const OnlineClients = () => {
  const [search, setSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [addClientForm, setAddClientForm] = useState({
    type: 'PF',
    firstName: '',
    lastName: '',
    companyName: '',
    contactName: '',
    phone: '',
    email: '',
    vatNumber: '',
    registrationNumber: '',
    address: '',
    fidelityCardSerie: '',
    isOnline: true, // Default to online
    notes: '',
  });
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Fetch online clients
  const { data, isLoading } = useClients(search ? { search, isOnline: true } : { isOnline: true });

  // Fetch all clients for statistics
  const { data: allClientsData } = useQuery({
    queryKey: ['clients', 'all'],
    queryFn: fetchAllClients,
  });

  const { data: selectedClient, isLoading: clientLoading } = useQuery({
    queryKey: ['client', selectedClientId],
    queryFn: () => fetchClientDetails(selectedClientId),
    enabled: Boolean(selectedClientId),
  });

  // Mutation to update client
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
        description: getErrorMessage(error),
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
        description: getErrorMessage(error),
        type: 'error',
      });
    },
  });

  const createClientMutation = useMutation({
    mutationFn: async (data) => {
      const response = await API.post('/clients', data);
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients', 'all'] });
      showToast({ title: 'Client online adaugat cu succes', type: 'success' });
      closeAddClientModal();
    },
    onError: (error) => {
      showToast({
        title: 'Eroare la adaugare client',
        description: getErrorMessage(error),
        type: 'error',
      });
    },
  });

  const clients = data?.items || [];
  const allClients = useMemo(() => allClientsData?.items || [], [allClientsData?.items]);

  // Calculate statistics
  const stats = useMemo(() => {
    const onlineClients = allClients.filter((c) => c.isOnline);
    const totalClients = allClients.length;
    const onlineCount = onlineClients.length;
    const percentage = totalClients > 0 ? ((onlineCount / totalClients) * 100).toFixed(1) : 0;

    // Recent additions (last 7 days)
    const sevenDaysAgo = subDays(new Date(), 7);
    const recentCount = onlineClients.filter((c) => {
      try {
        return isAfter(new Date(c.updatedAt), sevenDaysAgo);
      } catch {
        return false;
      }
    }).length;

    return {
      total: onlineCount,
      percentage,
      recent: recentCount,
    };
  }, [allClients]);

  const handleToggleOnline = async (clientId, currentStatus) => {
    updateClientMutation.mutate({ clientId, data: { isOnline: !currentStatus } });
  };

  const closeDrawer = () => {
    setSelectedClientId(null);
    setIsEditing(false);
    setEditForm({});
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
      isOnline: selectedClient.isOnline || false,
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
        description: getErrorMessage(error),
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

      // Import as online clients (isOnline=true)
      const response = await API.post('/clients/import?isOnline=true', formData);

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
        description: getErrorMessage(error),
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

  const openAddClientModal = () => {
    setAddClientForm({
      type: 'PF',
      firstName: '',
      lastName: '',
      companyName: '',
      contactName: '',
      phone: '',
      email: '',
      vatNumber: '',
      registrationNumber: '',
      address: '',
      fidelityCardSerie: '',
      isOnline: true,
      notes: '',
    });
    setIsAddClientModalOpen(true);
  };

  const closeAddClientModal = () => {
    setIsAddClientModalOpen(false);
    setAddClientForm({
      type: 'PF',
      firstName: '',
      lastName: '',
      companyName: '',
      contactName: '',
      phone: '',
      email: '',
      vatNumber: '',
      registrationNumber: '',
      address: '',
      fidelityCardSerie: '',
      isOnline: true,
      notes: '',
    });
  };

  const handleAddClientInputChange = (field, value) => {
    setAddClientForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateClient = () => {
    // Filter out empty strings to avoid validation errors
    const cleanedData = Object.entries(addClientForm).reduce((acc, [key, value]) => {
      if (typeof value === 'string' && value.trim() === '') {
        return acc; // Skip empty strings
      }
      acc[key] = value;
      return acc;
    }, {});

    createClientMutation.mutate(cleanedData);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header">
          <h1 className="page-title flex items-center gap-2">
            <Globe className="text-primary" size={28} />
            Clienti Online
          </h1>
          <p className="page-subtitle">
            Gestioneaza clientii online cu informatii de livrare si contacte digitale.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={openAddClientModal}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90 transition-all hover:shadow-md"
          >
            <Plus size={16} />
            Adauga Client Online
          </button>
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:shadow-md transition-all"
          >
            <Upload size={16} />
            Importa CSV
          </button>
          <ExportButton
            entityType="clients"
            filters={{
              search,
              isOnline: true,
            }}
          />
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Clienti Online</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
              <UsersIcon className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Procent din Total</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.percentage}%</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <TrendingUp className="text-primary" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Adaugati Recent (7 zile)</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.recent}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
              <Globe className="text-emerald-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Search Filter */}
      <div className="filter-bar">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cauta dupa nume, companie, email, telefon, adresa sau card fidelitate..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="text-sm text-gray-500 hover:text-primary transition-colors flex items-center gap-1"
          >
            <X size={14} />
            Sterge cautarea
          </button>
        )}
      </div>

      {/* Clients Table/Cards */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden lg:block">
          <div className="grid grid-cols-8 gap-4 px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100 bg-gray-50/50">
            <span>Client</span>
            <span>Email</span>
            <span>Telefon</span>
            <span>Adresa</span>
            <span>Card fidelitate</span>
            <span>Vehicule</span>
            <span>Status Online</span>
            <span>Actiuni</span>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          ) : clients.length === 0 ? (
            <div className="p-8 text-center">
              <Globe className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p className="text-sm font-medium text-gray-900 mb-1">
                {search ? 'Niciun client online gasit' : 'Niciun client online'}
              </p>
              <p className="text-sm text-gray-500">
                {search
                  ? 'Incearca sa modifici criteriile de cautare.'
                  : 'Marcheaza clienti existenti ca online sau importa clienti online prin CSV.'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="grid grid-cols-8 gap-4 px-6 py-4 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">
                    {client.type === 'SRL'
                      ? client.companyName || 'Client companie'
                      : `${client.firstName || ''} ${client.lastName || ''}`.trim() ||
                        client.contactName ||
                        '-'}
                    {client.type === 'SRL' && client.contactName ? (
                      <p className="text-xs text-gray-500">Contact: {client.contactName}</p>
                    ) : null}
                  </div>
                  <div className="truncate">{client.email || '-'}</div>
                  <div>{client.phone || '-'}</div>
                  <div className="truncate">
                    {client.address ? (
                      <span className="flex items-center gap-1.5" title={client.address}>
                        <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                        <span className="truncate">{client.address}</span>
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">Adresa necompletata</span>
                    )}
                  </div>
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
                  <div>{client.vehicles?.length || 0}</div>
                  <div>
                    <button
                      type="button"
                      onClick={() => handleToggleOnline(client.id, client.isOnline)}
                      disabled={updateClientMutation.isLoading}
                      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 bg-primary"
                      title={client.isOnline ? 'Marcheaza ca offline' : 'Marcheaza ca online'}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${client.isOnline ? 'translate-x-6' : 'translate-x-1'}`}
                      />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedClientId(client.id)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Eye size={14} />
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
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      title="Sterge client"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          ) : clients.length === 0 ? (
            <div className="p-6 text-center">
              <Globe className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p className="text-sm font-medium text-gray-900 mb-1">
                {search ? 'Niciun client online gasit' : 'Niciun client online'}
              </p>
              <p className="text-sm text-gray-500">
                {search
                  ? 'Incearca sa modifici criteriile de cautare.'
                  : 'Marcheaza clienti existenti ca online sau importa clienti online prin CSV.'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {clients.map((client) => (
                <div key={client.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                          {client.type === 'SRL'
                            ? client.companyName || 'Client companie'
                            : `${client.firstName || ''} ${client.lastName || ''}`.trim() ||
                              client.contactName ||
                              '-'}
                        </p>
                        {client.type === 'SRL' && client.contactName && (
                          <p className="text-xs text-gray-500 mt-1">
                            Contact: {client.contactName}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleOnline(client.id, client.isOnline)}
                        disabled={updateClientMutation.isLoading}
                        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 bg-primary ml-2 flex-shrink-0"
                        title={client.isOnline ? 'Marcheaza ca offline' : 'Marcheaza ca online'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${client.isOnline ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-sm text-gray-600">
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
                      {client.address ? (
                        <div className="flex items-center gap-1.5">
                          <MapPin size={14} className="text-gray-400" />
                          <span className="truncate">{client.address}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <MapPin size={14} className="text-gray-300" />
                          <span className="text-gray-400 italic">Adresa necompletata</span>
                        </div>
                      )}
                      {client.fidelityCardSerie && (
                        <div className="flex items-center gap-1.5">
                          <CreditCard size={14} className="text-gray-400" />
                          <span>{client.fidelityCardSerie}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Car size={14} className="text-gray-400" />
                        <span>{client.vehicles?.length || 0} vehicule</span>
                      </div>
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
      </div>

      {/* Client Details Drawer */}
      {selectedClientId && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ margin: 0 }}>
          <div className="flex-1 bg-gray-900/40" onClick={closeDrawer} />
          <aside className="flex h-screen w-full max-w-3xl flex-col bg-white shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-white">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Detalii Client Online</h2>
                <p className="text-sm text-gray-500">Informatii complete despre clientul online</p>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={startEditing}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Edit2 size={16} />
                    Editeaza
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={updateClientMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save size={16} />
                      {updateClientMutation.isPending ? 'Se salveaza...' : 'Salveaza'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      disabled={updateClientMutation.isPending}
                      className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Anuleaza
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {clientLoading ? (
                <div className="flex justify-center py-12">
                  <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
                </div>
              ) : selectedClient ? (
                <div className="space-y-6 p-6">
                  {isEditing ? (
                    /* Edit Form */
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
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

                      <div className="grid grid-cols-2 gap-4">
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
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                required
                              />
                            </div>
                          </>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email *
                          </label>
                          <input
                            type="email"
                            value={editForm.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Telefon *
                          </label>
                          <input
                            type="tel"
                            value={editForm.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            required
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
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="Serie card fidelitate"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={editForm.isOnline || false}
                              onChange={(e) => handleInputChange('isOnline', e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
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
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                        <div className="grid grid-cols-2 gap-4">
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
                            <label className="text-xs font-medium text-gray-500">Adresa</label>
                            <p className="text-sm text-gray-900 mt-1 flex items-center gap-2">
                              <MapPin size={14} className="text-gray-400" />
                              {selectedClient.address || (
                                <span className="text-gray-400 italic">Adresa necompletata</span>
                              )}
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
                          <div>
                            <label className="text-xs font-medium text-gray-500">
                              Status Online
                            </label>
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleOnline(selectedClient.id, selectedClient.isOnline)
                                }
                                disabled={updateClientMutation.isLoading}
                                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 bg-primary"
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${selectedClient.isOnline ? 'translate-x-6' : 'translate-x-1'}`}
                                />
                              </button>
                              <span className="text-sm text-gray-700">
                                {selectedClient.isOnline ? 'Client Online' : 'Client Offline'}
                              </span>
                            </div>
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
                    </>
                  )}

                  {/* Vehicles */}
                  <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900 mb-4">
                      <Car size={18} className="text-primary" />
                      Vehicule ({selectedClient.vehicles?.length || 0})
                    </h3>
                    {!selectedClient.vehicles?.length ? (
                      <p className="text-sm text-gray-500">Niciun vehicul inregistrat.</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedClient.vehicles.map((vehicle) => (
                          <div
                            key={vehicle.id}
                            className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {vehicle.make} {vehicle.model}{' '}
                                  {vehicle.year ? `(${vehicle.year})` : ''}
                                </p>
                                <div className="mt-2 space-y-1 text-sm text-gray-600">
                                  {vehicle.plateNumber && (
                                    <p className="flex items-center gap-2">
                                      <Hash size={14} />
                                      Numar: {vehicle.plateNumber}
                                    </p>
                                  )}
                                  {vehicle.vin && (
                                    <p className="flex items-center gap-2">
                                      <Hash size={14} />
                                      VIN: {vehicle.vin}
                                    </p>
                                  )}
                                  {vehicle.color && <p>Culoare: {vehicle.color}</p>}
                                  {vehicle.odometerKm && (
                                    <p>
                                      Kilometraj: {vehicle.odometerKm.toLocaleString('ro-RO')} km
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

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
                                <p className="font-semibold text-gray-900">{appointment.title}</p>
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
                                {appointment.vehicle && (
                                  <p className="flex items-center gap-2">
                                    <Car size={14} />
                                    {appointment.vehicle.make} {appointment.vehicle.model} (
                                    {appointment.vehicle.plateNumber || 'fara nr.'})
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
                <h2 className="text-lg font-semibold text-gray-900">
                  Importa Clienti Online din CSV
                </h2>
                <p className="text-sm text-gray-500">
                  Incarca un fisier CSV pentru a importa clienti online in masa
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
                      (include campul Adresa)
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
                          <div key={index} className="text-xs text-red-700 bg-red-50 rounded p-2">
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
                            className="text-xs text-yellow-700 bg-yellow-50 rounded p-2"
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

      {/* Add Client Modal */}
      {isAddClientModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          style={{ margin: 0 }}
        >
          <div className="relative w-full max-w-2xl rounded-xl bg-white shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Adauga Client Online</h2>
                <p className="text-sm text-gray-500">
                  Completeaza informatiile pentru noul client online
                </p>
              </div>
              <button
                type="button"
                onClick={closeAddClientModal}
                disabled={createClientMutation.isPending}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {/* Client Type Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tip client *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="PF"
                        checked={addClientForm.type === 'PF'}
                        onChange={(e) => handleAddClientInputChange('type', e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Persoana Fizica</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="SRL"
                        checked={addClientForm.type === 'SRL'}
                        onChange={(e) => handleAddClientInputChange('type', e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Companie (SRL)</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {addClientForm.type === 'SRL' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nume Companie *
                        </label>
                        <input
                          type="text"
                          value={addClientForm.companyName}
                          onChange={(e) =>
                            handleAddClientInputChange('companyName', e.target.value)
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          required
                          placeholder="SC Exemplu SRL"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Persoana de contact
                        </label>
                        <input
                          type="text"
                          value={addClientForm.contactName}
                          onChange={(e) =>
                            handleAddClientInputChange('contactName', e.target.value)
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="Ion Popescu"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CUI</label>
                        <input
                          type="text"
                          value={addClientForm.vatNumber}
                          onChange={(e) => handleAddClientInputChange('vatNumber', e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="RO12345678"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nr. Reg. Com.
                        </label>
                        <input
                          type="text"
                          value={addClientForm.registrationNumber}
                          onChange={(e) =>
                            handleAddClientInputChange('registrationNumber', e.target.value)
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="J40/1234/2020"
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
                          value={addClientForm.firstName}
                          onChange={(e) => handleAddClientInputChange('firstName', e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          required
                          placeholder="Ion"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nume *
                        </label>
                        <input
                          type="text"
                          value={addClientForm.lastName}
                          onChange={(e) => handleAddClientInputChange('lastName', e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          required
                          placeholder="Popescu"
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={addClientForm.email}
                      onChange={(e) => handleAddClientInputChange('email', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      required
                      placeholder="client@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefon *
                    </label>
                    <input
                      type="tel"
                      value={addClientForm.phone}
                      onChange={(e) => handleAddClientInputChange('phone', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      required
                      placeholder="0712345678"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Adresa *</label>
                    <input
                      type="text"
                      value={addClientForm.address}
                      onChange={(e) => handleAddClientInputChange('address', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Str. Exemplu nr. 1, Bucuresti, Sector 1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Adresa de livrare pentru clientii online
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Card fidelitate
                    </label>
                    <input
                      type="text"
                      value={addClientForm.fidelityCardSerie}
                      onChange={(e) =>
                        handleAddClientInputChange('fidelityCardSerie', e.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Serie card fidelitate"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notite</label>
                    <textarea
                      value={addClientForm.notes}
                      onChange={(e) => handleAddClientInputChange('notes', e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Notite despre client..."
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-start gap-2">
                    <Globe size={16} className="text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Client Online</p>
                      <p className="text-sm text-blue-700 mt-1">
                        Acest client va fi marcat automat ca "Online" si va aparea in lista de
                        clienti online.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t px-6 py-4 bg-gray-50">
              <button
                type="button"
                onClick={closeAddClientModal}
                disabled={createClientMutation.isPending}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Anuleaza
              </button>
              <button
                type="button"
                onClick={handleCreateClient}
                disabled={createClientMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createClientMutation.isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Se salveaza...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Adauga Client
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnlineClients;
