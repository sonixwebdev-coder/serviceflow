import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import useAuth from '../context/useAuth';
import useToast from '../context/useToast';
import {
  getAnafConfig,
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
} from '../services/anafService';

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
  const [configForm, setConfigForm] = useState({});

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

  // Statistics state
  const [statistics, setStatistics] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const isAdmin = hasRole('admin');

  // Load configuration
  useEffect(() => {
    loadConfiguration();
  }, []);

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'sync-status') {
      loadSyncRecords();
    } else if (activeTab === 'messages') {
      loadMessages();
    } else if (activeTab === 'statistics') {
      loadStatistics();
    }
  }, [activeTab, syncFilters, messagesFilters]);

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
      const records = await getSyncRecords(syncFilters);
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

  const tabs = [
    { id: 'configuration', label: 'Configurație', icon: Settings },
    { id: 'sync-status', label: 'Status Sincronizare', icon: RefreshCw },
    { id: 'messages', label: 'Mesaje', icon: Mail },
    { id: 'statistics', label: 'Statistici', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ANAF E-Factură</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestionează integrarea cu sistemul ANAF SPV (E-Factură)
          </p>
        </div>
        <FileCheck className="h-8 w-8 text-viperx-primary" />
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
                    ? 'border-viperx-primary text-viperx-primary'
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
      <div className="rounded-lg border border-gray-200 bg-white">
        {/* Configuration Tab */}
        {activeTab === 'configuration' && (
          <div className="p-6">
            {configLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-viperx-primary" />
              </div>
            ) : !config ? (
              <div className="py-12 text-center">
                <Settings className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm font-medium text-gray-900">Nicio configurație</p>
                <p className="mt-1 text-sm text-gray-500">
                  Configurația ANAF nu a fost încă setată. Contactează un administrator.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Connection Status */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Status Conexiune</h3>
                      <p className="mt-1 text-sm text-gray-600">
                        {config.token
                          ? 'Conectat la ANAF'
                          : 'Neconectat - autentificare necesară'}
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
                        className="rounded-lg bg-viperx-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-viperx-primary/90"
                      >
                        <ExternalLink className="mr-2 inline h-4 w-4" />
                        Conectează ANAF
                      </button>
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
                </div>

                {/* Configuration Details */}
                {isAdmin && (
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
                            className="rounded-lg bg-viperx-primary px-3 py-1.5 text-sm font-medium text-white transition hover:bg-viperx-primary/90"
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
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
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
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
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
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
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
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
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
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
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

                {/* Company Info */}
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
              </div>
            )}
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
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
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
                className="rounded-lg bg-viperx-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-viperx-primary/90 disabled:opacity-50"
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
                              className="text-viperx-primary hover:text-viperx-primary/80 disabled:opacity-50"
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
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
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
                          <button
                            onClick={() => handleDownloadMessage(message.id, message.type)}
                            disabled={downloadingMessages[message.id]}
                            className="text-viperx-primary hover:text-viperx-primary/80 disabled:opacity-50"
                            title="Descarcă mesaj"
                          >
                            <Download
                              className={`h-4 w-4 ${
                                downloadingMessages[message.id] ? 'animate-pulse' : ''
                              }`}
                            />
                          </button>
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
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-viperx-primary" />
              </div>
            ) : !statistics ? (
              <div className="py-12 text-center">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm font-medium text-gray-900">
                  Nu există date statistice
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Sincronizate</p>
                        <p className="mt-2 text-3xl font-bold text-gray-900">
                          {statistics.total || 0}
                        </p>
                      </div>
                      <FileCheck className="h-8 w-8 text-gray-400" />
                    </div>
                  </div>

                  <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-600">Reușite (OK)</p>
                        <p className="mt-2 text-3xl font-bold text-green-900">
                          {statistics.OK || 0}
                        </p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                  </div>

                  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-600">Erori</p>
                        <p className="mt-2 text-3xl font-bold text-red-900">
                          {statistics.ERROR || 0}
                        </p>
                      </div>
                      <XCircle className="h-8 w-8 text-red-600" />
                    </div>
                  </div>

                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-yellow-600">În Procesare</p>
                        <p className="mt-2 text-3xl font-bold text-yellow-900">
                          {(statistics.PENDING || 0) +
                            (statistics.UPLOADED || 0) +
                            (statistics.PROCESSING || 0)}
                        </p>
                      </div>
                      <Clock className="h-8 w-8 text-yellow-600" />
                    </div>
                  </div>
                </div>

                {/* Detailed Breakdown */}
                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="mb-4 text-sm font-semibold text-gray-900">
                    Detalii pe Status
                  </h3>
                  <div className="space-y-3">
                    {statistics.byStatus && Object.entries(statistics.byStatus)
                      .map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                                STATUS_BADGES[status] || STATUS_BADGES.PENDING
                              }`}
                            >
                              {status}
                            </span>
                          </div>
                          <span className="text-lg font-semibold text-gray-900">{count}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnafManagement;
