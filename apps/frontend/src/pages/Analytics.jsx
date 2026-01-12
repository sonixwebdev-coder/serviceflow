import { useState, useMemo } from 'react';
import { subDays, format } from 'date-fns';
import {
  BarChart3,
  DollarSign,
  Users,
  Calendar,
  FileText,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import {
  useOverview,
  useRevenueTrends,
  useAppointmentStats,
  useClientAcquisition,
  useInvoiceAging,
  useTopClients,
} from '../hooks/useAnalytics';
import MetricCard from '../components/analytics/MetricCard';
import RevenueChart from '../components/analytics/RevenueChart';
import AppointmentMetrics from '../components/analytics/AppointmentMetrics';
import ClientGrowthChart from '../components/analytics/ClientGrowthChart';
import InvoiceAgingTable from '../components/analytics/InvoiceAgingTable';
import TopClientsTable from '../components/analytics/TopClientsTable';
import DateRangeFilter from '../components/analytics/DateRangeFilter';

const DEFAULT_RANGE = {
  startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
  endDate: format(new Date(), 'yyyy-MM-dd'),
  preset: '30d',
};

export default function Analytics() {
  const [dateRange, setDateRange] = useState(DEFAULT_RANGE);

  const queryParams = useMemo(
    () => ({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    }),
    [dateRange.startDate, dateRange.endDate]
  );

  // Fetch all analytics data
  const { data: overview, isLoading: overviewLoading, refetch: refetchOverview } = useOverview();
  const { data: revenue, isLoading: revenueLoading, refetch: refetchRevenue } = useRevenueTrends(queryParams);
  const { data: appointments, isLoading: appointmentsLoading, refetch: refetchAppointments } = useAppointmentStats(queryParams);
  const { data: clients, isLoading: clientsLoading, refetch: refetchClients } = useClientAcquisition(queryParams);
  const { data: invoiceAging, isLoading: agingLoading, refetch: refetchAging } = useInvoiceAging();
  const { data: topClients, isLoading: topClientsLoading, refetch: refetchTopClients } = useTopClients(queryParams);

  const handleRefreshAll = () => {
    refetchOverview();
    refetchRevenue();
    refetchAppointments();
    refetchClients();
    refetchAging();
    refetchTopClients();
  };

  const isAnyLoading =
    overviewLoading ||
    revenueLoading ||
    appointmentsLoading ||
    clientsLoading ||
    agingLoading ||
    topClientsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-viperx-primary" />
            Statistici
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Metrici si analize pentru afacerea ta
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshAll}
            disabled={isAnyLoading}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition disabled:opacity-50"
            title="Reincarca datele"
          >
            <RefreshCw
              className={`h-4 w-4 text-gray-600 ${isAnyLoading ? 'animate-spin' : ''}`}
            />
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Venituri luna aceasta"
          value={overview?.revenue?.thisMonth || 0}
          format="currency"
          icon={DollarSign}
          iconColor="text-green-600"
          iconBg="bg-green-100"
        />
        <MetricCard
          title="Programari azi"
          value={overview?.appointments?.today || 0}
          icon={Calendar}
          iconColor="text-blue-600"
          iconBg="bg-blue-100"
        />
        <MetricCard
          title="Total clienti"
          value={overview?.clients?.total || 0}
          icon={Users}
          iconColor="text-viperx-primary"
          iconBg="bg-viperx-primary/10"
        />
        <MetricCard
          title="Facturi restante"
          value={overview?.invoices?.overdue || 0}
          icon={FileText}
          iconColor="text-red-600"
          iconBg="bg-red-100"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-viperx-primary" />
              Evolutia veniturilor
            </h2>
          </div>
          {revenue?.summary && (
            <div className="flex items-center gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500">Total perioada</p>
                <p className="text-xl font-bold text-gray-900">
                  {new Intl.NumberFormat('ro-RO', {
                    style: 'currency',
                    currency: 'RON',
                    minimumFractionDigits: 0,
                  }).format(revenue.summary.totalRevenue)}
                </p>
              </div>
              {revenue.summary.revenueChange !== undefined && (
                <div
                  className={`px-2 py-1 rounded text-sm font-medium ${
                    revenue.summary.revenueChange >= 0
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {revenue.summary.revenueChange >= 0 ? '+' : ''}
                  {revenue.summary.revenueChange.toFixed(1)}% vs perioada anterioara
                </div>
              )}
            </div>
          )}
          <RevenueChart data={revenue?.data} isLoading={revenueLoading} />
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
                <p className="text-xl font-bold text-gray-900">
                  {appointments.summary.total}
                </p>
              </div>
            </div>
          )}
          <AppointmentMetrics
            data={appointments?.data}
            byStatus={appointments?.byStatus}
            isLoading={appointmentsLoading}
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
                <p className="text-xl font-bold text-gray-900">
                  +{clients.summary.newClients}
                </p>
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
            isLoading={clientsLoading}
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
            isLoading={agingLoading}
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
          <TopClientsTable data={topClients} isLoading={topClientsLoading} />
        </div>
      </div>
    </div>
  );
}
