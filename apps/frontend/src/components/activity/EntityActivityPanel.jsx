import { Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useEntityActivity } from '../../hooks/useAuditLogs';
import ActivityItem from './ActivityItem';

const PanelSkeleton = () => (
  <div className="space-y-2 p-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex gap-3">
        <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
        <div className="flex-1 space-y-1">
          <div className="h-3 w-3/4 animate-pulse rounded-sm bg-gray-200" />
          <div className="h-3 w-1/2 animate-pulse rounded-sm bg-gray-200" />
        </div>
      </div>
    ))}
  </div>
);

export default function EntityActivityPanel({
  entityType,
  entityId,
  title = 'Activitate',
  limit = 10,
  defaultExpanded = true,
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const { data: activities = [], isLoading } = useEntityActivity(entityType, entityId, {
    limit,
    enabled: isExpanded,
  });

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition"
      >
        <h3 className="font-medium text-gray-900 flex items-center gap-2 text-sm">
          <Activity className="h-4 w-4 text-gray-500" />
          {title}
          {activities.length > 0 && (
            <span className="text-xs text-gray-500">({activities.length})</span>
          )}
        </h3>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="bg-white">
          {isLoading ? (
            <PanelSkeleton />
          ) : activities.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-sm text-gray-500">Nicio activitate inregistrata</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} showTime={true} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
