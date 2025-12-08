import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import roDateLocale from 'date-fns/locale/ro';
import {
  FileText,
  Download,
  Send,
  CheckCircle,
  X,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
} from 'lucide-react';
import useInvoices, {
  useInvoice,
  useUpdateInvoice,
  useDeleteInvoice,
  useMarkInvoiceAsSent,
  useMarkInvoiceAsPaid,
} from '../hooks/useInvoices';
import useAuth from '../context/useAuth';
import useToast from '../context/useToast';
import { downloadInvoicePdf } from '../services/invoiceService';
import Pagination from '../components/Pagination';
import ExportButton from '../components/ExportButton';

const INVOICE_STATUS = {
  DRAFT: 'draft',
  GENERATED: 'generated',
  SENT: 'sent',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
};

const STATUS_META = {
  [INVOICE_STATUS.DRAFT]: { label: 'Ciornă', class: 'bg-gray-50 text-gray-700 border-gray-200' },
  [INVOICE_STATUS.GENERATED]: { label: 'Generată', class: 'bg-blue-50 text-blue-700 border-blue-200' },
  [INVOICE_STATUS.SENT]: { label: 'Trimisă', class: 'bg-purple-50 text-purple-700 border-purple-200' },
  [INVOICE_STATUS.PAID]: { label: 'Plătită', class: 'bg-green-50 text-green-700 border-green-200' },
  [INVOICE_STATUS.OVERDUE]: { label: 'Întârziată', class: 'bg-red-50 text-red-700 border-red-200' },
  [INVOICE_STATUS.CANCELLED]: { label: 'Anulată', class: 'bg-gray-50 text-gray-500 border-gray-200' },
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
  }).format(value || 0);
};

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return format(new Date(value), 'dd MMM yyyy', { locale: roDateLocale });
  } catch {
    return '—';
  }
};

const Invoices = () => {
  const { showToast } = useToast();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    notes: '',
    dueDate: '',
    status: '',
    lineItems: [],
  });

  const filters = useMemo(() => {
    const params = {};
    if (searchTerm) params.search = searchTerm;
    if (statusFilter) params.status = statusFilter;
    return params;
  }, [searchTerm, statusFilter]);

  const { invoices, meta, loading, page, setPage, refresh } = useInvoices(filters, {
    enablePagination: true,
  });

  const { data: selectedInvoice, isLoading: invoiceLoading } = useInvoice(selectedInvoiceId);
  const updateInvoiceMutation = useUpdateInvoice();
  const deleteInvoiceMutation = useDeleteInvoice();
  const markAsSentMutation = useMarkInvoiceAsSent();
  const markAsPaidMutation = useMarkInvoiceAsPaid();

  // Initialize edit form when invoice loads
  const handleOpenDrawer = (invoiceId) => {
    setSelectedInvoiceId(invoiceId);
    setIsEditing(false);
    setEditForm({ notes: '', dueDate: '', status: '', lineItems: [] }); // Reset form
  };

  // When invoice data loads, populate edit form using useEffect
  const [formInitialized, setFormInitialized] = useState(false);

  if (selectedInvoice && !formInitialized) {
    setEditForm({
      notes: selectedInvoice.notes || '',
      dueDate: selectedInvoice.dueDate ? format(new Date(selectedInvoice.dueDate), 'yyyy-MM-dd') : '',
      status: selectedInvoice.status || 'draft',
      lineItems: selectedInvoice.lineItems?.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })) || [],
    });
    setFormInitialized(true);
  }

  if (!selectedInvoiceId && formInitialized) {
    setFormInitialized(false);
  }

  // Calculate totals dynamically when editing
  const calculatedTotals = useMemo(() => {
    if (!isEditing || !editForm.lineItems) {
      return null;
    }
    const subtotal = editForm.lineItems.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      return sum + (quantity * unitPrice);
    }, 0);
    const tax = selectedInvoice?.tax || 0;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }, [isEditing, editForm.lineItems, selectedInvoice?.tax]);

  const handleAddLineItem = () => {
    setEditForm({
      ...editForm,
      lineItems: [
        ...editForm.lineItems,
        { name: '', description: '', quantity: 1, unitPrice: 0 },
      ],
    });
  };

  const handleRemoveLineItem = (index) => {
    setEditForm({
      ...editForm,
      lineItems: editForm.lineItems.filter((_, i) => i !== index),
    });
  };

  const handleLineItemChange = (index, field, value) => {
    const newLineItems = [...editForm.lineItems];
    newLineItems[index] = { ...newLineItems[index], [field]: value };
    setEditForm({ ...editForm, lineItems: newLineItems });
  };

  const handleSaveEdit = async () => {
    if (!selectedInvoice) return;

    // Validate line items
    if (editForm.lineItems.length === 0) {
      showToast({
        title: 'Eroare validare',
        description: 'Trebuie să existe cel puțin un articol.',
        type: 'error',
      });
      return;
    }

    for (let i = 0; i < editForm.lineItems.length; i++) {
      const item = editForm.lineItems[i];
      if (!item.name || !item.name.trim()) {
        showToast({
          title: 'Eroare validare',
          description: `Articolul ${i + 1} trebuie să aibă o denumire.`,
          type: 'error',
        });
        return;
      }
      if (!item.quantity || Number(item.quantity) <= 0) {
        showToast({
          title: 'Eroare validare',
          description: `Articolul ${i + 1} trebuie să aibă o cantitate pozitivă.`,
          type: 'error',
        });
        return;
      }
      if (Number(item.unitPrice) < 0) {
        showToast({
          title: 'Eroare validare',
          description: `Articolul ${i + 1} nu poate avea preț negativ.`,
          type: 'error',
        });
        return;
      }
    }

    try {
      await updateInvoiceMutation.mutateAsync({
        id: selectedInvoice.id,
        notes: editForm.notes,
        dueDate: editForm.dueDate ? new Date(editForm.dueDate).toISOString() : selectedInvoice.dueDate,
        status: editForm.status,
        lineItems: editForm.lineItems.map((item, index) => ({
          name: item.name,
          description: item.description || null,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          order: index,
        })),
      });
      setIsEditing(false);
      showToast({
        title: 'Factură actualizată',
        description: 'Modificările au fost salvate cu succes.',
        type: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Eroare',
        description: error.message || 'Nu s-a putut actualiza factura.',
        type: 'error',
      });
    }
  };

  const handleDownloadPdf = async (invoice) => {
    setDownloadingPdf((prev) => ({ ...prev, [invoice.id]: true }));
    try {
      const blob = await downloadInvoicePdf(invoice.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast({
        title: 'PDF descărcat',
        description: `Factura ${invoice.invoiceNumber} a fost descărcată cu succes.`,
        type: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Eroare',
        description: 'Nu s-a putut descărca PDF-ul facturii.',
        type: 'error',
      });
    } finally {
      setDownloadingPdf((prev) => ({ ...prev, [invoice.id]: false }));
    }
  };

  const handleMarkAsSent = async (invoice) => {
    try {
      await markAsSentMutation.mutateAsync(invoice.id);
      showToast({
        title: 'Factură trimisă',
        description: `Factura ${invoice.invoiceNumber} a fost marcată ca trimisă.`,
        type: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Eroare',
        description: error.message || 'Nu s-a putut marca factura ca trimisă.',
        type: 'error',
      });
    }
  };

  const handleMarkAsPaid = async (invoice) => {
    try {
      await markAsPaidMutation.mutateAsync(invoice.id);
      showToast({
        title: 'Factură plătită',
        description: `Factura ${invoice.invoiceNumber} a fost marcată ca plătită.`,
        type: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Eroare',
        description: error.message || 'Nu s-a putut marca factura ca plătită.',
        type: 'error',
      });
    }
  };

  const handleDelete = async (invoice) => {
    if (!confirm(`Sigur vrei să ștergi factura ${invoice.invoiceNumber}?`)) {
      return;
    }

    try {
      await deleteInvoiceMutation.mutateAsync(invoice.id);
      showToast({
        title: 'Factură ștearsă',
        description: `Factura ${invoice.invoiceNumber} a fost ștearsă cu succes.`,
        type: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Eroare',
        description: error.message || 'Nu s-a putut șterge factura.',
        type: 'error',
      });
    }
  };

  const getClientName = (invoice) => {
    if (!invoice.client) return '—';
    const { client } = invoice;
    if (client.type === 'SRL') {
      return client.companyName || '—';
    }
    return `${client.firstName || ''} ${client.lastName || ''}`.trim() || '—';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturi</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestionează facturile pentru clienți
          </p>
        </div>
        <ExportButton
          entityType="invoices"
          filters={{
            search: searchTerm,
            status: statusFilter,
          }}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 sm:flex-row">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Caută după număr factură..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
            />
          </div>
        </div>
        <div className="sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
          >
            <option value="">Toate statusurile</option>
            {Object.entries(STATUS_META).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table - Desktop */}
      <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Număr
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Dată emitere
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Scadență
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Acțiuni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading && invoices.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-sm text-gray-500">
                    Se încarcă...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm font-medium text-gray-900">Nicio factură</p>
                    <p className="mt-1 text-sm text-gray-500">
                      Creează prima factură din detaliile unei programări finalizate.
                    </p>
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => {
                  const statusMeta = STATUS_META[invoice.status] || STATUS_META.draft;
                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center">
                          <FileText className="mr-2 h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {invoice.invoiceNumber}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{getClientName(invoice)}</div>
                        {invoice.client?.phone && (
                          <div className="text-xs text-gray-500">{invoice.client.phone}</div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {formatDate(invoice.issueDate)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {formatDate(invoice.dueDate)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-gray-900">
                        {formatCurrency(invoice.total)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusMeta.class}`}
                        >
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenDrawer(invoice.id)}
                            className="text-viperx-primary hover:text-viperx-primary/80"
                            title="Vezi detalii"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDownloadPdf(invoice)}
                            disabled={downloadingPdf[invoice.id]}
                            className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
                            title="Descarcă PDF"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          {invoice.status === INVOICE_STATUS.GENERATED && (
                            <button
                              onClick={() => handleMarkAsSent(invoice)}
                              className="text-purple-600 hover:text-purple-900"
                              title="Marchează trimisă"
                            >
                              <Send className="h-4 w-4" />
                            </button>
                          )}
                          {(invoice.status === INVOICE_STATUS.SENT ||
                            invoice.status === INVOICE_STATUS.OVERDUE) && (
                            <button
                              onClick={() => handleMarkAsPaid(invoice)}
                              className="text-green-600 hover:text-green-900"
                              title="Marchează plătită"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          {invoice.status !== INVOICE_STATUS.PAID && (
                            <button
                              onClick={() => handleDelete(invoice)}
                              className="text-red-600 hover:text-red-900"
                              title="Șterge"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cards - Mobile */}
      <div className="space-y-4 lg:hidden">
        {loading && invoices.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-500">
            Se încarcă...
          </div>
        ) : invoices.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm font-medium text-gray-900">Nicio factură</p>
            <p className="mt-1 text-sm text-gray-500">
              Creează prima factură din detaliile unei programări finalizate.
            </p>
          </div>
        ) : (
          invoices.map((invoice) => {
            const statusMeta = STATUS_META[invoice.status] || STATUS_META.draft;
            return (
              <div
                key={invoice.id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 flex-shrink-0 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {invoice.invoiceNumber}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-900 truncate">{getClientName(invoice)}</div>
                    {invoice.client?.phone && (
                      <div className="mt-0.5 text-xs text-gray-500">{invoice.client.phone}</div>
                    )}
                  </div>
                  <span
                    className={`inline-flex flex-shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusMeta.class}`}
                  >
                    {statusMeta.label}
                  </span>
                </div>

                <div className="mb-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Emitere:</span>
                    <span className="text-gray-900">{formatDate(invoice.issueDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Scadență:</span>
                    <span className="text-gray-900">{formatDate(invoice.dueDate)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-1 font-medium">
                    <span className="text-gray-900">Total:</span>
                    <span className="text-gray-900">{formatCurrency(invoice.total)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleOpenDrawer(invoice.id)}
                    className="flex-1 rounded-lg bg-viperx-primary px-3 py-2 text-sm font-medium text-white transition hover:bg-viperx-primary/90"
                  >
                    Vezi detalii
                  </button>
                  <button
                    onClick={() => handleDownloadPdf(invoice)}
                    disabled={downloadingPdf[invoice.id]}
                    className="rounded-lg border border-gray-300 bg-white p-2 text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                    title="Descarcă PDF"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  {invoice.status === INVOICE_STATUS.GENERATED && (
                    <button
                      onClick={() => handleMarkAsSent(invoice)}
                      className="rounded-lg border border-purple-300 bg-purple-50 p-2 text-purple-600 transition hover:bg-purple-100"
                      title="Marchează trimisă"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  )}
                  {(invoice.status === INVOICE_STATUS.SENT ||
                    invoice.status === INVOICE_STATUS.OVERDUE) && (
                    <button
                      onClick={() => handleMarkAsPaid(invoice)}
                      className="rounded-lg border border-green-300 bg-green-50 p-2 text-green-600 transition hover:bg-green-100"
                      title="Marchează plătită"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                  )}
                  {invoice.status !== INVOICE_STATUS.PAID && (
                    <button
                      onClick={() => handleDelete(invoice)}
                      className="rounded-lg border border-red-300 bg-red-50 p-2 text-red-600 transition hover:bg-red-100"
                      title="Șterge"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={meta.totalPages}
          onPageChange={setPage}
          totalItems={meta.totalItems}
          pageSize={meta.pageSize}
        />
      )}

      {/* Invoice Details Drawer */}
      {selectedInvoiceId && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-30 bg-black/20"
            style={{ margin: 0 }}
            onClick={() => setSelectedInvoiceId(null)}
          />

          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-gray-200 bg-white shadow-xl sm:max-w-3xl" style={{ margin: 0, padding: 0 }}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4 sm:px-6">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-gray-900">
                  Detalii Factură
                </h2>
                {!invoiceLoading && selectedInvoice && (
                  <p className="mt-1 text-sm text-gray-500 truncate">
                    {selectedInvoice.invoiceNumber} • {getClientName(selectedInvoice)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                {!invoiceLoading && selectedInvoice && selectedInvoice.status !== INVOICE_STATUS.PAID && (
                  <>
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="rounded-lg px-2 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-100 sm:px-3 sm:text-sm"
                        >
                          Anulează
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          disabled={updateInvoiceMutation.isPending}
                          className="rounded-lg bg-viperx-primary px-2 py-1.5 text-xs font-medium text-white transition hover:bg-viperx-primary/90 disabled:opacity-50 sm:px-3 sm:text-sm"
                        >
                          {updateInvoiceMutation.isPending ? 'Se salvează...' : 'Salvează'}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="rounded-lg bg-gray-100 px-2 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-200 sm:px-3 sm:text-sm"
                      >
                        <Edit className="mr-1 inline h-3 w-3 sm:mr-1.5 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Editează</span>
                        <span className="sm:hidden">Edit</span>
                      </button>
                    )}
                  </>
                )}
                <button
                  onClick={() => {
                    setSelectedInvoiceId(null);
                    setIsEditing(false);
                    setEditForm({ notes: '', dueDate: '' });
                    setFormInitialized(false);
                  }}
                  className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 sm:p-2"
                >
                  <X size={18} className="sm:hidden" />
                  <X size={20} className="hidden sm:block" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {invoiceLoading ? (
                <div className="flex h-full items-center justify-center p-4 sm:p-6">
                  <p className="text-sm text-gray-500">Se încarcă...</p>
                </div>
              ) : selectedInvoice ? (
                <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
                  {/* Status Badge/Selector */}
                  <div>
                    {isEditing ? (
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">Status</label>
                        <select
                          value={editForm.status}
                          onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                        >
                          {Object.entries(STATUS_META).map(([value, { label }]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${
                          STATUS_META[selectedInvoice.status]?.class || STATUS_META.draft.class
                        }`}
                      >
                        {STATUS_META[selectedInvoice.status]?.label || 'Ciornă'}
                      </span>
                    )}
                  </div>

                  {/* Invoice Details */}
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4" style={{ margin: 0 }}>
                    <h3 className="mb-3 text-sm font-semibold text-gray-900">Detalii Factură</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Număr:</span>
                        <span className="font-medium text-gray-900">{selectedInvoice.invoiceNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Dată emitere:</span>
                        <span className="text-gray-900">{formatDate(selectedInvoice.issueDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Dată scadență:</span>
                        {isEditing ? (
                          <input
                            type="date"
                            value={editForm.dueDate}
                            onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                            className="rounded border border-gray-300 px-2 py-1 text-sm"
                          />
                        ) : (
                          <span className="text-gray-900">{formatDate(selectedInvoice.dueDate)}</span>
                        )}
                      </div>
                      {selectedInvoice.sentAt && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Trimisă la:</span>
                          <span className="text-gray-900">{formatDate(selectedInvoice.sentAt)}</span>
                        </div>
                      )}
                      {selectedInvoice.paidAt && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Plătită la:</span>
                          <span className="text-gray-900">{formatDate(selectedInvoice.paidAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Client Details */}
                  {selectedInvoice.client && (
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                      <h3 className="mb-3 text-sm font-semibold text-gray-900">Client</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Nume:</span>
                          <span className="text-gray-900">{getClientName(selectedInvoice)}</span>
                        </div>
                        {selectedInvoice.client.phone && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Telefon:</span>
                            <span className="text-gray-900">{selectedInvoice.client.phone}</span>
                          </div>
                        )}
                        {selectedInvoice.client.email && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Email:</span>
                            <span className="text-gray-900">{selectedInvoice.client.email}</span>
                          </div>
                        )}
                        {selectedInvoice.client.vatNumber && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">CUI:</span>
                            <span className="text-gray-900">{selectedInvoice.client.vatNumber}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Line Items */}
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">Articole</h3>
                      {isEditing && (
                        <button
                          onClick={handleAddLineItem}
                          className="rounded-lg bg-viperx-primary px-3 py-1 text-xs font-medium text-white transition hover:bg-viperx-primary/90"
                        >
                          + Adaugă articol
                        </button>
                      )}
                    </div>
                    <div className="overflow-x-auto">
                      {isEditing ? (
                        <div className="space-y-3">
                          {editForm.lineItems.map((item, index) => (
                            <div key={index} className="rounded-lg border border-gray-200 p-3 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 space-y-2">
                                  <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-700">
                                      Denumire *
                                    </label>
                                    <input
                                      type="text"
                                      value={item.name}
                                      onChange={(e) => handleLineItemChange(index, 'name', e.target.value)}
                                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                                      placeholder="Nume articol"
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-700">
                                      Descriere
                                    </label>
                                    <input
                                      type="text"
                                      value={item.description}
                                      onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                                      placeholder="Descriere opțională"
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="mb-1 block text-xs font-medium text-gray-700">
                                        Cantitate *
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={item.quantity}
                                        onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                                        className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                                      />
                                    </div>
                                    <div>
                                      <label className="mb-1 block text-xs font-medium text-gray-700">
                                        Preț unitar *
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={item.unitPrice}
                                        onChange={(e) => handleLineItemChange(index, 'unitPrice', e.target.value)}
                                        className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                                      />
                                    </div>
                                  </div>
                                  <div className="pt-1 text-xs text-gray-600">
                                    Total: {formatCurrency(Number(item.quantity || 0) * Number(item.unitPrice || 0))}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleRemoveLineItem(index)}
                                  className="rounded p-1 text-red-600 transition hover:bg-red-50"
                                  title="Șterge articol"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                          {editForm.lineItems.length === 0 && (
                            <p className="py-4 text-center text-sm text-gray-500">
                              Niciun articol. Apasă butonul de mai sus pentru a adăuga unul.
                            </p>
                          )}
                        </div>
                      ) : (
                        <table className="min-w-full text-sm">
                          <thead className="border-b border-gray-200 bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium text-gray-600">Articol</th>
                              <th className="px-3 py-2 text-right font-medium text-gray-600">Piese</th>
                              <th className="px-3 py-2 text-right font-medium text-gray-600">Manopera</th>
                              <th className="px-3 py-2 text-right font-medium text-gray-600">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {selectedInvoice.lineItems?.map((item) => (
                              <tr key={item.id}>
                                <td className="px-3 py-2">
                                  <div className="font-medium text-gray-900">{item.name}</div>
                                  {item.description && (
                                    <div className="text-xs text-gray-500">{item.description}</div>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <div className="text-gray-900">
                                    {item.hardwareQuantity > 0 && (
                                      <>
                                        {item.hardwareQuantity} {item.hardwareUnit || 'buc'} × {formatCurrency(item.hardwarePrice)}
                                      </>
                                    )}
                                    {item.hardwareQuantity === 0 && <span className="text-gray-400">-</span>}
                                  </div>
                                  {item.hardwareQuantity > 0 && (
                                    <div className="text-xs text-gray-500">
                                      = {formatCurrency(item.hardwareQuantity * item.hardwarePrice)}
                                    </div>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <div className="text-gray-900">
                                    {item.laborQuantity > 0 && (
                                      <>
                                        {item.laborQuantity} {item.laborUnit || 'ora'} × {formatCurrency(item.laborPrice)}
                                      </>
                                    )}
                                    {item.laborQuantity === 0 && <span className="text-gray-400">-</span>}
                                  </div>
                                  {item.laborQuantity > 0 && (
                                    <div className="text-xs text-gray-500">
                                      = {formatCurrency(item.laborQuantity * item.laborPrice)}
                                    </div>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right font-medium text-gray-900">
                                  {formatCurrency(item.totalPrice)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="text-gray-900">
                          {formatCurrency(isEditing && calculatedTotals ? calculatedTotals.subtotal : selectedInvoice.subtotal)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">TVA:</span>
                        <span className="text-gray-900">
                          {formatCurrency(isEditing && calculatedTotals ? calculatedTotals.tax : selectedInvoice.tax)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-gray-300 pt-2 text-base font-semibold">
                        <span className="text-gray-900">Total:</span>
                        <span className="text-gray-900">
                          {formatCurrency(isEditing && calculatedTotals ? calculatedTotals.total : selectedInvoice.total)}
                        </span>
                      </div>

                      {/* Payment Information */}
                      {selectedInvoice.advancePayment > 0 && (
                        <>
                          <div className="flex justify-between border-t border-gray-200 pt-2">
                            <span className="text-blue-600">Avans plătit:</span>
                            <span className="text-blue-600">
                              -{formatCurrency(selectedInvoice.advancePayment)}
                            </span>
                          </div>
                          <div className="flex justify-between text-base font-semibold">
                            <span className={selectedInvoice.remainingBalance > 0 ? 'text-orange-600' : 'text-green-600'}>
                              {selectedInvoice.remainingBalance > 0 ? 'Rest de plată:' : 'Achitat integral'}
                            </span>
                            <span className={selectedInvoice.remainingBalance > 0 ? 'text-orange-600' : 'text-green-600'}>
                              {selectedInvoice.remainingBalance > 0 ? formatCurrency(selectedInvoice.remainingBalance) : '✓'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  {(isEditing || selectedInvoice.notes) && (
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                      <h3 className="mb-2 text-sm font-semibold text-gray-900">Observații</h3>
                      {isEditing ? (
                        <textarea
                          value={editForm.notes}
                          onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                          rows={4}
                          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                          placeholder="Adaugă observații..."
                        />
                      ) : (
                        <p className="whitespace-pre-wrap text-sm text-gray-600">{selectedInvoice.notes}</p>
                      )}
                    </div>
                  )}

                  {/* PDF Preview */}
                  {selectedInvoice.pdfUrl && (
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                      <h3 className="mb-3 text-sm font-semibold text-gray-900">Previzualizare PDF</h3>
                      <iframe
                        title={`Factură ${selectedInvoice.invoiceNumber}`}
                        src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${selectedInvoice.pdfUrl}#toolbar=0`}
                        className="h-96 w-full rounded border border-gray-200 bg-white"
                      />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
                    <button
                      onClick={() => handleDownloadPdf(selectedInvoice)}
                      disabled={downloadingPdf[selectedInvoice.id]}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Download className="mr-2 inline h-4 w-4" />
                      Descarcă PDF
                    </button>
                    {selectedInvoice.status === INVOICE_STATUS.GENERATED && (
                      <button
                        onClick={() => {
                          handleMarkAsSent(selectedInvoice);
                        }}
                        className="rounded-lg border border-purple-300 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 transition hover:bg-purple-100"
                      >
                        <Send className="mr-2 inline h-4 w-4" />
                        Marchează trimisă
                      </button>
                    )}
                    {(selectedInvoice.status === INVOICE_STATUS.SENT ||
                      selectedInvoice.status === INVOICE_STATUS.OVERDUE) && (
                      <button
                        onClick={() => {
                          handleMarkAsPaid(selectedInvoice);
                        }}
                        className="rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 transition hover:bg-green-100"
                      >
                        <CheckCircle className="mr-2 inline h-4 w-4" />
                        Marchează plătită
                      </button>
                    )}
                    {selectedInvoice.status !== INVOICE_STATUS.PAID && (
                      <button
                        onClick={() => {
                          handleDelete(selectedInvoice);
                          setSelectedInvoiceId(null);
                        }}
                        className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                      >
                        <Trash2 className="mr-2 inline h-4 w-4" />
                        Șterge factură
                      </button>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Invoices;
