import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Download, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { useInvoices, useInvoiceSummary } from '@/hooks/useInvoices';
import { formatDate, formatCurrency } from '@/lib/utils';
import { invoiceService } from '@/services/invoiceService';

const statusOptions = [
  { value: '', label: 'Toate' },
  { value: 'GENERATED', label: 'Generate' },
  { value: 'SENT', label: 'Trimise' },
  { value: 'PAID', label: 'Platite' },
  { value: 'OVERDUE', label: 'Restante' },
];

export default function Invoices() {
  const [filters, setFilters] = useState({ status: '', page: 1, limit: 10 });
  const { data, isLoading } = useInvoices(filters);
  const { data: summary } = useInvoiceSummary();
  const [downloadingId, setDownloadingId] = useState(null);

  const handleDownload = async (invoice) => {
    setDownloadingId(invoice.id);
    try {
      const blob = await invoiceService.downloadInvoicePdf(invoice.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      // silent - user can retry
    } finally {
      setDownloadingId(null);
    }
  };

  const invoices = data?.items || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Facturi</h1>
        <p className="page-subtitle">Vizualizeaza si descarca facturile tale</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-hover">
          <CardContent className="py-5">
            <p className="text-sm text-gray-500">Neplatite</p>
            <p className="text-2xl font-bold text-gray-900">{summary?.unpaid?.count || 0}</p>
            <p className="text-sm font-medium text-blue-600">
              {formatCurrency(summary?.unpaid?.total || 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="py-5">
            <p className="text-sm text-gray-500">Restante</p>
            <p className="text-2xl font-bold text-red-600">{summary?.overdue?.count || 0}</p>
            <p className="text-sm font-medium text-red-600">
              {formatCurrency(summary?.overdue?.total || 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="py-5">
            <p className="text-sm text-gray-500">Platite</p>
            <p className="text-2xl font-bold text-green-600">{summary?.paid?.count || 0}</p>
            <p className="text-sm font-medium text-green-600">
              {formatCurrency(summary?.paid?.total || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status:</span>
        {statusOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setFilters({ ...filters, status: option.value, page: 1 })}
            className={`filter-pill ${filters.status === option.value ? 'active' : ''}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Invoices table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="empty-state">
              <FileText className="empty-state-icon" />
              <p className="empty-state-title">Nu exista facturi</p>
              <p className="empty-state-text">Facturile tale vor aparea aici.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Numar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Scadenta
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link
                        to={`/invoices/${invoice.id}`}
                        className="font-medium text-primary-600 hover:text-primary-700"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(invoice.issueDate)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(invoice.dueDate)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-right">
                      {formatCurrency(invoice.total)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={invoice.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDownload(invoice)}
                        disabled={downloadingId === invoice.id}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                        title="Descarca PDF"
                      >
                        {downloadingId === invoice.id ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Download className="h-5 w-5" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Afisare {(pagination.page - 1) * pagination.limit + 1} -{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} din {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600">
              Pagina {pagination.page} din {pagination.pages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page === pagination.pages}
              onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
