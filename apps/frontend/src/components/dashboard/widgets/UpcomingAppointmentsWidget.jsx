import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isTomorrow, isThisWeek } from 'date-fns';
import roDateLocale from 'date-fns/locale/ro';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { useAppointments } from '../../../hooks/useAppointments';

const ListSkeleton = () => (
  <div className="space-y-2">
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
        <div className="w-12 space-y-1">
          <div className="h-4 w-10 animate-pulse rounded-sm bg-gray-200" />
          <div className="h-3 w-6 animate-pulse rounded-sm bg-gray-200" />
        </div>
        <div className="flex-1 space-y-1">
          <div className="h-4 w-32 animate-pulse rounded-sm bg-gray-200" />
          <div className="h-3 w-20 animate-pulse rounded-sm bg-gray-200" />
        </div>
      </div>
    ))}
  </div>
);

export default function UpcomingAppointmentsWidget() {
  const navigate = useNavigate();
  const { data: appointments = [], isLoading } = useAppointments();
  const upcomingAppointments = useMemo(() => {
    const now = new Date();
    return appointments
      .filter((apt) => {
        if (!apt.scheduledStart) return false;
        const aptDate = new Date(apt.scheduledStart);
        // Show appointments from today onwards (excluding past ones today)
        return aptDate >= now || isToday(aptDate);
      })
      .sort((a, b) => new Date(a.scheduledStart) - new Date(b.scheduledStart))
      .slice(0, 6);
  }, [appointments]);

  const getDateLabel = (date) => {
    if (isToday(date)) return 'Astazi';
    if (isTomorrow(date)) return 'Maine';
    if (isThisWeek(date, { weekStartsOn: 1 })) {
      return format(date, 'EEEE', { locale: roDateLocale });
    }
    return format(date, 'dd MMM', { locale: roDateLocale });
  };

  if (isLoading) {
    return <ListSkeleton />;
  }

  if (upcomingAppointments.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <CalendarDays className="h-6 w-6 text-gray-400" />
        </div>
        <p className="font-medium text-gray-900">Nicio programare viitoare</p>
        <p className="text-sm text-gray-500 mt-1">Calendarul este liber</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {upcomingAppointments.map((apt) => {
        const aptDate = new Date(apt.scheduledStart);
        const isTodayApt = isToday(aptDate);
        const isPast = aptDate < new Date() && !isTodayApt;

        return (
          <div
            key={apt.id}
            onClick={() => navigate('/crm/appointments')}
            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
              isTodayApt ? 'rbc-selected-cell hover:bg-primary/10' : 'bg-gray-50 hover:bg-gray-100'
            } ${isPast ? 'opacity-50' : ''}`}
          >
            <div className="w-12 text-center shrink-0">
              <p
                className={`text-sm font-semibold ${isTodayApt ? 'text-primary' : 'text-gray-900'}`}
              >
                {format(aptDate, 'HH:mm')}
              </p>
              <p className="text-[10px] text-gray-500 uppercase">{getDateLabel(aptDate)}</p>
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium truncate ${isTodayApt ? 'text-primary' : 'text-gray-900'}`}
              >
                {apt.title}
              </p>
              {apt.client && (
                <p className="text-xs text-gray-500 truncate">
                  {apt.client.firstName} {apt.client.lastName}
                </p>
              )}
            </div>
            {isTodayApt && (
              <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full font-medium shrink-0">
                AZI
              </span>
            )}
          </div>
        );
      })}

      <button
        onClick={() => navigate('/crm/appointments')}
        className="w-full text-center text-sm text-primary hover:text-orange-600 font-medium py-2 flex items-center justify-center gap-1"
      >
        Vezi calendarul <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
