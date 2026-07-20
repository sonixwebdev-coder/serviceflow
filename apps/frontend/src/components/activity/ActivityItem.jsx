import { formatDistanceToNow, format } from 'date-fns';
import roDateLocale from 'date-fns/locale/ro';
import { getActivityPresentation } from './activityPresentation';

export default function ActivityItem({ activity, showTime = true }) {
  const {
    EntityIcon,
    ActionIcon,
    actionColor,
    actorInitials,
    actorName,
    entityLabel,
    actionLabel,
  } = getActivityPresentation(activity);

  const timeAgo = formatDistanceToNow(new Date(activity.createdAt), {
    addSuffix: true,
    locale: roDateLocale,
  });

  const fullTime = format(new Date(activity.createdAt), 'dd MMM yyyy, HH:mm', {
    locale: roDateLocale,
  });

  return (
    <div className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition group">
      {/* Avatar */}
      <div className="flex-shrink-0">
        {activity.actor?.avatarUrl ? (
          <img
            src={activity.actor.avatarUrl}
            alt={actorName}
            className="w-9 h-9 rounded-full object-cover"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
            {actorInitials}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900">
              <span className="font-medium">{actorName}</span>{' '}
              <span className="text-gray-600">{activity.description}</span>
            </p>

            {/* Entity badge */}
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${actionColor}`}
              >
                <ActionIcon className="h-3 w-3" />
                {actionLabel}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <EntityIcon className="h-3 w-3" />
                {entityLabel}
              </span>
            </div>
          </div>

          {/* Time */}
          {showTime && (
            <span
              className="flex-shrink-0 text-xs text-gray-400 group-hover:text-gray-600"
              title={fullTime}
            >
              {timeAgo}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
