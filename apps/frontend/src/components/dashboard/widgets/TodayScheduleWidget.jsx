import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isTomorrow } from 'date-fns';
import roDateLocale from 'date-fns/locale/ro';
import { Calendar, Circle, ChevronRight } from 'lucide-react';
import { useAppointments } from '../../../hooks/useAppointments';

const TimelineSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3].map(i => (
      <div key={i} className="flex gap-3">
        <div className="w-14 space-y-1">
          <div className="h-4 w-10 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="flex-1 p-3 rounded-lg bg-gray-50">
          <div className="h-4 w-32 animate-pulse rounded bg-gray-200 mb-2" />
          <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
    ))}
  </div>
);

export default function TodayScheduleWidget() {
  const navigate = useNavigate();
  const { data: appointments = [], isLoading } = useAppointments();
  const now = new Date();

  const todayTimeline = useMemo(() => {
    return appointments
      .filter(apt => apt.scheduledStart && isToday(new Date(apt.scheduledStart)))
      .sort((a, b) => new Date(a.scheduledStart) - new Date(b.scheduledStart));
  }, [appointments]);

  const tomorrowFirst = useMemo(() => {
    return appointments
      .filter(apt => apt.scheduledStart && isTomorrow(new Date(apt.scheduledStart)))
      .sort((a, b) => new Date(a.scheduledStart) - new Date(b.scheduledStart))[0];
  }, [appointments]);

  const currentAppointment = todayTimeline.find(item => {
    const start = new Date(item.scheduledStart);
    const end = item.scheduledEnd ? new Date(item.scheduledEnd) : null;
    return start <= now && end && end > now;
  });

  if (isLoading) {
    return <TimelineSkeleton />;
  }

  if (todayTimeline.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <Calendar className="h-6 w-6 text-gray-400" />
        </div>
        <p className="font-medium text-gray-900">Nicio programare astazi</p>
        {tomorrowFirst && (
          <p className="text-sm text-gray-500 mt-1">
            Maine: {tomorrowFirst.title} la {format(new Date(tomorrowFirst.scheduledStart), 'HH:mm')}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {todayTimeline.map((item) => {
        const startTime = new Date(item.scheduledStart);
        const endTime = item.scheduledEnd ? new Date(item.scheduledEnd) : null;
        const isPastItem = endTime ? endTime < now : startTime < now;
        const isCurrent = currentAppointment?.id === item.id;

        return (
          <div
            key={item.id}
            onClick={() => navigate('/crm/appointments')}
            className={`flex gap-3 cursor-pointer group ${isPastItem && !isCurrent ? 'opacity-50' : ''}`}
          >
            <div className="w-14 text-right flex-shrink-0 pt-3">
              <p className={`text-sm font-semibold ${isCurrent ? 'text-primary' : 'text-gray-700'}`}>
                {format(startTime, 'HH:mm')}
              </p>
            </div>

            <div className="flex-shrink-0 pt-4">
              {isCurrent ? (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                </span>
              ) : (
                <Circle className={`h-2.5 w-2.5 ${isPastItem ? 'text-gray-300 fill-gray-300' : 'text-primary fill-primary'}`} />
              )}
            </div>

            <div className={`flex-1 p-3 rounded-lg transition ${
              isCurrent
                ? 'bg-primary/10 border border-primary'
                : 'bg-gray-50 group-hover:bg-gray-100'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-medium text-sm ${isCurrent ? 'text-primary' : 'text-gray-900'}`}>
                    {item.title}
                  </p>
                  {item.client && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {item.client.firstName} {item.client.lastName}
                    </p>
                  )}
                </div>
                {isCurrent && (
                  <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full font-medium">
                    ACUM
                  </span>
                )}
              </div>
            </div>
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
