import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { useAppointments } from '@/hooks/useAppointments';
import { formatDateTime } from '@/lib/utils';

const statusOptions = [
  { value: '', label: 'Toate' },
  { value: 'SCHEDULED', label: 'Programate' },
  { value: 'IN_PROGRESS', label: 'In progres' },
  { value: 'COMPLETED', label: 'Finalizate' },
  { value: 'CANCELLED', label: 'Anulate' },
];

export default function Appointments() {
  const [filters, setFilters] = useState({ status: '', page: 1, limit: 10 });
  const { data, isLoading } = useAppointments(filters);

  const appointments = data?.items || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Programari</h1>
        <p className="page-subtitle">Vizualizeaza istoricul programarilor tale</p>
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

      {/* Appointments list */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
            </div>
          ) : appointments.length === 0 ? (
            <div className="empty-state">
              <Calendar className="empty-state-icon" />
              <p className="empty-state-title">Nu exista programari</p>
              <p className="empty-state-text">Programarile tale vor aparea aici.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {appointments.map((appointment) => (
                <Link
                  key={appointment.id}
                  to={`/appointments/${appointment.id}`}
                  className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-medium text-gray-900">{appointment.title}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatDateTime(appointment.scheduledStart)}
                        </span>
                        {appointment.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {appointment.location}
                          </span>
                        )}
                      </div>
                      {(appointment.vehicle || appointment.asset) && (
                        <p className="text-sm text-gray-500">
                          {appointment.vehicle
                            ? `${appointment.vehicle.make} ${appointment.vehicle.model} - ${appointment.vehicle.plateNumber}`
                            : `${appointment.asset.name} (${appointment.asset.type})`}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={appointment.status} />
                  </div>
                </Link>
              ))}
            </div>
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
