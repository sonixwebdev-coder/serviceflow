import { format } from 'date-fns';
import { STATUS_DOT_COLORS } from './constants';

function MonthEvent({ event }) {
  const status = event.resource?.status;
  const dotColor = STATUS_DOT_COLORS[status] || 'rgb(229, 231, 235)';
  const timeStr = event.start ? format(event.start, 'HH:mm') : '';
  const endStr = event.end ? format(event.end, 'HH:mm') : '';

  return (
    <div
      className="flex items-center gap-1 truncate"
      title={`${event.title} - ${timeStr} - ${endStr}`}
    >
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
      <span className="truncate text-[11px]">{event.title}</span>
    </div>
  );
}

export default MonthEvent;
