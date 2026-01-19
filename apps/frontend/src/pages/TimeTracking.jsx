import { useMemo, useState, useEffect } from 'react';
import { format, differenceInMinutes } from 'date-fns';
import roDateLocale from 'date-fns/locale/ro';
import {
  Clock,
  LogIn,
  LogOut,
  Users,
  Calendar,
  Trash2,
  TrendingUp,
  MapPin,
} from 'lucide-react';
import useTimeTracking from '../hooks/useTimeTracking';
import useUsers from '../hooks/useUsers';
import { clockIn, clockOut, deleteTimeTrackingRecord } from '../services/timeTrackingService';
import useAuth from '../context/useAuth';
import useToast from '../context/useToast';
import DatePicker from '../components/ui/DatePicker';
import Pagination from '../components/Pagination';
import ExportButton from '../components/ExportButton';
import { USER_ROLES } from '../utils/constants';
import { formatHoursToRomanian } from '../utils/timeFormat';

const TimeTracking = () => {
  const { user, hasRole } = useAuth();
  const { showToast } = useToast();
  const userId = user?.id || user?._id || '';
  const isManagerial = hasRole(USER_ROLES.ADMIN);
  const [filters, setFilters] = useState({});
  const [dateFilters, setDateFilters] = useState({ startDate: null, endDate: null });
  const { records, meta, loading, error, page, setPage, refresh, setFilters: setHookFilters } = useTimeTracking(filters, { enablePagination: true });
  const { users: employees = [] } = useUsers({ isActive: true }, { enabled: isManagerial });
  const [clocking, setClocking] = useState(false);
  const [clockOutPayload, setClockOutPayload] = useState({ breakDuration: 0, clockOutLocation: '' });
  const [currentTime, setCurrentTime] = useState(new Date());

  const activeRecord = useMemo(() => {
    if (isManagerial) {
      return null;
    }
    return records.find((record) => !record.clockOut && (record.employee?._id === userId || record.employee === userId));
  }, [isManagerial, records, userId]);

  // Live timer for active shift
  useEffect(() => {
    if (!activeRecord) return;
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, [activeRecord]);

  const elapsedTime = useMemo(() => {
    if (!activeRecord) return null;
    const minutes = differenceInMinutes(currentTime, new Date(activeRecord.clockIn));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }, [activeRecord, currentTime]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const todayRecords = records.filter((record) => {
      const clockInDate = new Date(record.clockIn);
      clockInDate.setHours(0, 0, 0, 0);
      return clockInDate.getTime() === today.getTime();
    });

    const weekRecords = records.filter((record) => {
      const clockIn = new Date(record.clockIn);
      return clockIn >= startOfWeek && clockIn < endOfWeek;
    });

    const hoursToday = todayRecords.reduce((sum, r) => sum + (r.totalHours || 0), 0);
    const hoursThisWeek = weekRecords.reduce((sum, r) => sum + (r.totalHours || 0), 0);
    const activeEmployees = new Set(
      records
        .filter((r) => !r.clockOut)
        .map((r) => r.employee?._id || r.employee)
    ).size;

    return [
      { label: 'Ore astazi', value: formatHoursToRomanian(hoursToday), icon: Clock, color: 'bg-blue-500' },
      { label: 'Ore saptamana', value: formatHoursToRomanian(hoursThisWeek), icon: TrendingUp, color: 'bg-green-500' },
      { label: 'Angajati activi', value: activeEmployees, icon: Users, color: 'bg-orange-500' },
      { label: 'Total inregistrari', value: records.length, icon: Calendar, color: 'bg-purple-500' },
    ];
  }, [records]);

  const handleClockIn = async () => {
    setClocking(true);
    try {
      await clockIn();
      await refresh();
      showToast({
        title: 'Pontare intrare',
        description: 'Schimbul tau a inceput.',
        type: 'success',
      });
    } catch (clockInError) {
      showToast({
        title: 'Eroare pontare',
        description: clockInError.message || 'Te rugam sa incerci din nou.',
        type: 'error',
      });
    } finally {
      setClocking(false);
    }
  };

  const handleClockOut = async () => {
    if (!activeRecord) return;
    setClocking(true);
    try {
      await clockOut(activeRecord._id, clockOutPayload);
      setClockOutPayload({ breakDuration: 0, clockOutLocation: '' });
      await refresh();
      showToast({
        title: 'Pontare iesire',
        description: 'Schimbul tau s-a incheiat.',
        type: 'success',
      });
    } catch (clockOutError) {
      showToast({
        title: 'Eroare pontare',
        description: clockOutError.message || 'Te rugam sa incerci din nou.',
        type: 'error',
      });
    } finally {
      setClocking(false);
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm('Stergi aceasta inregistrare?')) {
      return;
    }
    try {
      await deleteTimeTrackingRecord(recordId);
      await refresh();
      showToast({
        title: 'Inregistrare stearsa',
        description: 'Intrarea a fost stearsa cu succes.',
        type: 'success',
      });
    } catch (deleteError) {
      showToast({
        title: 'Eroare stergere',
        description: deleteError.message || 'Te rugam sa incerci din nou.',
        type: 'error',
      });
    }
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    const nextFilters = { ...filters, [name]: value || undefined };
    setFilters(nextFilters);
    setHookFilters(nextFilters);
  };

  const handleFilterDateChange = (name, date) => {
    setDateFilters((current) => ({ ...current, [name]: date }));

    const nextFilters = { ...filters };
    if (date) {
      nextFilters[name] = format(date, 'yyyy-MM-dd');
    } else {
      delete nextFilters[name];
    }

    setFilters(nextFilters);
    setHookFilters(nextFilters);
  };

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setClockOutPayload({ breakDuration: 0, clockOutLocation: '' });
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header">
          <h1 className="page-title">Pontaj</h1>
          <p className="page-subtitle">
            {isManagerial
              ? 'Monitorizeaza activitatea de pontare a angajatilor.'
              : 'Pontare intrare si iesire pentru urmarirea orelor de lucru.'}
          </p>
        </div>
        {isManagerial && (
          <ExportButton
            entityType="time-tracking"
            filters={{
              employee: filters.employee,
              startDate: dateFilters.startDate ? format(dateFilters.startDate, 'yyyy-MM-dd') : undefined,
              endDate: dateFilters.endDate ? format(dateFilters.endDate, 'yyyy-MM-dd') : undefined,
            }}
          />
        )}
      </div>

      {/* Stats Cards */}
      {isManagerial && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="text-white" size={20} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Employee Clock In/Out Widget */}
      {!isManagerial && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-viperx-primary to-orange-600 px-6 py-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Clock size={20} />
              Schimbul meu
            </h2>
          </div>
          <div className="p-6">
            {activeRecord ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-800">Pontare intrare</p>
                      <p className="text-lg font-semibold text-green-900 mt-1">
                        {format(new Date(activeRecord.clockIn), 'HH:mm, dd MMMM', { locale: roDateLocale })}
                      </p>
                      {activeRecord.clockInLocation && (
                        <p className="text-xs text-green-700 flex items-center gap-1 mt-1">
                          <MapPin size={12} />
                          {activeRecord.clockInLocation}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-green-700">Timp scurs</p>
                      <p className="text-2xl font-bold text-green-900">{elapsedTime}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Durata pauza (minute)
                    </label>
                    <input
                      type="number"
                      min="0"
                      name="breakDuration"
                      value={clockOutPayload.breakDuration}
                      onChange={(event) =>
                        setClockOutPayload((current) => ({
                          ...current,
                          breakDuration: Number(event.target.value)
                        }))
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Locatie (optional)
                    </label>
                    <input
                      type="text"
                      name="clockOutLocation"
                      value={clockOutPayload.clockOutLocation}
                      onChange={(event) =>
                        setClockOutPayload((current) => ({
                          ...current,
                          clockOutLocation: event.target.value
                        }))
                      }
                      placeholder="ex. ViperX Shop"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClockOut}
                  disabled={clocking}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-viperx-primary px-6 py-3 font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition"
                >
                  <LogOut size={18} />
                  {clocking ? 'Se inregistreaza...' : 'Pontare iesire'}
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <Clock size={32} className="text-gray-400" />
                </div>
                <p className="text-gray-600 mb-4">Nu esti momentan la lucru</p>
                <button
                  type="button"
                  onClick={handleClockIn}
                  disabled={clocking}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-viperx-primary px-6 py-3 font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition"
                >
                  <LogIn size={18} />
                  {clocking ? 'Se inregistreaza...' : 'Pontare intrare'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters for Managers */}
      {isManagerial && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filtre</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Angajat</label>
              <select
                name="employee"
                value={filters.employee || ''}
                onChange={handleFilterChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
              >
                <option value="">Toti angajatii</option>
                {employees.map((employee) => (
                  <option key={employee._id} value={employee._id}>
                    {employee.firstName} {employee.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <DatePicker
                label="Data start"
                value={dateFilters.startDate}
                onChange={(date) => handleFilterDateChange('startDate', date)}
                placeholder="Oricare"
                className="w-full"
              />
            </div>
            <div>
              <DatePicker
                label="Data sfarsit"
                value={dateFilters.endDate}
                onChange={(date) => handleFilterDateChange('endDate', date)}
                minDate={dateFilters.startDate}
                placeholder="Oricare"
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Time Records */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Inregistrari pontaj</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-viperx-primary" />
          </div>
        ) : error ? (
          <div className="px-6 py-8 text-center text-sm text-red-600">{error}</div>
        ) : records.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-500">
            Nicio inregistrare gasita.
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-500">Angajat</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-500">Intrare</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-500">Iesire</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-500">Pauza (min)</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-500">Total ore</th>
                    {isManagerial && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {records.map((record) => (
                    <tr key={record._id} className={!record.clockOut ? 'bg-green-50' : ''}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {record.employee?.firstName} {record.employee?.lastName}
                        </div>
                        <div className="text-xs text-gray-500">{record.employee?.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <LogIn size={14} className="text-green-600" />
                          <span>{format(new Date(record.clockIn), 'dd MMM, HH:mm', { locale: roDateLocale })}</span>
                        </div>
                        {record.clockInLocation && (
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <MapPin size={10} />
                            {record.clockInLocation}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {record.clockOut ? (
                          <>
                            <div className="flex items-center gap-1.5">
                              <LogOut size={14} className="text-red-600" />
                              <span>{format(new Date(record.clockOut), 'dd MMM, HH:mm', { locale: roDateLocale })}</span>
                            </div>
                            {record.clockOutLocation && (
                              <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                <MapPin size={10} />
                                {record.clockOutLocation}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                            <Clock size={12} />
                            Activ
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">{record.breakDuration ?? 0}</td>
                      <td className="px-4 py-3 font-medium">
                        {record.totalHours ? formatHoursToRomanian(record.totalHours) : '—'}
                      </td>
                      {isManagerial && (
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteRecord(record._id)}
                            className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700 transition"
                            title="Sterge"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden divide-y divide-gray-200">
              {records.map((record) => (
                <div key={record._id} className={`p-4 ${!record.clockOut ? 'bg-green-50' : ''}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {record.employee?.firstName} {record.employee?.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{record.employee?.email}</p>
                    </div>
                    {!record.clockOut && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                        <Clock size={12} />
                        Activ
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <LogIn size={14} className="text-green-600" />
                      <span className="text-gray-600">Intrare:</span>
                      <span className="font-medium">
                        {format(new Date(record.clockIn), 'dd MMM, HH:mm', { locale: roDateLocale })}
                      </span>
                    </div>
                    {record.clockInLocation && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 ml-6">
                        <MapPin size={10} />
                        {record.clockInLocation}
                      </div>
                    )}

                    {record.clockOut ? (
                      <>
                        <div className="flex items-center gap-2">
                          <LogOut size={14} className="text-red-600" />
                          <span className="text-gray-600">Iesire:</span>
                          <span className="font-medium">
                            {format(new Date(record.clockOut), 'dd MMM, HH:mm', { locale: roDateLocale })}
                          </span>
                        </div>
                        {record.clockOutLocation && (
                          <div className="flex items-center gap-2 text-xs text-gray-500 ml-6">
                            <MapPin size={10} />
                            {record.clockOutLocation}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <LogOut size={14} className="text-gray-400" />
                        <span className="text-gray-600">Iesire:</span>
                        <span className="text-gray-400">—</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                      <div className="flex items-center gap-4 text-xs">
                        <div>
                          <span className="text-gray-500">Pauza: </span>
                          <span className="font-medium">{record.breakDuration ?? 0} min</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Total: </span>
                          <span className="font-medium">{record.totalHours ? formatHoursToRomanian(record.totalHours) : '—'}</span>
                        </div>
                      </div>
                      {isManagerial && (
                        <button
                          type="button"
                          onClick={() => handleDeleteRecord(record._id)}
                          className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {meta && (
          <Pagination
            currentPage={meta.page}
            totalPages={meta.totalPages}
            onPageChange={setPage}
            totalItems={meta.total}
            pageSize={meta.limit}
          />
        )}
      </div>
    </div>
  );
};

export default TimeTracking;
