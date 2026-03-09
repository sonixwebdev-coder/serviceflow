import { useState, useEffect } from 'react';
import confirm from '../utils/confirm';
import { format } from 'date-fns';
import roDateLocale from 'date-fns/locale/ro';
import {
  FileCheck,
  RefreshCw,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Send,
  Settings,
  BarChart3,
  Mail,
  ExternalLink,
  Edit,
  Eye,
  Trash2,
  FileText,
  Upload,
} from 'lucide-react';
import useAuth from '../context/useAuth';
import useToast from '../context/useToast';
import {
  getAnafConfig,
  createAnafConfig,
  getAuthorizationUrl,
  testAnafConnection,
  getSyncRecords,
  getSyncStatistics,
  getAnafMessages,
  downloadAnafMessage,
  syncInvoiceStatus,
  retryInvoiceSubmission,
  downloadInvoiceXml,
  batchSyncInvoices,
  updateAnafConfig,
  submitInvoiceToAnaf,

} from '../services/anafService';
import { fetchInvoices } from '../services/invoiceService';

const STATUS_BADGES = {
  PENDING: 'bg-gray-100 text-gray-800 border border-gray-300',
  UPLOADED: 'bg-blue-100 text-blue-800 border border-blue-300',
  PROCESSING: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
  OK: 'bg-green-100 text-green-800 border border-green-300',
  ERROR: 'bg-red-100 text-red-800 border border-red-300',
};

const ANAF_STATUS_BADGES = {
  ok: 'bg-green-100 text-green-800 border border-green-300',
  nok: 'bg-red-100 text-red-800 border border-red-300',
  processing: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
};

const MESSAGE_TYPE_LABELS = {
  T: 'Toate mesajele',
  P: 'Mesaje primite',
  E: 'Mesaje trimise',
  R: 'Mesaje cu erori',
};

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return format(new Date(value), 'dd MMM yyyy HH:mm', { locale: roDateLocale });
  } catch {
    return '—';
  }
};

const formatDateShort = (value) => {
  if (!value) return '—';
  try {
    return format(new Date(value), 'dd MMM yyyy', { locale: roDateLocale });
  } catch {
    return '—';
  }
};

const AnafManagement = () => {
  const { hasRole } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('configuration');
  const [loading, setLoading] = useState(false);

  // Configuration state
  const [config, setConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [editingConfig, setEditingConfig] = useState(false);
  const [configForm, setConfigForm] = useState({
    cif: '',
    clientId: '',
    clientSecret: '',
    redirectUri: `${window.location.origin}/anaf/callback`,
    environment: 'test',
  });

  // Sync status state
  const [syncRecords, setSyncRecords] = useState([]);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncFilters, setSyncFilters] = useState({ status: '', page: 1, limit: 20 });
  const [syncingInvoices, setSyncingInvoices] = useState({});
  const [batchSyncing, setBatchSyncing] = useState(false);

  // Messages state
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesFilters, setMessagesFilters] = useState({ type: 'T' });
  const [downloadingMessages, setDownloadingMessages] = useState({});
  const [viewingMessage, setViewingMessage] = useState(null);

  // Statistics state
  const [statistics, setStatistics] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Invoices state
  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoiceFilters, setInvoiceFilters] = useState({ status: '', anafStatus: '' });
  const [submittingInvoices, setSubmittingInvoices] = useState({});
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [confirmSubmit, setConfirmSubmit] = useState(null); // { invoiceId, invoiceNumber }

  const isAdmin = hasRole('admin');

  // Load configuration
  useEffect(() => {
    loadConfiguration();

    // Listen for OAuth success message from popup
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'ANAF_AUTH_SUCCESS') {
        showToast({
          title: 'Autentificare reușită',
          description: 'Conexiunea la ANAF a fost stabilită cu succes.',
          type: 'success',
        });
        loadConfiguration(); // Reload config to get updated token
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'sync-status') {
      loadSyncRecords();
    } else if (activeTab === 'messages') {
      loadMessages();
    } else if (activeTab === 'statistics') {
      loadStatistics();
    } else if (activeTab === 'invoices') {
      loadInvoices();
    }
  }, [activeTab, syncFilters, messagesFilters, invoiceFilters]);

  const loadConfiguration = async () => {
    setConfigLoading(true);
    try {
      const configs = await getAnafConfig();
      const activeConfig = Array.isArray(configs) ? configs[0] : configs;
      setConfig(activeConfig);
      if (activeConfig) {
        setConfigForm({
          cif: activeConfig.cif || '',
          clientId: activeConfig.clientId || '',
          clientSecret: '',
          redirectUri: activeConfig.redirectUri || '',
          environment: activeConfig.environment || 'production',
        });
      }
    } catch (error) {
      showToast({
        title: 'Eroare',
        description: 'Nu s-a putut încărca configurația ANAF.',
        type: 'error',
      });
    } finally {
      setConfigLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const result = await testAnafConnection();
      setConnectionStatus({ success: true, message: 'Conexiunea la ANAF funcționează corect.' });
      showToast({
        title: 'Conexiune reușită',
        description: 'Conexiunea la ANAF funcționează corect.',
        type: 'success',
      });
    } catch (error) {
      setConnectionStatus({ success: false, message: error.message || 'Conexiunea a eșuat.' });
      showToast({
        title: 'Eroare conexiune',
        description: error.message || 'Conexiunea la ANAF a eșuat.',
        type: 'error',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleConnectToAnaf = async () => {
    if (!config?.id) {
      showToast({
        title: 'Eroare',
        description: 'Nu există o configurație activă.',
        type: 'error',
      });
      return;
    }

    try {
      const { authorizationUrl } = await getAuthorizationUrl(config.id);
      window.open(authorizationUrl, 'anaf-oauth', 'width=600,height=700');
      showToast({
        title: 'Autorizare ANAF',
        description: 'Te rugăm să autorizezi aplicația în fereastra nouă.',
        type: 'info',
      });
    } catch (error) {
      showToast({
        title: 'Eroare',
        description: error.message || 'Nu s-a putut genera URL-ul de autorizare.',
        type: 'error',
      });
    }
  };

  const handleCreateConfig = async () => {
    try {
      const payload = {
        cif: configForm.cif,
        clientId: configForm.clientId,
        clientSecret: configForm.clientSecret,
        redirectUri: configForm.redirectUri,
        environment: configForm.environment || 'test',
      };

      await createAnafConfig(payload);
      showToast({
        title: 'Configurație creată',
        description: `Configurația ANAF a fost creată cu succes (${configForm.environment === 'production' ? 'Producție' : 'Test'}).`,
        type: 'success',
      });
      // Reset form
      setConfigForm({
        cif: '',
        clientId: '',
        clientSecret: '',
        redirectUri: `${window.location.origin}/anaf/callback`,
        environment: 'test',
      });
      loadConfiguration();
    } catch (error) {
      showToast({
        title: 'Eroare',
        description: error.response?.data?.message || error.message || 'Nu s-a putut crea configurația.',
        type: 'error',
      });
    }
  };

  const handleSaveConfig = async () => {
    if (!config?.id) return;

    try {
      const payload = {};
      if (configForm.cif) payload.cif = configForm.cif;
      if (configForm.clientId) payload.clientId = configForm.clientId;
      if (configForm.clientSecret) payload.clientSecret = configForm.clientSecret;
      if (configForm.redirectUri) payload.redirectUri = configForm.redirectUri;
      if (configForm.environment) payload.environment = configForm.environment;

      await updateAnafConfig(config.id, payload);
      showToast({
        title: 'Configurație salvată',
        description: 'Configurația ANAF a fost actualizată cu succes.',
        type: 'success',
      });
      setEditingConfig(false);
      loadConfiguration();
    } catch (error) {
      showToast({
        title: 'Eroare',
        description: error.message || 'Nu s-a putut actualiza configurația.',
        type: 'error',
      });
    }
  };

  const loadSyncRecords = async () => {
    setSyncLoading(true);
    try {
      // Filter out empty strings
      const params = {};
      if (syncFilters.status) params.status = syncFilters.status;
      if (syncFilters.page) params.page = syncFilters.page;
      if (syncFilters.limit) params.limit = syncFilters.limit;

      const records = await getSyncRecords(params);
      setSyncRecords(Array.isArray(records) ? records : []);
    } catch (error) {
      showToast({
        title: 'Eroare',
        description: 'Nu s-au putut încărca înregistrările de sincronizare.',
        type: 'error',
      });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSyncInvoice = async (invoiceId) => {
    setSyncingInvoices((prev) => ({ ...prev, [invoiceId]: true }));
    try {
      await syncInvoiceStatus(invoiceId);
      showToast({
        title: 'Sincronizare reușită',
        description: 'Statusul facturii a fost sincronizat cu ANAF.',
        type: 'success',
      });
      loadSyncRecords();
    } catch (error) {
      showToast({
        title: 'Eroare',
        description: error.message || 'Nu s-a putut sincroniza factura.',
        type: 'error',
      });
    } finally {
      setSyncingInvoices((prev) => ({ ...prev, [invoiceId]: false }));
    }
  };

  const handleRetryInvoice = async (invoiceId) => {
    setSyncingInvoices((prev) => ({ ...prev, [invoiceId]: true }));
    try {
      await retryInvoiceSubmission(invoiceId);
      showToast({
        title: 'Retrimitere inițiată',
        description: 'Factura este retrimisă către ANAF.',
        type: 'success',
      });
      loadSyncRecords();
    } catch (error) {
      showToast({
        title: 'Eroare',
        description: error.message || 'Nu s-a putut retrimite factura.',
        type: 'error',
      });
    } finally {
      setSyncingInvoices((prev) => ({ ...prev, [invoiceId]: false }));
    }
  };

  const handleDownloadXml = async (invoiceId, invoiceNumber) => {
    try {
      const blob = await downloadInvoiceXml(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoiceNumber}.xml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast({
        title: 'XML descărcat',
        description: 'Fișierul XML a fost descărcat cu succes.',
        type: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Eroare',
        description: 'Nu s-a putut descărca fișierul XML.',
        type: 'error',
      });
    }
  };

  const handleBatchSync = async () => {
    setBatchSyncing(true);
    try {
      await batchSyncInvoices();
      showToast({
        title: 'Sincronizare în curs',
        description: 'Facturile sunt sincronizate în fundal.',
        type: 'success',
      });
      setTimeout(loadSyncRecords, 2000);
    } catch (error) {
      showToast({
        title: 'Eroare',
        description: error.message || 'Nu s-a putut iniția sincronizarea.',
        type: 'error',
      });
    } finally {
      setBatchSyncing(false);
    }
  };

  const loadMessages = async () => {
    setMessagesLoading(true);
    try {
      const msgs = await getAnafMessages(messagesFilters);
      setMessages(Array.isArray(msgs) ? msgs : []);
    } catch (error) {
      showToast({
        title: 'Eroare',
        description: 'Nu s-au putut încărca mesajele ANAF.',
        type: 'error',
      });
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleViewMessage = (message) => {
    setViewingMessage(message);
  };

  const handleDownloadMessage = async (messageId, messageType) => {
    setDownloadingMessages((prev) => ({ ...prev, [messageId]: true }));
    try {
      const blob = await downloadAnafMessage(messageId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `anaf-message-${messageId}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast({
        title: 'Mesaj descărcat',
        description: 'Mesajul ANAF a fost descărcat cu succes.',
        type: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Eroare',
        description: 'Nu s-a putut descărca mesajul.',
        type: 'error',
      });
    } finally {
      setDownloadingMessages((prev) => ({ ...prev, [messageId]: false }));
    }
  };


  const handleEnvironmentChange = async (newEnvironment) => {
    if (!config?.id) return;

    try {
      await updateAnafConfig(config.id, { environment: newEnvironment });
      showToast({
        title: 'Mediu actualizat',
        description: `Mediul a fost schimbat la ${newEnvironment === 'production' ? 'Producție' : 'Test'}.`,
        type: 'success',
      });
      await loadConfiguration();
      await loadInvoices();
      await loadSyncRecords();
      await loadStatistics();
      await loadMessages();
    } catch (error) {
      showToast({
        title: 'Eroare',
        description: 'Nu s-a putut actualiza mediul.',
        type: 'error',
      });
    }
  };

  const loadStatistics = async () => {
    setStatsLoading(true);
    try {
      const stats = await getSyncStatistics();
      setStatistics(stats);
    } catch (error) {
      showToast({
        title: 'Eroare',
        description: 'Nu s-au putut încărca statisticile.',
        type: 'error',
      });
    } finally {
      setStatsLoading(false);
    }
  };

  const loadInvoices = async () => {
    setInvoicesLoading(true);
    try {
      const params = {};
      if (invoiceFilters.status) params.status = invoiceFilters.status;
      if (invoiceFilters.anafStatus) params.anafStatus = invoiceFilters.anafStatus;

      const response = await fetchInvoices(params);
      setInvoices(response.data || response);
    } catch (error) {
      showToast({
        title: 'Eroare',
        description: 'Nu s-au putut încărca facturile.',
        type: 'error',
      });
    } finally {
      setInvoicesLoading(false);
    }
  };

  const handleSubmitInvoice = async (invoiceId, invoiceNumber) => {
    // Show confirmation dialog first
    setConfirmSubmit({ invoiceId, invoiceNumber });
  };

  const performInvoiceSubmit = async (invoiceId) => {
    setSubmittingInvoices(prev => ({ ...prev, [invoiceId]: true }));
    try {
      await submitInvoiceToAnaf(invoiceId);
      const envLabel = config?.environment === 'production' ? 'producție' : 'test';
      showToast({
        title: 'Succes',
        description: `Factura a fost trimisă către ANAF (mediu: ${envLabel}).`,
        type: 'success',
      });
      await loadInvoices();
    } catch (error) {
      showToast({
        title: 'Eroare',
        description: error.response?.data?.message || 'Nu s-a putut trimite factura către ANAF.',
        type: 'error',
      });
    } finally {
      setSubmittingInvoices(prev => ({ ...prev, [invoiceId]: false }));
    }
  };

  const handleBulkSubmit = async () => {
    if (selectedInvoices.length === 0) return;

    const confirmBulk = await confirm({
      title: 'Trimite la ANAF',
      text: `Sigur doriti sa trimiteti ${selectedInvoices.length} facturi catre ANAF?`,
      confirmText: 'Trimite',
    });

    if (!confirmBulk) return;

    for (const invoiceId of selectedInvoices) {
      await handleSubmitInvoice(invoiceId);
    }

    setSelectedInvoices([]);
  };

  const toggleInvoiceSelection = (invoiceId) => {
    setSelectedInvoices(prev =>
      prev.includes(invoiceId)
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };

  const toggleAllInvoices = () => {
    // Only select invoices that can be submitted
    const submittableInvoices = invoices.filter(invoice => {
      const anafSync = invoice.anafSync;
      const canSubmit = invoice.status !== 'CANCELLED' &&
                       (!anafSync || anafSync.status === 'ERROR');
      return canSubmit;
    });

    // If all submittable invoices are already selected, deselect all
    const submittableIds = submittableInvoices.map(inv => inv.id);
    const allSubmittableSelected = submittableIds.every(id => selectedInvoices.includes(id));

    if (allSubmittableSelected && submittableIds.length > 0) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(submittableIds);
    }
  };

  const tabs = [
    { id: 'configuration', label: 'Configurație', icon: Settings },
    { id: 'invoices', label: 'Facturi', icon: FileText },
    { id: 'sync-status', label: 'Status Sincronizare', icon: RefreshCw },
    { id: 'messages', label: 'Mesaje', icon: Mail },
    { id: 'statistics', label: 'Statistici', icon: BarChart3 },
  ];

  return (
    <div className="">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ANAF E-Factură</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestionează integrarea cu sistemul ANAF SPV (E-Factură)
          </p>
        </div>
        <FileCheck className="h-8 w-8 text-primary" />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>


      {/* Tab Content */}
      <div className="mt-4 rounded-lg border border-gray-200 bg-white">
        {/* Configuration Tab */}
        {activeTab === 'configuration' && (
          <div className="p-6">
            {configLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
              </div>
            ) : !config ? (
              <div className="py-8">
                <div className="mb-6 text-center">
                  <Settings className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm font-medium text-gray-900">Nicio configurație</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Creează o configurație nouă pentru a te conecta la ANAF.
                  </p>
                </div>

                {/* Create Configuration Form */}
                <div className="mx-auto max-w-2xl rounded-lg border border-gray-200 bg-white p-6">
                  <h3 className="mb-4 text-lg font-semibold text-gray-900">
                    Configurație ANAF Nouă
                  </h3>

                  <div className="space-y-4">
                    {/* Environment Selector */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mediu ANAF
                      </label>
                      <select
                        value={configForm.environment}
                        onChange={(e) =>
                          setConfigForm({ ...configForm, environment: e.target.value })
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="test">Test (pentru dezvoltare și testare)</option>
                        <option value="production">Producție (pentru facturi reale)</option>
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        Selectează mediul ANAF: Test pentru dezvoltare sau Producție pentru facturi reale.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        CIF <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={configForm.cif}
                        onChange={(e) =>
                          setConfigForm({ ...configForm, cif: e.target.value })
                        }
                        placeholder="RO12345678"
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Codul de Identificare Fiscală al companiei tale
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Client ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={configForm.clientId}
                        onChange={(e) =>
                          setConfigForm({ ...configForm, clientId: e.target.value })
                        }
                        placeholder=""
                        disabled={false}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Primit de la ANAF după înregistrarea aplicației
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Client Secret <span className="text-red-500">*</span>
                        
                      </label>
                      <input
                        type="password"
                        value={configForm.clientSecret}
                        onChange={(e) =>
                          setConfigForm({ ...configForm, clientSecret: e.target.value })
                        }
                        placeholder=""
                        disabled={false}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Primit de la ANAF după înregistrarea aplicației
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Redirect URI <span className="text-red-500">*</span>
                        
                      </label>
                      <input
                        type="text"
                        value={configForm.redirectUri}
                        onChange={(e) =>
                          setConfigForm({ ...configForm, redirectUri: e.target.value })
                        }
                        placeholder="http://localhost:5173/anaf/callback"
                        disabled={false}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Trebuie să fie identic cu cel înregistrat la ANAF
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Mediu <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={configForm.environment}
                        onChange={(e) =>
                          setConfigForm({ ...configForm, environment: e.target.value })
                        }
                        disabled={false}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="test">Test</option>
                        <option value="production">Production</option>
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        Folosește Test pentru dezvoltare
                      </p>
                    </div>

                      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                        <div className="flex">
                          <AlertCircle className="h-5 w-5 flex-shrink-0 text-blue-600" />
                          <div className="ml-3">
                            <p className="text-sm font-medium text-blue-800">
                              Informații importante
                            </p>
                            <p className="mt-1 text-sm text-blue-700">
                              Pentru a obține credențialele OAuth, trebuie să înregistrezi
                              aplicația în portalul ANAF. Consultă documentația din fișierul
                              ANAF_EFACTURA_GUIDE.md pentru detalii complete.
                            </p>
                          </div>
                        </div>
                      </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={handleCreateConfig}
                        disabled={!configForm.cif || !configForm.clientId || !configForm.clientSecret || !configForm.redirectUri}
                        className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Creează Configurație
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="">
                {/* Connection Status */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900">Status Conexiune</h3>
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {config.environment === 'production' ? 'PRODUCȚIE' : 'TEST'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {config.token ? 'Conectat la ANAF' : 'Neconectat - autentificare necesară'}
                      </p>
                      {config.token?.expiresAt && (
                        <p className="mt-1 text-xs text-gray-500">
                          Token expiră la: {formatDate(config.token.expiresAt)}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                        <button
                          onClick={handleTestConnection}
                          disabled={testingConnection}
                          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                        >
                          {testingConnection ? 'Testare...' : 'Testează Conexiunea'}
                        </button>
                        <button
                          onClick={handleConnectToAnaf}
                          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90"
                        >
                          <ExternalLink className="mr-2 inline h-4 w-4" />
                          Conectează ANAF
                        </button>
                      </div>
                    </div>
                  </div>
                  {connectionStatus && (
                    <div
                      className={`mt-3 rounded-lg border p-3 ${
                        connectionStatus.success
                          ? 'border-green-300 bg-green-50 text-green-800'
                          : 'border-red-300 bg-red-50 text-red-800'
                      }`}
                    >
                      <p className="text-sm">{connectionStatus.message}</p>
                    </div>
                  )}

                {/* Environment Selector */}
                {isAdmin && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mediu ANAF
                    </label>
                    <select
                      value={config.environment || 'test'}
                      onChange={(e) => handleEnvironmentChange(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="test">Test (pentru dezvoltare și testare)</option>
                      <option value="production">Producție (pentru facturi reale)</option>
                    </select>
                    <p className="mt-2 text-xs text-gray-500">
                      Mediul curent determină serverul ANAF folosit pentru toate operațiunile.
                    </p>
                  </div>
                )}

                {/* Configuration Details */}
                {isAdmin && (
                  <>
                    {/* Show OAuth credentials form if no valid tokens */}
                    {!config.token && (
                      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                        <div className="mb-3 flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <h3 className="text-sm font-semibold text-blue-900">
                              Configurare Credențiale OAuth ANAF
                            </h3>
                            <p className="mt-1 text-xs text-blue-700">
                              Pentru a te conecta la ANAF, introdu mai întâi credențialele OAuth de mai jos, apoi click pe "Conectează ANAF".
                            </p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">CIF</label>
                            <input
                              type="text"
                              value={configForm.cif}
                              onChange={(e) => setConfigForm({ ...configForm, cif: e.target.value })}
                              placeholder="Ex: RO12345678"
                              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Client ID (OAuth)</label>
                            <input
                              type="text"
                              value={configForm.clientId}
                              onChange={(e) => setConfigForm({ ...configForm, clientId: e.target.value })}
                              placeholder="Ex: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Client Secret (OAuth)</label>
                            <input
                              type="password"
                              value={configForm.clientSecret}
                              onChange={(e) => setConfigForm({ ...configForm, clientSecret: e.target.value })}
                              placeholder="••••••••••••••••"
                              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                          <button
                            onClick={handleSaveConfig}
                            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90"
                          >
                            Salvează Credențialele
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Show config details if we have valid tokens */}
                    {config.token && (
                      <div className="rounded-lg border border-gray-200 p-4">
                        <div className="mb-4 flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-gray-900">
                            Detalii Configurație
                          </h3>
                          {!editingConfig ? (
                            <button
                              onClick={() => setEditingConfig(true)}
                              className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
                            >
                              <Edit className="mr-1 inline h-4 w-4" />
                              Editează
                            </button>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingConfig(false)}
                                className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
                              >
                                Anulează
                              </button>
                              <button
                                onClick={handleSaveConfig}
                                className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition hover:bg-primary/90"
                              >
                                Salvează
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">CIF</label>
                            {editingConfig ? (
                              <input
                                type="text"
                                value={configForm.cif}
                                onChange={(e) =>
                                  setConfigForm({ ...configForm, cif: e.target.value })
                                }
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            ) : (
                              <p className="mt-1 text-sm text-gray-900">{config.cif || '—'}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Client ID
                            </label>
                            {editingConfig ? (
                              <input
                                type="text"
                                value={configForm.clientId}
                                onChange={(e) =>
                                  setConfigForm({ ...configForm, clientId: e.target.value })
                                }
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            ) : (
                              <p className="mt-1 text-sm text-gray-900">{config.clientId || '—'}</p>
                            )}
                          </div>

                      {editingConfig && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Client Secret (lasă gol pentru a păstra pe cel curent)
                          </label>
                          <input
                            type="password"
                            value={configForm.clientSecret}
                            onChange={(e) =>
                              setConfigForm({ ...configForm, clientSecret: e.target.value })
                            }
                            placeholder="Introduce secret nou..."
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Redirect URI
                        </label>
                        {editingConfig ? (
                          <input
                            type="text"
                            value={configForm.redirectUri}
                            onChange={(e) =>
                              setConfigForm({ ...configForm, redirectUri: e.target.value })
                            }
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        ) : (
                          <p className="mt-1 text-sm text-gray-900">
                            {config.redirectUri || '—'}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Mediu
                        </label>
                        {editingConfig ? (
                          <select
                            value={configForm.environment}
                            onChange={(e) =>
                              setConfigForm({ ...configForm, environment: e.target.value })
                            }
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value="test">Test</option>
                            <option value="production">Production</option>
                          </select>
                        ) : (
                          <p className="mt-1 text-sm text-gray-900">
                            {config.environment === 'test' ? 'Test' : 'Production'}
                          </p>
                        )}
                      </div>
                    </div>

                    {editingConfig && config.environment === 'production' && (
                      <div className="mt-4 rounded-lg border border-yellow-300 bg-yellow-50 p-3">
                        <div className="flex">
                          <AlertCircle className="h-5 w-5 flex-shrink-0 text-yellow-600" />
                          <div className="ml-3">
                            <p className="text-sm font-medium text-yellow-800">
                              Atenție! Mediul Production
                            </p>
                            <p className="mt-1 text-sm text-yellow-700">
                              Modificările vor afecta sistemul de producție. Asigură-te că toate
                              setările sunt corecte.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                      </div>
                    )}
                  </>
                )}

                {/* Company Information */}
                {config.company && (
                  <>
                    {/* Company Information */}
                    {config.company && (
                      <div className="rounded-lg border border-gray-200 p-4">
                        <h3 className="mb-3 text-sm font-semibold text-gray-900">
                          Informații Companie
                        </h3>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <p className="text-xs text-gray-600">Denumire</p>
                            <p className="text-sm font-medium text-gray-900">
                              {config.company.name}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">CUI</p>
                            <p className="text-sm font-medium text-gray-900">
                              {config.company.vatNumber}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Nr. Reg. Com.</p>
                            <p className="text-sm font-medium text-gray-900">
                              {config.company.registrationNumber}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Email</p>
                            <p className="text-sm font-medium text-gray-900">
                              {config.company.email}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex gap-3">
                <select
                  value={invoiceFilters.status}
                  onChange={(e) => {
                    setInvoiceFilters({ ...invoiceFilters, status: e.target.value });
                    setPage(1);
                  }}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Toate statusurile</option>
                  <option value="DRAFT">Draft</option>
                  <option value="SENT">Trimisă</option>
                  <option value="PAID">Plătită</option>
                  <option value="CANCELLED">Anulată</option>
                </select>

                <select
                  value={invoiceFilters.anafStatus}
                  onChange={(e) => {
                    setInvoiceFilters({ ...invoiceFilters, anafStatus: e.target.value });
                    setPage(1);
                  }}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Status ANAF</option>
                  <option value="NOT_SUBMITTED">Netrimisă</option>
                  <option value="PENDING">În așteptare</option>
                  <option value="UPLOADED">Încărcată</option>
                  <option value="PROCESSING">În procesare</option>
                  <option value="OK">Validată</option>
                  <option value="ERROR">Eroare</option>
                </select>
              </div>

              {selectedInvoices.length > 0 && (
                <button
                  onClick={handleBulkSubmit}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90"
                >
                  <Upload className="mr-2 inline h-4 w-4" />
                  Trimite {selectedInvoices.length} facturi
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={(() => {
                          const submittableInvoices = invoices.filter(invoice => {
                            const anafSync = invoice.anafSync;
                            return invoice.status !== 'CANCELLED' && (!anafSync || anafSync.status === 'ERROR');
                          });
                          return submittableInvoices.length > 0 &&
                                 submittableInvoices.every(inv => selectedInvoices.includes(inv.id));
                        })()}
                        onChange={toggleAllInvoices}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        title="Selectează toate facturile care pot fi trimise"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Nr. Factură
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      ANAF
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Acțiuni
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {invoicesLoading ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-sm text-gray-500">
                        Se încarcă...
                      </td>
                    </tr>
                  ) : invoices.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center">
                        <FileText className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-sm font-medium text-gray-900">
                          Nicio factură
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          Creați o factură pentru a o putea trimite către ANAF
                        </p>
                      </td>
                    </tr>
                  ) : (
                    invoices.map((invoice) => {
                      const anafSync = invoice.anafSync;
                      const canSubmit = invoice.status !== 'CANCELLED' &&
                                       (!anafSync || anafSync.status === 'ERROR');

                      return (
                        <tr key={invoice.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedInvoices.includes(invoice.id)}
                              onChange={() => toggleInvoiceSelection(invoice.id)}
                              disabled={!canSubmit}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50"
                            />
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {invoice.invoiceNumber}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {invoice.client?.company ||
                               `${invoice.client?.firstName} ${invoice.client?.lastName}`}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {(invoice.total || 0).toFixed(2)} RON
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {new Date(invoice.issueDate).toLocaleDateString('ro-RO')}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                invoice.status === 'PAID'
                                  ? 'bg-green-100 text-green-800'
                                  : invoice.status === 'SENT'
                                  ? 'bg-blue-100 text-blue-800'
                                  : invoice.status === 'CANCELLED'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {invoice.status}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            {anafSync ? (
                              <span
                                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                  anafSync.status === 'OK'
                                    ? 'bg-green-100 text-green-800'
                                    : anafSync.status === 'ERROR'
                                    ? 'bg-red-100 text-red-800'
                                    : anafSync.status === 'PROCESSING'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {anafSync.status}
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800">
                                Netrimisă
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                            {canSubmit && (
                              <button
                                onClick={() => handleSubmitInvoice(invoice.id, invoice.invoiceNumber)}
                                disabled={submittingInvoices[invoice.id]}
                                className="text-primary hover:text-primary/80 disabled:opacity-50"
                              >
                                {submittingInvoices[invoice.id] ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Upload className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sync Status Tab */}
        {activeTab === 'sync-status' && (
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex gap-3">
                <select
                  value={syncFilters.status}
                  onChange={(e) => setSyncFilters({ ...syncFilters, status: e.target.value })}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Toate statusurile</option>
                  <option value="PENDING">Pending</option>
                  <option value="UPLOADED">Uploaded</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="OK">OK</option>
                  <option value="ERROR">Error</option>
                </select>
              </div>
              <button
                onClick={handleBatchSync}
                disabled={batchSyncing}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
              >
                {batchSyncing ? (
                  <>
                    <RefreshCw className="mr-2 inline h-4 w-4 animate-spin" />
                    Sincronizare...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 inline h-4 w-4" />
                    Sincronizare Batch
                  </>
                )}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Factură
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Data Upload
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      ANAF Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Acțiuni
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {syncLoading ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-sm text-gray-500">
                        Se încarcă...
                      </td>
                    </tr>
                  ) : syncRecords.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <FileCheck className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-sm font-medium text-gray-900">
                          Nicio înregistrare
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          Nu există facturi sincronizate cu ANAF.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    syncRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {record.invoice?.invoiceNumber || '—'}
                          </div>
                          {record.uploadIndex && (
                            <div className="text-xs text-gray-500">
                              Index: {record.uploadIndex}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {record.invoice?.client?.companyName ||
                              `${record.invoice?.client?.firstName || ''} ${
                                record.invoice?.client?.lastName || ''
                              }`.trim() ||
                              '—'}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {formatDate(record.uploadedAt)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              STATUS_BADGES[record.status] || STATUS_BADGES.PENDING
                            }`}
                          >
                            {record.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          {record.anafStatus ? (
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                ANAF_STATUS_BADGES[record.anafStatus] ||
                                ANAF_STATUS_BADGES.processing
                              }`}
                            >
                              {record.anafStatus}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleSyncInvoice(record.invoiceId)}
                              disabled={syncingInvoices[record.invoiceId]}
                              className="text-primary hover:text-primary/80 disabled:opacity-50"
                              title="Sincronizează status"
                            >
                              <RefreshCw
                                className={`h-4 w-4 ${
                                  syncingInvoices[record.invoiceId] ? 'animate-spin' : ''
                                }`}
                              />
                            </button>
                            {record.status === 'ERROR' && (
                              <button
                                onClick={() => handleRetryInvoice(record.invoiceId)}
                                disabled={syncingInvoices[record.invoiceId]}
                                className="text-orange-600 hover:text-orange-800 disabled:opacity-50"
                                title="Retrimite"
                              >
                                <Send className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() =>
                                handleDownloadXml(
                                  record.invoiceId,
                                  record.invoice?.invoiceNumber
                                )
                              }
                              className="text-gray-600 hover:text-gray-900"
                              title="Descarcă XML"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="p-6">
            <div className="mb-4">
              <select
                value={messagesFilters.type}
                onChange={(e) => setMessagesFilters({ ...messagesFilters, type: e.target.value })}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {Object.entries(MESSAGE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      ID Mesaj
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Tip
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Dată
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      CIF
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Descărcat
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Acțiuni
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {messagesLoading ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-sm text-gray-500">
                        Se încarcă...
                      </td>
                    </tr>
                  ) : messages.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <Mail className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-sm font-medium text-gray-900">Niciun mesaj</p>
                        <p className="mt-1 text-sm text-gray-500">Nu există mesaje de la ANAF.</p>
                      </td>
                    </tr>
                  ) : (
                    messages.map((message) => (
                      <tr key={message.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                          {message.id}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {MESSAGE_TYPE_LABELS[message.type] || message.type}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {formatDateShort(message.createdAt)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {message.cif || '—'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          {message.downloaded ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-gray-400" />
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewMessage(message)}
                              className="text-gray-600 hover:text-gray-900"
                              title="Vezi detalii"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {message.downloadId && (
                              <button
                                onClick={() => handleDownloadMessage(message.id, message.tip)}
                                disabled={downloadingMessages[message.id]}
                                className="text-primary hover:text-primary/80 disabled:opacity-50"
                                title="Descarcă mesaj"
                              >
                                <Download
                                  className={`h-4 w-4 ${
                                    downloadingMessages[message.id] ? 'animate-pulse' : ''
                                  }`}
                                />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'statistics' && (
          <div className="p-6">
            {statsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
              </div>
            ) : !statistics ? (
              <div className="py-12 text-center">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm font-medium text-gray-900">
                  Nu există date statistice
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Trimite prima factură către ANAF pentru a vedea statistici.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Total Facturi Trimise
                        </p>
                        <p className="mt-2 text-3xl font-bold text-gray-900">
                          {statistics.total || 0}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Trimise către ANAF
                        </p>
                      </div>
                      <div className="rounded-full bg-gray-100 p-3">
                        <FileCheck className="h-8 w-8 text-gray-600" />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-green-200 bg-green-50 p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-green-600 uppercase tracking-wide">
                          Validate cu Succes
                        </p>
                        <p className="mt-2 text-3xl font-bold text-green-900">
                          {statistics.OK || 0}
                        </p>
                        <p className="mt-1 text-xs text-green-600">
                          Acceptate de ANAF
                        </p>
                      </div>
                      <div className="rounded-full bg-green-100 p-3">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-red-200 bg-red-50 p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-red-600 uppercase tracking-wide">
                          Erori de Validare
                        </p>
                        <p className="mt-2 text-3xl font-bold text-red-900">
                          {statistics.ERROR || 0}
                        </p>
                        <p className="mt-1 text-xs text-red-600">
                          Necesită atenție
                        </p>
                      </div>
                      <div className="rounded-full bg-red-100 p-3">
                        <XCircle className="h-8 w-8 text-red-600" />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-yellow-600 uppercase tracking-wide">
                          În Curs de Procesare
                        </p>
                        <p className="mt-2 text-3xl font-bold text-yellow-900">
                          {(statistics.PENDING || 0) +
                            (statistics.UPLOADED || 0) +
                            (statistics.PROCESSING || 0)}
                        </p>
                        <p className="mt-1 text-xs text-yellow-600">
                          Așteaptă validare
                        </p>
                      </div>
                      <div className="rounded-full bg-yellow-100 p-3">
                        <Clock className="h-8 w-8 text-yellow-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Success Rate */}
                {statistics.total > 0 && (
                  <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      Rata de Succes
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 transition-all duration-500"
                            style={{
                              width: `${((statistics.OK || 0) / statistics.total) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">
                          {Math.round(((statistics.OK || 0) / statistics.total) * 100)}%
                        </p>
                        <p className="text-xs text-gray-500">din total</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Detailed Breakdown */}
                <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 text-sm font-semibold text-gray-900">
                    Detalii pe Status
                  </h3>
                  <p className="mb-4 text-xs text-gray-500">
                    Distribuția facturilor pe fiecare status de procesare ANAF:
                  </p>
                  <div className="space-y-3">
                    {statistics.byStatus && Object.entries(statistics.byStatus).length > 0 ? (
                      Object.entries(statistics.byStatus).map(([status, count]) => {
                        const statusDescriptions = {
                          PENDING: 'Așteptând încărcare',
                          UPLOADING: 'Se încarcă pe server ANAF',
                          UPLOADED: 'Încărcată, așteaptă procesare',
                          PROCESSING: 'Se validează de ANAF',
                          OK: 'Validată și acceptată',
                          ERROR: 'Eroare la validare',
                          REJECTED: 'Respinsă de ANAF',
                        };

                        return (
                          <div key={status} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                            <div className="flex items-center gap-3 flex-1">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                                  STATUS_BADGES[status] || STATUS_BADGES.PENDING
                                }`}
                              >
                                {status}
                              </span>
                              <span className="text-xs text-gray-500">
                                {statusDescriptions[status] || status}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className="text-lg font-semibold text-gray-900">{count}</span>
                                <span className="ml-1 text-xs text-gray-500">
                                  ({Math.round((count / statistics.total) * 100)}%)
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-center text-sm text-gray-500 py-4">
                        Nu există date disponibile
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>


      {/* Production Confirmation Modal */}
      {confirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl">
            {/* Header */}
            <div className="bg-red-50 px-6 py-4 border-b border-red-200">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-red-100 p-2">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-900">
                    ⚠️ Confirmare Trimitere către ANAF REAL
                  </h3>
                  <p className="text-xs text-red-700">
                    Această acțiune este IREVERSIBILĂ
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="space-y-4">
                <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
                  <p className="text-sm font-medium text-yellow-900">
                    Ești pe cale să trimiți factura către sistemul ANAF oficial:
                  </p>
                  <p className="mt-2 text-lg font-bold text-yellow-900">
                    {confirmSubmit.invoiceNumber}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-bold text-gray-900">ATENȚIE:</p>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Această acțiune NU poate fi anulată</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Factura va fi înregistrată în sistemul ANAF real</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Erorile pot genera probleme fiscale</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Verifică toate datele înainte de a continua</span>
                    </li>
                  </ul>
                </div>

                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                  <p className="text-xs text-blue-800">
                    💡 Sfat: Folosește mediul Test pentru testare. Poți schimba mediul din tabul Configurație.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
              <button
                onClick={() => setConfirmSubmit(null)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Anulează
              </button>
              <button
                onClick={async () => {
                  const invoiceId = confirmSubmit.invoiceId;
                  setConfirmSubmit(null);
                  await performInvoiceSubmit(invoiceId);
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 transition"
              >
                DA, Trimite către ANAF REAL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Viewer Modal */}
      {viewingMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Detalii Mesaj ANAF</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {viewingMessage.anafMessageId || viewingMessage.id}
                </p>
              </div>
              <button
                onClick={() => setViewingMessage(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[60vh] overflow-y-auto p-6">
              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tip Mesaj</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {viewingMessage.tip || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">CIF</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {viewingMessage.cif || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Data Creare</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {viewingMessage.dataCreare ? formatDate(viewingMessage.dataCreare) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">ID Solicitare</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {viewingMessage.solicitareId || '—'}
                    </p>
                  </div>
                </div>

                {/* Metadata */}
                {viewingMessage.metadata && (
                  <div className="mt-6">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Metadate Complete
                    </p>
                    <div className="rounded-lg bg-gray-50 p-4 border border-gray-200">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">
                        {JSON.stringify(viewingMessage.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
              {viewingMessage.downloadId && (
                <button
                  onClick={() => {
                    handleDownloadMessage(viewingMessage.id, viewingMessage.tip);
                    setViewingMessage(null);
                  }}
                  disabled={downloadingMessages[viewingMessage.id]}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition disabled:opacity-50"
                >
                  <Download className="mr-2 inline h-4 w-4" />
                  Descarcă Mesaj
                </button>
              )}
              <button
                onClick={() => setViewingMessage(null)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnafManagement;
