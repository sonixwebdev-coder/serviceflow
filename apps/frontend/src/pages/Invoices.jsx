import { useState, useMemo, useEffect } from 'react';
import confirm from '../utils/confirm';
import { getFileUrl } from '../utils/api';
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
  Loader2,
  ChevronRight,
} from 'lucide-react';
import useInvoices, {
  useInvoice,
  useUpdateInvoice,
  useDeleteInvoice,
  useMarkInvoiceAsSent,
  useMarkInvoiceAsPaid,
} from '../hooks/useInvoices';
import useAuth from '../context/useAuth';
import { useTerminology } from '../context/TerminologyContext';
import useToast from '../context/useToast';
import { downloadInvoicePdf } from '../services/invoiceService';
import { exportInvoicesAnafXML, downloadFile } from '../services/exportService';
import { useClientLoyalty, useLoyaltyProgram } from '../hooks/useLoyalty';
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
  if (!value) return '-';
  try {
    return format(new Date(value), 'dd MMM yyyy', { locale: roDateLocale });
  } catch {
    return '-';
  }
};

const Invoices = () => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const { features } = useTerminology();
  const hasAssets = features?.useAssets !== false;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [exportingAnaf, setExportingAnaf] = useState(false);
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

  // Loyalty discount data for the selected invoice's client
  const { data: loyaltyAccount } = useClientLoyalty(selectedInvoice?.clientId ?? null);
  const { data: loyaltyProgram } = useLoyaltyProgram();
  const [editApplyLoyaltyDiscount, setEditApplyLoyaltyDiscount] = useState(null); // null = not changed by user

  const loyaltyDiscountPercent = (() => {
    if (!loyaltyAccount || !loyaltyProgram || !loyaltyProgram.isEnabled) return 0;
    const map = {
      BRONZE: Number(loyaltyProgram.bronzeDiscount || 0),
      SILVER: Number(loyaltyProgram.silverDiscount || 0),
      GOLD: Number(loyaltyProgram.goldDiscount || 0),
      PLATINUM: Number(loyaltyProgram.platinumDiscount || 0),
    };
    return map[loyaltyAccount.currentTier] || 0;
  })();

  // Initialize edit form when invoice loads
  const handleOpenDrawer = (invoiceId) => {
    setSelectedInvoiceId(invoiceId);
    setIsEditing(false);
    setEditApplyLoyaltyDiscount(null);
    setEditForm({ notes: '', dueDate: '', status: '', lineItems: [] }); // Reset form
  };

  // When invoice data loads, populate edit form
  const [formInitialized, setFormInitialized] = useState(false);

  useEffect(() => {
    if (selectedInvoice && !formInitialized) {
      setEditForm({
        notes: selectedInvoice.notes || '',
        dueDate: selectedInvoice.dueDate ? format(new Date(selectedInvoice.dueDate), 'yyyy-MM-dd') : '',
        status: selectedInvoice.status || 'draft',
        lineItems: selectedInvoice.lineItems?.map(item => ({
          id: item.id,
          name: item.name,
          description: item.description || '',
          hardwareQuantity: item.hardwareQuantity != null ? Number(item.hardwareQuantity) : (Number(item.quantity) || 1),
          laborQuantity: item.laborQuantity != null ? Number(item.laborQuantity) : (Number(item.quantity) || 1),
          hardwarePrice: Number(item.hardwarePrice || 0),
          laborPrice: Number(item.laborPrice || 0),
          hardwareUnit: item.hardwareUnit || '',
          laborUnit: item.laborUnit || '',
        })) || [],
      });
      setFormInitialized(true);
    }
  }, [selectedInvoice, formInitialized]);

  useEffect(() => {
    if (!selectedInvoiceId && formInitialized) {
      setFormInitialized(false);
    }
  }, [selectedInvoiceId, formInitialized]);

  // Calculate totals dynamically when editing
  const calculatedTotals = useMemo(() => {
    if (!isEditing || !editForm.lineItems) {
      return null;
    }
    const subtotal = editForm.lineItems.reduce((sum, item) => {
      const hwQty = Number(item.hardwareQuantity) || 0;
      const laborQty = Number(item.laborQuantity) || 0;
      const hwPrice = Number(item.hardwarePrice) || 0;
      const laborPrice = Number(item.laborPrice) || 0;
      return sum + (hwQty * hwPrice) + (laborQty * laborPrice);
    }, 0);
    const tax = selectedInvoice?.tax || 0;
    // Determine effective loyalty discount based on user toggle
    let loyaltyDiscount = 0;
    const effectiveApply = editApplyLoyaltyDiscount !== null
      ? editApplyLoyaltyDiscount
      : Number(selectedInvoice?.loyaltyDiscount || 0) > 0;
    if (effectiveApply) {
      if (editApplyLoyaltyDiscount === true && loyaltyDiscountPercent > 0) {
        // Recalculating from tier percentage (user toggled ON a previously-off invoice)
        loyaltyDiscount = Math.round(subtotal * (loyaltyDiscountPercent / 100) * 100) / 100;
      } else {
        loyaltyDiscount = Number(selectedInvoice?.loyaltyDiscount || 0);
      }
    }
    const total = subtotal + tax - loyaltyDiscount;
    return { subtotal, tax, loyaltyDiscount, total };
  }, [isEditing, editForm.lineItems, selectedInvoice?.tax, selectedInvoice?.loyaltyDiscount, editApplyLoyaltyDiscount, loyaltyDiscountPercent]);

  const handleAddLineItem = () => {
    setEditForm({
      ...editForm,
      lineItems: [
        ...editForm.lineItems,
        { name: '', description: '', hardwareQuantity: 1, laborQuantity: 1, hardwarePrice: 0, laborPrice: 0, hardwareUnit: '', laborUnit: '' },
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
    const numericFields = ['hardwareQuantity', 'laborQuantity', 'hardwarePrice', 'laborPrice'];
    const newLineItems = [...editForm.lineItems];
    newLineItems[index] = {
      ...newLineItems[index],
      [field]: numericFields.includes(field) ? (value === '' ? '' : Number(value)) : value,
    };
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
      const hwQty = Number(item.hardwareQuantity) || 0;
      const laborQty = Number(item.laborQuantity) || 0;
      if (hwQty <= 0 && laborQty <= 0) {
        showToast({
          title: 'Eroare validare',
          description: `Articolul ${i + 1} trebuie să aibă cel puțin o cantitate pozitivă (piese sau manoperă).`,
          type: 'error',
        });
        return;
      }
      if (Number(item.hardwarePrice) < 0 || Number(item.laborPrice) < 0) {
        showToast({
          title: 'Eroare validare',
          description: `Articolul ${i + 1} nu poate avea prețuri negative.`,
          type: 'error',
        });
        return;
      }
    }

    try {
      const updatePayload = {
        id: selectedInvoice.id,
        notes: editForm.notes,
        dueDate: editForm.dueDate ? new Date(editForm.dueDate).toISOString() : selectedInvoice.dueDate,
        status: editForm.status,
        lineItems: editForm.lineItems.map((item, index) => ({
          name: item.name,
          description: item.description || null,
          hardwareQuantity: Number(item.hardwareQuantity) || 0,
          laborQuantity: Number(item.laborQuantity) || 0,
          hardwarePrice: Number(item.hardwarePrice) || 0,
          laborPrice: Number(item.laborPrice) || 0,
          hardwareUnit: item.hardwareUnit?.trim() || undefined,
          laborUnit: item.laborUnit?.trim() || undefined,
          order: index,
        })),
      };
      // Only send applyLoyaltyDiscount when user explicitly toggled it
      if (editApplyLoyaltyDiscount !== null) {
        updatePayload.applyLoyaltyDiscount = editApplyLoyaltyDiscount;
      }
      await updateInvoiceMutation.mutateAsync(updatePayload);
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
    if (!await confirm({ title: 'Sterge factura', text: `Sigur vrei sa stergi factura ${invoice.invoiceNumber}?`, confirmText: 'Sterge', danger: true })) {
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

  const handleBulkAnafXML = async () => {
    if (selectedIds.size === 0) return;
    setExportingAnaf(true);
    try {
      const blob = await exportInvoicesAnafXML(Array.from(selectedIds));
      const date = new Date().toISOString().split('T')[0];
      downloadFile(blob, `efacturi-anaf-${date}.zip`);
      showToast({
        title: 'Export ANAF complet',
        description: `${selectedIds.size} factur${selectedIds.size === 1 ? 'ă' : 'i'} exportate ca XML ANAF.`,
        type: 'success',
      });
      setSelectedIds(new Set());
    } catch (error) {
      showToast({
        title: 'Eroare export ANAF',
        description: error.message || 'Nu s-au putut exporta facturile.',
        type: 'error',
      });
    } finally {
      setExportingAnaf(false);
    }
  };

  const handleSelectInvoice = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === invoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(invoices.map(inv => inv.id)));
    }
  };

  const getClientName = (invoice) => {
    if (!invoice.client) return '-';
    const { client } = invoice;
    if (client.type === 'SRL') {
      return client.companyName || '-';
    }
    return `${client.firstName || ''} ${client.lastName || ''}`.trim() || '-';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header">
          <h1 className="page-title">Facturi</h1>
          <p className="page-subtitle">
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
      <div className="filter-bar">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Caută după număr factură..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        <div className="h-6 w-px bg-gray-200 hidden sm:block" />
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          >
            <option value="">Toate</option>
            {Object.entries(STATUS_META).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {(searchTerm || statusFilter) && (
          <button
            type="button"
            onClick={() => { setSearchTerm(''); setStatusFilter(''); }}
            className="text-sm text-gray-500 hover:text-primary transition-colors flex items-center gap-1"
          >
            <X size={14} />
            Resetează
          </button>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <span className="text-sm font-medium text-blue-800">
            {selectedIds.size} factur{selectedIds.size === 1 ? 'ă' : 'i'} selectate
          </span>
          <button
            onClick={handleBulkAnafXML}
            disabled={exportingAnaf}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exportingAnaf ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
            Exporta ANAF XML
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-sm text-blue-600 hover:text-blue-800"
          >
            Deselectează tot
          </button>
        </div>
      )}

      {/* Table - Desktop */}
      <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="pl-4 pr-2 py-3 w-10">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={invoices.length > 0 && selectedIds.size === invoices.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Număr
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Dată emitere
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Scadență
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Acțiuni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading && invoices.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
                    </div>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12">
                    <div className="empty-state">
                      <FileText className="empty-state-icon" />
                      <p className="empty-state-title">Nicio factură</p>
                      <p className="empty-state-text">
                        Creează prima factură din detaliile unei programări finalizate.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => {
                  const statusMeta = STATUS_META[invoice.status] || STATUS_META.draft;
                  return (
                    <tr key={invoice.id} className={`hover:bg-gray-50 ${selectedIds.has(invoice.id) ? 'bg-blue-50/40' : ''}`}>
                      <td className="pl-4 pr-2 py-4 w-10">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300"
                          checked={selectedIds.has(invoice.id)}
                          onChange={() => handleSelectInvoice(invoice.id)}
                        />
                      </td>
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
                            className="text-primary hover:text-primary/80"
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
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm px-4 py-12">
            <div className="flex justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="empty-state">
              <FileText className="empty-state-icon" />
              <p className="empty-state-title">Nicio factură</p>
              <p className="empty-state-text">
                Creează prima factură din detaliile unei programări finalizate.
              </p>
            </div>
          </div>
        ) : (
          invoices.map((invoice) => {
            const statusMeta = STATUS_META[invoice.status] || STATUS_META.draft;
            return (
              <div
                key={invoice.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
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
                    className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition hover:bg-primary/90"
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

            {/* ── Header ── */}
            <div className="flex items-start justify-between border-b border-gray-200 px-4 py-4 sm:px-6">
              <div className="min-w-0 flex-1">
                {!invoiceLoading && selectedInvoice ? (
                  <>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-gray-900 truncate">
                        {selectedInvoice.invoiceNumber}
                      </h2>
                    </div>
                    <p className="mt-0.5 text-sm text-gray-500 truncate">
                      {getClientName(selectedInvoice)} &middot; {formatDate(selectedInvoice.issueDate)}
                    </p>
                  </>
                ) : (
                  <h2 className="text-lg font-semibold text-gray-900">Detalii Factură</h2>
                )}
              </div>
              <div className="ml-3 flex items-center gap-1 sm:gap-2">
                {!invoiceLoading && selectedInvoice && selectedInvoice.status !== INVOICE_STATUS.PAID && !isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="rounded-lg bg-gray-100 px-2 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-200 sm:px-3 sm:text-sm"
                  >
                    <Edit className="mr-1 inline h-3 w-3 sm:mr-1.5 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Editează</span>
                    <span className="sm:hidden">Edit</span>
                  </button>
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

            {!invoiceLoading && selectedInvoice && (
              <>
                {/* ── Status Pipeline ── */}
                <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 sm:px-6">
                  <div className="flex items-center gap-1">
                    {[
                      { key: INVOICE_STATUS.DRAFT,      next: INVOICE_STATUS.GENERATED },
                      { key: INVOICE_STATUS.GENERATED,  next: INVOICE_STATUS.SENT },
                      { key: INVOICE_STATUS.SENT,       next: INVOICE_STATUS.PAID },
                      { key: INVOICE_STATUS.PAID,       next: null },
                    ].map(({ key, next }, idx, arr) => {
                      const ORDER = [INVOICE_STATUS.DRAFT, INVOICE_STATUS.GENERATED, INVOICE_STATUS.SENT, INVOICE_STATUS.PAID];
                      const currentIdx = ORDER.indexOf(selectedInvoice.status);
                      const stepIdx   = ORDER.indexOf(key);
                      const reached   = currentIdx >= stepIdx;
                      const isCurrent = selectedInvoice.status === key;
                      const canAdvance = next && currentIdx === stepIdx; // only one step forward
                      return (
                        <div key={key} className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={!canAdvance || updateInvoiceMutation.isPending}
                            onClick={async () => {
                              if (!canAdvance) return;
                              try {
                                await updateInvoiceMutation.mutateAsync({ id: selectedInvoice.id, status: next });
                                showToast({ title: 'Status actualizat', description: `Factura a trecut la "${STATUS_META[next]?.label}".`, type: 'success' });
                              } catch (err) {
                                showToast({ title: 'Eroare', description: err.message || 'Nu s-a putut actualiza statusul.', type: 'error' });
                              }
                            }}
                            className={[
                              'rounded-full px-3 py-1 text-xs font-medium border transition',
                              reached
                                ? isCurrent
                                  ? `${STATUS_META[key]?.class || ''} shadow-sm`
                                  : 'bg-gray-200 text-gray-600 border-gray-300'
                                : 'bg-white text-gray-400 border-gray-200',
                              canAdvance ? 'cursor-pointer hover:opacity-80' : 'cursor-default',
                            ].join(' ')}
                            title={canAdvance ? `Avansează la "${STATUS_META[next]?.label}"` : STATUS_META[key]?.label}
                          >
                            {STATUS_META[key]?.label}
                          </button>
                          {idx < arr.length - 1 && (
                            <ChevronRight size={12} className="flex-shrink-0 text-gray-300" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Quick-action row ── */}
                <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2.5 sm:px-6 overflow-x-auto">
                  <button
                    onClick={() => handleDownloadPdf(selectedInvoice)}
                    disabled={downloadingPdf[selectedInvoice.id]}
                    className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    {downloadingPdf[selectedInvoice.id] ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Download size={13} />
                    )}
                    PDF
                  </button>
                  {selectedInvoice.status === INVOICE_STATUS.GENERATED && (
                    <button
                      onClick={() => handleMarkAsSent(selectedInvoice)}
                      disabled={markAsSentMutation.isPending}
                      className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-purple-300 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 transition hover:bg-purple-100 disabled:opacity-50"
                    >
                      <Send size={13} />
                      Marchează trimisă
                    </button>
                  )}
                  {(selectedInvoice.status === INVOICE_STATUS.SENT ||
                    selectedInvoice.status === INVOICE_STATUS.OVERDUE) && (
                    <button
                      onClick={() => handleMarkAsPaid(selectedInvoice)}
                      disabled={markAsPaidMutation.isPending}
                      className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition hover:bg-green-100 disabled:opacity-50"
                    >
                      <CheckCircle size={13} />
                      Marchează plătită
                    </button>
                  )}
                  {selectedInvoice.status !== INVOICE_STATUS.PAID && (
                    <button
                      onClick={() => {
                        handleDelete(selectedInvoice);
                        setSelectedInvoiceId(null);
                      }}
                      className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
                    >
                      <Trash2 size={13} />
                      Șterge
                    </button>
                  )}
                </div>
              </>
            )}

            {/* ── Scrollable content ── */}
            <div className="flex-1 overflow-y-auto">
              {invoiceLoading ? (
                <div className="flex h-full items-center justify-center p-4 sm:p-6">
                  <p className="text-sm text-gray-500">Se încarcă...</p>
                </div>
              ) : selectedInvoice ? (
                <div className="space-y-4 p-4 sm:space-y-5 sm:p-6">

                  {/* ── Two-column info grid ── */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Invoice metadata */}
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Factură</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Număr</span>
                          <span className="font-medium text-gray-900">{selectedInvoice.invoiceNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Emitere</span>
                          <span className="text-gray-900">{formatDate(selectedInvoice.issueDate)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Scadență</span>
                          {isEditing ? (
                            <input
                              type="date"
                              value={editForm.dueDate}
                              onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                              className="rounded border border-gray-300 px-2 py-0.5 text-sm"
                            />
                          ) : (
                            <span className="text-gray-900">{formatDate(selectedInvoice.dueDate)}</span>
                          )}
                        </div>
                        {selectedInvoice.sentAt && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Trimisă</span>
                            <span className="text-gray-900">{formatDate(selectedInvoice.sentAt)}</span>
                          </div>
                        )}
                        {selectedInvoice.paidAt && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Plătită</span>
                            <span className="text-gray-900">{formatDate(selectedInvoice.paidAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Client info */}
                    {selectedInvoice.client ? (
                      <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Client</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Nume</span>
                            <span className="font-medium text-gray-900 text-right">{getClientName(selectedInvoice)}</span>
                          </div>
                          {selectedInvoice.client.phone && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Telefon</span>
                              <span className="text-gray-900">{selectedInvoice.client.phone}</span>
                            </div>
                          )}
                          {selectedInvoice.client.email && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Email</span>
                              <span className="text-gray-900 truncate ml-4 text-right">{selectedInvoice.client.email}</span>
                            </div>
                          )}
                          {selectedInvoice.client.vatNumber && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">CUI</span>
                              <span className="text-gray-900">{selectedInvoice.client.vatNumber}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-gray-200 bg-white p-4 flex items-center justify-center">
                        <span className="text-sm text-gray-400">Fără client asociat</span>
                      </div>
                    )}
                  </div>

                  {/* ── Line Items ── */}
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">Articole</h3>
                      {isEditing && (
                        <button
                          onClick={handleAddLineItem}
                          className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-white transition hover:bg-primary/90"
                        >
                          + Adaugă articol
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      /* Edit mode - unchanged hardware/labor split form */
                      <div className="space-y-3">
                        {editForm.lineItems.map((item, index) => {
                          const hwTotal = (Number(item.hardwareQuantity) || 0) * (Number(item.hardwarePrice) || 0);
                          const laborTotal = (Number(item.laborQuantity) || 0) * (Number(item.laborPrice) || 0);
                          const itemTotal = hwTotal + laborTotal;
                          return (
                            <div key={index} className="rounded-lg border border-gray-200 p-3 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 space-y-2">
                                  {/* Name */}
                                  <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-700">Denumire *</label>
                                    <input
                                      type="text"
                                      value={item.name}
                                      onChange={(e) => handleLineItemChange(index, 'name', e.target.value)}
                                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                      placeholder="Nume articol"
                                    />
                                  </div>
                                  {/* Description */}
                                  <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-700">Descriere</label>
                                    <input
                                      type="text"
                                      value={item.description}
                                      onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                      placeholder="Descriere opțională"
                                    />
                                  </div>
                                  {/* Hardware + Labor split - same layout as service orders */}
                                  <div className={`grid gap-3 ${hasAssets ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                    {/* Hardware - only for orgs that use assets */}
                                    {hasAssets && (
                                      <div className="rounded-lg border border-blue-200 bg-white p-2.5">
                                        <h4 className="mb-2 text-xs font-semibold text-blue-900">Piese / Materiale</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                          <div>
                                            <label className="mb-1 block text-xs text-gray-600">Cantitate</label>
                                            <input
                                              type="number"
                                              min="0"
                                              step="1"
                                              value={item.hardwareQuantity}
                                              onChange={(e) => handleLineItemChange(index, 'hardwareQuantity', e.target.value)}
                                              className="w-full rounded border border-gray-300 px-1.5 py-1 text-sm focus:border-primary focus:outline-none"
                                            />
                                          </div>
                                          <div>
                                            <label className="mb-1 block text-xs text-gray-600">Preț/buc (RON)</label>
                                            <input
                                              type="number"
                                              min="0"
                                              step="0.01"
                                              value={item.hardwarePrice}
                                              onChange={(e) => handleLineItemChange(index, 'hardwarePrice', e.target.value)}
                                              className="w-full rounded border border-gray-300 px-1.5 py-1 text-sm focus:border-primary focus:outline-none"
                                              placeholder="0.00"
                                            />
                                          </div>
                                        </div>
                                        <div className="mt-1.5 text-right text-xs text-blue-700">
                                          = {formatCurrency(hwTotal)}
                                        </div>
                                      </div>
                                    )}
                                    {/* Labor */}
                                    <div className="rounded-lg border border-green-200 bg-white p-2.5">
                                      <h4 className="mb-2 text-xs font-semibold text-green-900">Manoperă</h4>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="mb-1 block text-xs text-gray-600">Ore / Cantitate</label>
                                          <input
                                            type="number"
                                            min="0"
                                            step="0.5"
                                            value={item.laborQuantity}
                                            onChange={(e) => handleLineItemChange(index, 'laborQuantity', e.target.value)}
                                            className="w-full rounded border border-gray-300 px-1.5 py-1 text-sm focus:border-primary focus:outline-none"
                                          />
                                        </div>
                                        <div>
                                          <label className="mb-1 block text-xs text-gray-600">Preț/oră (RON)</label>
                                          <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={item.laborPrice}
                                            onChange={(e) => handleLineItemChange(index, 'laborPrice', e.target.value)}
                                            className="w-full rounded border border-gray-300 px-1.5 py-1 text-sm focus:border-primary focus:outline-none"
                                            placeholder="0.00"
                                          />
                                        </div>
                                      </div>
                                      <div className="mt-1.5 text-right text-xs text-green-700">
                                        = {formatCurrency(laborTotal)}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="pt-1 text-right text-xs font-medium text-gray-700">
                                    Total articol: {formatCurrency(itemTotal)}
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
                          );
                        })}
                        {editForm.lineItems.length === 0 && (
                          <p className="py-4 text-center text-sm text-gray-500">
                            Niciun articol. Apasă butonul de mai sus pentru a adăuga unul.
                          </p>
                        )}
                      </div>
                    ) : (
                      /* View mode - card-based list */
                      <div className="space-y-2">
                        {selectedInvoice.lineItems?.map((item) => {
                          const hwAmt  = (item.hardwareQuantity || 0) * (item.hardwarePrice || 0);
                          const lbrAmt = (item.laborQuantity || 0) * (item.laborPrice || 0);
                          return (
                            <div key={item.id} className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                                  {item.description && (
                                    <p className="mt-0.5 text-xs text-gray-500">{item.description}</p>
                                  )}
                                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                                    {item.hardwareQuantity > 0 && (
                                      <span>
                                        Piese: {item.hardwareQuantity} {item.hardwareUnit || 'buc'} &times; {formatCurrency(item.hardwarePrice)}
                                        {' '}<span className="text-blue-600">= {formatCurrency(hwAmt)}</span>
                                      </span>
                                    )}
                                    {item.laborQuantity > 0 && (
                                      <span>
                                        Manoperă: {item.laborQuantity} {item.laborUnit || 'h'} &times; {formatCurrency(item.laborPrice)}
                                        {' '}<span className="text-green-600">= {formatCurrency(lbrAmt)}</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span className="flex-shrink-0 text-sm font-semibold text-gray-900">
                                  {formatCurrency(item.totalPrice)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        {(!selectedInvoice.lineItems || selectedInvoice.lineItems.length === 0) && (
                          <p className="py-4 text-center text-sm text-gray-400">Niciun articol.</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ── Totals card ── */}
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Sumar</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="text-gray-900">
                          {formatCurrency(isEditing && calculatedTotals ? calculatedTotals.subtotal : selectedInvoice.subtotal)}
                        </span>
                      </div>
                      {/* Loyalty discount - always show when editing if client has a tier or invoice already has one */}
                      {isEditing && (selectedInvoice.loyaltyDiscount > 0 || loyaltyDiscountPercent > 0) && (
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={
                                editApplyLoyaltyDiscount !== null
                                  ? editApplyLoyaltyDiscount
                                  : Number(selectedInvoice.loyaltyDiscount || 0) > 0
                              }
                              onChange={(e) => setEditApplyLoyaltyDiscount(e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <span className="text-green-700">
                              Reducere fidelitate
                              {loyaltyAccount?.currentTier && ` (${loyaltyAccount.currentTier} -${loyaltyDiscountPercent}%)`}:
                            </span>
                          </label>
                          <span className="text-green-700">
                            -{formatCurrency(calculatedTotals?.loyaltyDiscount || 0)}
                          </span>
                        </div>
                      )}
                      {!isEditing && selectedInvoice.loyaltyDiscount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-green-700">
                            Reducere fidelitate {selectedInvoice.loyaltyTierAtTime && `(${selectedInvoice.loyaltyTierAtTime})`}:
                          </span>
                          <span className="text-green-700">-{formatCurrency(selectedInvoice.loyaltyDiscount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">TVA</span>
                        <span className="text-gray-900">
                          {formatCurrency(isEditing && calculatedTotals ? calculatedTotals.tax : selectedInvoice.tax)}
                        </span>
                      </div>
                      <div className="flex justify-between rounded-lg bg-gray-900 px-3 py-2.5 text-base font-semibold text-white">
                        <span>Total factură</span>
                        <span>
                          {formatCurrency(isEditing && calculatedTotals ? calculatedTotals.total : selectedInvoice.total)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ── Payment Status ── */}
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Status Plată</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Status:</span>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                            selectedInvoice.paymentStatus === 'paid' || selectedInvoice.paymentStatus === 'PAID'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : selectedInvoice.paymentStatus === 'partial' || selectedInvoice.paymentStatus === 'PARTIAL'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-gray-50 text-gray-700 border-gray-200'
                          }`}
                        >
                          {selectedInvoice.paymentStatus === 'paid' || selectedInvoice.paymentStatus === 'PAID'
                            ? 'Plătită'
                            : selectedInvoice.paymentStatus === 'partial' || selectedInvoice.paymentStatus === 'PARTIAL'
                            ? 'Plată parțială'
                            : 'Neplătită'}
                        </span>
                      </div>
                      <div className="space-y-2 rounded-lg bg-gray-50 p-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total:</span>
                          <span className="font-medium text-gray-900">
                            {formatCurrency(selectedInvoice.total)}
                          </span>
                        </div>
                        {selectedInvoice.advancePayment > 0 && (
                          <div className="flex justify-between">
                            <span className="text-blue-600">Suma plătită:</span>
                            <span className="font-medium text-blue-600">
                              {formatCurrency(selectedInvoice.advancePayment)}
                            </span>
                          </div>
                        )}
                        {selectedInvoice.remainingBalance > 0 ? (
                          <div className="flex justify-between border-t border-gray-200 pt-2">
                            <span className="font-medium text-orange-600">Rest de plată:</span>
                            <span className="font-semibold text-orange-600">
                              {formatCurrency(selectedInvoice.remainingBalance)}
                            </span>
                          </div>
                        ) : selectedInvoice.advancePayment > 0 ? (
                          <div className="flex justify-between border-t border-gray-200 pt-2">
                            <span className="font-medium text-green-600">Status:</span>
                            <span className="font-semibold text-green-600">Achitat integral ✓</span>
                          </div>
                        ) : null}
                      </div>
                      {(selectedInvoice.advancePaidAt || selectedInvoice.finalPaidAt) && (
                        <div className="space-y-1 text-xs text-gray-500">
                          {selectedInvoice.advancePaidAt && (
                            <div className="flex justify-between">
                              <span>Prima plată:</span>
                              <span>{formatDate(selectedInvoice.advancePaidAt)}</span>
                            </div>
                          )}
                          {selectedInvoice.finalPaidAt && (
                            <div className="flex justify-between">
                              <span>Plată finală:</span>
                              <span>{formatDate(selectedInvoice.finalPaidAt)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Notes - always visible ── */}
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Observații</h3>
                    {isEditing ? (
                      <textarea
                        value={editForm.notes}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                        rows={4}
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Adaugă observații..."
                      />
                    ) : selectedInvoice.notes ? (
                      <p className="whitespace-pre-wrap text-sm text-gray-600">{selectedInvoice.notes}</p>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Nicio observație adăugată.</p>
                    )}
                  </div>

                  {/* ── Edit-mode status select ── */}
                  {isEditing && (
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Status factură</label>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {Object.entries(STATUS_META).map(([value, { label }]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* ── PDF Preview ── */}
                  {selectedInvoice.pdfUrl && (
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Previzualizare PDF</h3>
                      <iframe
                        key={`pdf-${selectedInvoice.id}-${selectedInvoice.updatedAt || Date.now()}`}
                        title={`Factură ${selectedInvoice.invoiceNumber}`}
                        src={`${getFileUrl(selectedInvoice.pdfUrl)}&t=${new Date(selectedInvoice.updatedAt || Date.now()).getTime()}#toolbar=0`}
                        className="h-96 w-full rounded border border-gray-200 bg-white"
                      />
                    </div>
                  )}

                  {/* Bottom padding so sticky footer doesn't overlap last card when editing */}
                  {isEditing && <div className="h-16" />}
                </div>
              ) : null}
            </div>

            {/* ── Sticky edit footer ── */}
            {!invoiceLoading && selectedInvoice && isEditing && (
              <div className="border-t border-gray-200 bg-white px-4 py-3 sm:px-6 flex items-center justify-end gap-2 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
                <button
                  onClick={() => setIsEditing(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
                >
                  Anulează
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={updateInvoiceMutation.isPending}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
                >
                  {updateInvoiceMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" />
                      Se salvează...
                    </span>
                  ) : (
                    'Salvează modificările'
                  )}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Invoices;
