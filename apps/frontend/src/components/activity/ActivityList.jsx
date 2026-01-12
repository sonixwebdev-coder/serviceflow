import { Activity } from 'lucide-react';
import ActivityItem from './ActivityItem';

const ListSkeleton = () => (
  <div className="space-y-1">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="flex gap-3 p-3">
        <div className="h-9 w-9 animate-pulse rounded-full bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
          <div className="flex gap-2">
            <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200" />
            <div className="h-5 w-20 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default function ActivityList({
  activities = [],
  isLoading = false,
  emptyMessage = 'Nicio activitate',
  emptyDescription = 'Activitatile vor aparea aici',
  showTime = true,
}) {
  if (isLoading) {
    return <ListSkeleton />;
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
          <Activity className="h-7 w-7 text-gray-400" />
        </div>
        <p className="font-medium text-gray-900">{emptyMessage}</p>
        <p className="text-sm text-gray-500 mt-1">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {activities.map((activity) => (
        <ActivityItem
          key={activity.id}
          activity={activity}
          showTime={showTime}
        />
      ))}
    </div>
  );
}
