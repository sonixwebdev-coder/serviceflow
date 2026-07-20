import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, Calendar, CreditCard } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { useInvoice } from '@/hooks/useInvoices';
import { formatDate, formatCurrency } from '@/lib/utils';

export default function InvoiceDetail() {
  const { id } = useParams();
  const { data: invoice, isLoading } = useInvoice(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Se incarca...</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Factura nu a fost gasita</p>
        <Link to="/invoices" className="text-primary-600 hover:text-primary-700 mt-2 inline-block">
          Inapoi la facturi
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/invoices">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{invoice.invoiceNumber}</h1>
            <p className="text-gray-500">Detalii factura</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={invoice.status} />
          {invoice.pdfUrl && (
            <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary">
                <Download className="h-4 w-4" />
                Descarca PDF
              </Button>
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Line items */}
          <Card>
            <CardHeader>
              <CardTitle>Articole</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Descriere
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Cantitate
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Pret
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoice.lineItems?.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{item.description}</p>
                        {item.laborPrice > 0 && (
                          <p className="text-sm text-gray-500">
                            Manopera: {formatCurrency(item.laborPrice)}
                          </p>
                        )}
                        {item.hardwarePrice > 0 && (
                          <p className="text-sm text-gray-500">
                            Piese: {formatCurrency(item.hardwarePrice)}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-gray-500">{item.quantity}</td>
                      <td className="px-6 py-4 text-right font-medium">
                        {formatCurrency(item.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan="2" className="px-6 py-3 text-right text-sm text-gray-500">
                      Subtotal
                    </td>
                    <td className="px-6 py-3 text-right font-medium">
                      {formatCurrency(invoice.subtotal)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan="2" className="px-6 py-3 text-right text-sm text-gray-500">
                      TVA
                    </td>
                    <td className="px-6 py-3 text-right font-medium">
                      {formatCurrency(invoice.tax)}
                    </td>
                  </tr>
                  <tr>
                    <td
                      colSpan="2"
                      className="px-6 py-3 text-right text-sm font-medium text-gray-900"
                    >
                      Total
                    </td>
                    <td className="px-6 py-3 text-right text-lg font-bold text-gray-900">
                      {formatCurrency(invoice.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>

          {/* Payments */}
          {invoice.payments?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Plati
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-200">
                  {invoice.payments.map((payment) => (
                    <div key={payment.id} className="px-6 py-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {formatCurrency(payment.amount)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(payment.paymentDate)} - {payment.paymentMethod}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detalii</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Data emiterii</p>
                  <p className="font-medium">{formatDate(invoice.issueDate)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Data scadenta</p>
                  <p className="font-medium">{formatDate(invoice.dueDate)}</p>
                </div>
              </div>

              {invoice.paidAt && (
                <div className="flex items-start gap-3">
                  <CreditCard className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Data platii</p>
                    <p className="font-medium">{formatDate(invoice.paidAt)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Related appointment */}
          {invoice.appointment && (
            <Card>
              <CardHeader>
                <CardTitle>Programare asociata</CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  to={`/appointments/${invoice.appointment.id}`}
                  className="block hover:bg-gray-50 -mx-6 -my-4 px-6 py-4 transition-colors"
                >
                  <p className="font-medium text-primary-600">{invoice.appointment.title}</p>
                  <p className="text-sm text-gray-500">
                    {formatDate(invoice.appointment.scheduledStart)}
                  </p>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
