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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Programari</h1>
        <p className="mt-1 text-gray-500">Vizualizeaza istoricul programarilor tale</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setFilters({ ...filters, status: option.value, page: 1 })}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filters.status === option.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Appointments list */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-center text-gray-500">Se incarca...</div>
          ) : appointments.length === 0 ? (
            <div className="p-6 text-center text-gray-500">Nu exista programari</div>
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
