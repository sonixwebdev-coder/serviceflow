import { Link } from 'react-router-dom';
import { Calendar, FileText, Clock, AlertCircle, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { useUpcomingAppointments } from '@/hooks/useAppointments';
import { useInvoiceSummary } from '@/hooks/useInvoices';
import { useAuthStore } from '@/state/useAuthStore';
import { formatDateTime, formatCurrency } from '@/lib/utils';

export default function Dashboard() {
  const client = useAuthStore((state) => state.client);
  const { data: upcomingAppointments, isLoading: appointmentsLoading } = useUpcomingAppointments();
  const { data: invoiceSummary, isLoading: summaryLoading } = useInvoiceSummary();

  const clientName = client?.companyName || `${client?.firstName || ''} ${client?.lastName || ''}`.trim() || 'Client';

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="page-header">
        <h1 className="page-title">Bine ai venit, {clientName}!</h1>
        <p className="page-subtitle">Iata o privire de ansamblu a contului tau.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Facturi neplatite</p>
              <p className="text-2xl font-bold text-gray-900">
                {summaryLoading ? '...' : invoiceSummary?.unpaid?.count || 0}
              </p>
              <p className="text-sm text-gray-500">
                {summaryLoading ? '...' : formatCurrency(invoiceSummary?.unpaid?.total || 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Facturi restante</p>
              <p className="text-2xl font-bold text-gray-900">
                {summaryLoading ? '...' : invoiceSummary?.overdue?.count || 0}
              </p>
              <p className="text-sm text-gray-500">
                {summaryLoading ? '...' : formatCurrency(invoiceSummary?.overdue?.total || 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="p-3 bg-green-100 rounded-lg">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Programari viitoare</p>
              <p className="text-2xl font-bold text-gray-900">
                {appointmentsLoading ? '...' : upcomingAppointments?.length || 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming appointments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Programari viitoare</CardTitle>
          <Link
            to="/appointments"
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            Vezi toate <ArrowRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {appointmentsLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600" />
            </div>
          ) : upcomingAppointments?.length === 0 ? (
            <div className="empty-state py-8">
              <Calendar className="empty-state-icon !h-10 !w-10 !mb-2" />
              <p className="empty-state-title text-base">Nu exista programari viitoare</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {upcomingAppointments?.map((appointment) => (
                <Link
                  key={appointment.id}
                  to={`/appointments/${appointment.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary-50 rounded-lg">
                      <Clock className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{appointment.title}</p>
                      <p className="text-sm text-gray-500">{formatDateTime(appointment.scheduledStart)}</p>
                    </div>
                  </div>
                  <StatusBadge status={appointment.status} />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/appointments">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4 py-5">
              <div className="p-3 bg-primary-100 rounded-lg">
                <Calendar className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Vezi programarile</p>
                <p className="text-sm text-gray-500">Consulta istoricul programarilor tale</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 ml-auto" />
            </CardContent>
          </Card>
        </Link>

        <Link to="/invoices">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4 py-5">
              <div className="p-3 bg-primary-100 rounded-lg">
                <FileText className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Vezi facturile</p>
                <p className="text-sm text-gray-500">Consulta si descarca facturile tale</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 ml-auto" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
