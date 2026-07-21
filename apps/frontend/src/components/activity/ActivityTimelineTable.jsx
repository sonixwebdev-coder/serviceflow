import { format, formatDistanceToNow } from 'date-fns';
import roDateLocale from 'date-fns/locale/ro';
import { Activity } from 'lucide-react';
import { getActivityPresentation } from './activityPresentation';

export default function ActivityTimelineTable({
  activities,
  activeFilterCount,
  isFetching,
  isLoading,
  onPageChange,
  page,
  pagination,
}) {
  return (
    <section
      aria-label="Istoric activitate"
      className={`overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs transition-opacity ${
        isFetching && !isLoading ? 'opacity-70' : ''
      }`}
    >
      <DesktopActivityTable
        activities={activities}
        activeFilterCount={activeFilterCount}
        isLoading={isLoading}
      />
      <MobileActivityList
        activities={activities}
        activeFilterCount={activeFilterCount}
        isLoading={isLoading}
      />
      <Pagination pagination={pagination} page={page} onPageChange={onPageChange} />
    </section>
  );
}

function DesktopActivityTable({ activities, activeFilterCount, isLoading }) {
  return (
    <div className="hidden lg:block">
      <div className="grid grid-cols-5 gap-4 border-b border-gray-100 bg-gray-50/50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
        <span>Utilizator</span>
        <span className="col-span-2">Descriere</span>
        <span>Actiune / Tip</span>
        <span>Data</span>
      </div>
      {isLoading ? (
        <DesktopSkeleton />
      ) : activities.length === 0 ? (
        <EmptyState activeFilterCount={activeFilterCount} />
      ) : (
        <div className="divide-y">
          {activities.map((activity) => (
            <DesktopActivityRow key={activity.id} activity={activity} />
          ))}
        </div>
      )}
    </div>
  );
}

function DesktopActivityRow({ activity }) {
  const presentation = getActivityPresentation(activity);
  const timestamp = format(new Date(activity.createdAt), 'dd MMM yyyy, HH:mm', {
    locale: roDateLocale,
  });

  return (
    <div className="grid grid-cols-5 items-center gap-4 px-6 py-3.5 text-sm text-gray-700 transition-colors hover:bg-gray-50">
      <Actor activity={activity} presentation={presentation} size="small" />
      <div className="col-span-2 truncate text-gray-600" title={activity.description}>
        {activity.description}
      </div>
      <ActivityBadges presentation={presentation} />
      <time className="text-xs text-gray-500" dateTime={activity.createdAt} title={timestamp}>
        {timestamp}
      </time>
    </div>
  );
}

function MobileActivityList({ activities, activeFilterCount, isLoading }) {
  return (
    <div className="lg:hidden">
      {isLoading ? (
        <MobileSkeleton />
      ) : activities.length === 0 ? (
        <EmptyState activeFilterCount={activeFilterCount} />
      ) : (
        <div className="divide-y divide-gray-100">
          {activities.map((activity) => {
            const presentation = getActivityPresentation(activity);
            return (
              <article key={activity.id} className="p-4 transition hover:bg-gray-50">
                <div className="flex items-start gap-3">
                  <ActorAvatar activity={activity} presentation={presentation} size="large" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{presentation.actorName}</span>
                    </p>
                    <p className="mt-0.5 text-sm text-gray-600">{activity.description}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <ActivityBadges presentation={presentation} />
                      <time className="text-xs text-gray-400" dateTime={activity.createdAt}>
                        {formatDistanceToNow(new Date(activity.createdAt), {
                          addSuffix: true,
                          locale: roDateLocale,
                        })}
                      </time>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Actor({ activity, presentation, size }) {
  return (
    <div className="flex items-center gap-2.5">
      <ActorAvatar activity={activity} presentation={presentation} size={size} />
      <span className="truncate font-medium text-gray-900">{presentation.actorName}</span>
    </div>
  );
}

function ActorAvatar({ activity, presentation, size }) {
  const sizeClass = size === 'large' ? 'h-9 w-9' : 'h-8 w-8';
  return activity.actor?.avatarUrl ? (
    <img
      src={activity.actor.avatarUrl}
      alt={presentation.actorName}
      className={`${sizeClass} shrink-0 rounded-full object-cover`}
    />
  ) : (
    <span
      className={`${sizeClass} shrink-0 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600`}
      aria-hidden="true"
    >
      {presentation.actorInitials}
    </span>
  );
}

function ActivityBadges({ presentation }) {
  const { ActionIcon, EntityIcon } = presentation;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${presentation.actionColor}`}
      >
        <ActionIcon className="h-3 w-3" />
        {presentation.actionLabel}
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
        <EntityIcon className="h-3 w-3" />
        {presentation.entityLabel}
      </span>
    </div>
  );
}

function EmptyState({ activeFilterCount }) {
  return (
    <div className="py-12 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
        <Activity className="h-7 w-7 text-gray-400" />
      </div>
      <p className="font-medium text-gray-900">Nicio activitate gasita</p>
      <p className="mt-1 text-sm text-gray-500">
        {activeFilterCount > 0
          ? 'Incearca sa modifici filtrele'
          : 'Activitatile vor aparea aici pe masura ce se intampla'}
      </p>
    </div>
  );
}

function Pagination({ pagination, page, onPageChange }) {
  if (!pagination || pagination.pages <= 1) return null;
  return (
    <nav
      aria-label="Paginare activitate"
      className="flex flex-col gap-3 border-t border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-gray-500">
        Afisare {(pagination.page - 1) * pagination.limit + 1}-
        {Math.min(pagination.page * pagination.limit, pagination.total)} din {pagination.total}{' '}
        rezultate
      </p>
      <div className="flex items-center justify-between gap-2 sm:justify-start">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Anterior
        </button>
        <span className="text-sm text-gray-600">
          Pagina {pagination.page} din {pagination.pages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(pagination.pages, page + 1))}
          disabled={page === pagination.pages}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Urmator
        </button>
      </div>
    </nav>
  );
}

function DesktopSkeleton() {
  return (
    <div className="divide-y">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
        <div key={item} className="grid grid-cols-5 gap-4 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
            <div className="h-4 w-24 animate-pulse rounded-sm bg-gray-200" />
          </div>
          <div className="col-span-2 h-4 w-3/4 animate-pulse self-center rounded-sm bg-gray-200" />
          <div className="flex gap-2 self-center">
            <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200" />
            <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200" />
          </div>
          <div className="h-4 w-28 animate-pulse self-center rounded-sm bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

function MobileSkeleton() {
  return (
    <div className="space-y-1 p-4">
      {[1, 2, 3, 4, 5].map((item) => (
        <div key={item} className="flex gap-3 p-3">
          <div className="h-9 w-9 animate-pulse rounded-full bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 animate-pulse rounded-sm bg-gray-200" />
            <div className="flex gap-2">
              <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200" />
              <div className="h-5 w-20 animate-pulse rounded-sm bg-gray-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
