import { useState, useMemo } from 'react';
import { subDays, format } from 'date-fns';
import {
  BarChart3,
  Users,
  Calendar,
  FileText,
  TrendingUp,
  RefreshCw,
  CheckSquare,
} from 'lucide-react';
import {
  useOverview,
  useRevenueTrends,
  usePaymentTrends,
  useAppointmentStats,
  useClientAcquisition,
  useInvoiceAging,
  useTopClients,
} from '../hooks/useAnalytics';
import MetricCard from '../components/analytics/MetricCard';
import RevenueCard from '../components/analytics/RevenueCard';
import PaymentCard from '../components/analytics/PaymentCard';
import RevenueChart from '../components/analytics/RevenueChart';
import AppointmentMetrics from '../components/analytics/AppointmentMetrics';
import ClientGrowthChart from '../components/analytics/ClientGrowthChart';
import InvoiceAgingTable from '../components/analytics/InvoiceAgingTable';
import TopClientsTable from '../components/analytics/TopClientsTable';
import DateRangeFilter from '../components/analytics/DateRangeFilter';
import LocationComparisonChart from '../components/analytics/LocationComparisonChart';
import { useAuth } from '../context/useAuth';

const DEFAULT_RANGE = {
  startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
  endDate: format(new Date(), 'yyyy-MM-dd'),
  preset: '30d',
};

export default function Analytics() {
  const [dateRange, setDateRange] = useState(DEFAULT_RANGE);
  const { hasRole } = useAuth();
  const canViewLocationComparison = hasRole('admin', 'manager');

  const queryParams = useMemo(
    () => ({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    }),
    [dateRange.startDate, dateRange.endDate]
  );

  // Fetch all analytics data
  const {
    data: overview,
    isLoading: overviewLoading,
    isFetching: overviewFetching,
    refetch: refetchOverview,
  } = useOverview();
  const {
    data: revenue,
    isLoading: revenueLoading,
    isFetching: revenueFetching,
    refetch: refetchRevenue,
  } = useRevenueTrends(queryParams);
  const {
    data: payments,
    isLoading: paymentsLoading,
    isFetching: paymentsFetching,
    refetch: refetchPayments,
  } = usePaymentTrends(queryParams);
  const {
    data: appointments,
    isLoading: appointmentsLoading,
    isFetching: appointmentsFetching,
    refetch: refetchAppointments,
  } = useAppointmentStats(queryParams);
  const {
    data: clients,
    isLoading: clientsLoading,
    isFetching: clientsFetching,
    refetch: refetchClients,
  } = useClientAcquisition(queryParams);
  const {
    data: invoiceAging,
    isLoading: agingLoading,
    isFetching: agingFetching,
    refetch: refetchAging,
  } = useInvoiceAging();
  const {
    data: topClients,
    isLoading: topClientsLoading,
    isFetching: topClientsFetching,
    refetch: refetchTopClients,
  } = useTopClients(queryParams);

  const handleRefreshAll = () => {
    refetchOverview();
    refetchRevenue();
    refetchPayments();
    refetchAppointments();
    refetchClients();
    refetchAging();
    refetchTopClients();
  };

  // isLoading = true only on initial load (no cached data)

  // isFetching = true on initial load AND refetches
  const isAnyFetching =
    overviewFetching ||
    revenueFetching ||
    paymentsFetching ||
    appointmentsFetching ||
    clientsFetching ||
    agingFetching ||
    topClientsFetching;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header">
          <h1 className="page-title flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Statistici
          </h1>
          <p className="page-subtitle">Metrici si analize pentru afacerea ta</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleRefreshAll}
            disabled={isAnyFetching}
            className="p-2.5 rounded-lg border border-gray-200 bg-white shadow-sm hover:bg-gray-50 hover:shadow-md transition-all disabled:opacity-50"
            title="Reincarca datele"
          >
            <RefreshCw className={`h-4 w-4 text-gray-600 ${isAnyFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <DateRangeFilter
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          selectedPreset={dateRange.preset}
          onRangeChange={setDateRange}
        />
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Card - invoices */}
        <RevenueCard
          data={revenue?.summary}
          dateRange={dateRange}
          isLoading={revenueLoading || revenueFetching}
        />

        {/* Payment Card - all payments */}
        <PaymentCard data={payments?.summary} isLoading={paymentsLoading || paymentsFetching} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Programari azi"
          value={overview?.appointments?.today || 0}
          subtitle={`${overview?.appointments?.thisWeek || 0} saptamana aceasta`}
          icon={Calendar}
          iconColor="text-blue-600"
          iconBg="bg-blue-100"
          isLoading={overviewLoading || overviewFetching}
        />
        <MetricCard
          title="Total clienti"
          value={overview?.clients?.total || 0}
          icon={Users}
          iconColor="text-primary"
          iconBg="bg-primary/10"
          isLoading={overviewLoading || overviewFetching}
        />
        <MetricCard
          title="Facturi restante"
          value={overview?.invoices?.overdue || 0}
          subtitle={`${overview?.invoices?.pending || 0} in asteptare`}
          icon={FileText}
          iconColor="text-red-600"
          iconBg="bg-red-100"
          isLoading={overviewLoading || overviewFetching}
        />
        <MetricCard
          title="Task-uri active"
          value={overview?.tasks?.active || 0}
          icon={CheckSquare}
          iconColor="text-amber-600"
          iconBg="bg-amber-100"
          isLoading={overviewLoading || overviewFetching}
        />
      </div>

      {/* Location Comparison (admin/manager only) */}
      {canViewLocationComparison && (
        <LocationComparisonChart startDate={dateRange.startDate} endDate={dateRange.endDate} />
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Evolutia facturilor
            </h2>
          </div>
          <RevenueChart data={revenue?.data} isLoading={revenueLoading || revenueFetching} />
        </div>

        {/* Appointments Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Programari
            </h2>
          </div>
          {appointments?.summary && (
            <div className="flex items-center gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500">Rata de finalizare</p>
                <p className="text-xl font-bold text-gray-900">
                  {appointments.summary.completionRate.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total programari</p>
                <p className="text-xl font-bold text-gray-900">{appointments.summary.total}</p>
              </div>
            </div>
          )}
          <AppointmentMetrics
            data={appointments?.data}
            byStatus={appointments?.byStatus}
            isLoading={appointmentsLoading || appointmentsFetching}
          />
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Growth */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-600" />
              Clienti noi
            </h2>
          </div>
          {clients?.summary && (
            <div className="flex items-center gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500">In perioada selectata</p>
                <p className="text-xl font-bold text-gray-900">+{clients.summary.newClients}</p>
              </div>
              {clients.summary.growthRate !== undefined && (
                <div
                  className={`px-2 py-1 rounded text-sm font-medium ${
                    clients.summary.growthRate >= 0
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {clients.summary.growthRate >= 0 ? '+' : ''}
                  {clients.summary.growthRate.toFixed(1)}%
                </div>
              )}
            </div>
          )}
          <ClientGrowthChart
            data={clients?.data}
            byType={clients?.byType}
            isLoading={clientsLoading || clientsFetching}
          />
        </div>

        {/* Invoice Aging */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-red-600" />
              Vechime facturi
            </h2>
          </div>
          <InvoiceAgingTable
            buckets={invoiceAging?.buckets}
            summary={invoiceAging?.summary}
            isLoading={agingLoading || agingFetching}
          />
        </div>

        {/* Top Clients */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-yellow-600" />
              Top clienti
            </h2>
          </div>
          <TopClientsTable data={topClients} isLoading={topClientsLoading || topClientsFetching} />
        </div>
      </div>
    </div>
  );
}
