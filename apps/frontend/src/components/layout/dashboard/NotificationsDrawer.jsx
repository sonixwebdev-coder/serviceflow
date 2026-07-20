import { formatDistanceToNow } from 'date-fns';
import roDateLocale from 'date-fns/locale/ro';
import { X } from 'lucide-react';

const formatRelativeTime = (value) => {
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true, locale: roDateLocale });
  } catch {
    return '';
  }
};

export default function NotificationsDrawer({
  error,
  loading,
  markingAllRead,
  markingReadIds,
  notifications,
  onClose,
  onMarkAllRead,
  onNotificationRead,
  unreadCount,
}) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        className="flex-1 bg-gray-900/40"
        onClick={onClose}
        aria-label="Inchide notificarile"
      />
      <aside
        className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
        aria-label="Notificari"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Notificari</h2>
            <p className="text-sm text-gray-500">Fii la curent cu actualizarile echipei.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            aria-label="Inchide notificarile"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-3">
          <span className="text-sm text-gray-600">
            {unreadCount} notificar{unreadCount === 1 ? 'e necitita' : 'i necitite'}
          </span>
          <button
            type="button"
            onClick={onMarkAllRead}
            disabled={unreadCount === 0 || markingAllRead}
            className="flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-orange-600 disabled:cursor-not-allowed disabled:text-gray-400"
          >
            {markingAllRead && (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            )}
            Marcheaza toate ca citite
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : notifications.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">Nicio notificare momentan.</p>
          ) : (
            <ul className="space-y-3">
              {notifications.map((notification) => (
                <li
                  key={notification._id}
                  className={`rounded-lg border px-4 py-3 ${
                    notification.isRead
                      ? 'border-gray-200 bg-white'
                      : 'border-primary/30 bg-orange-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{notification.title}</p>
                      <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
                      <p className="mt-2 text-xs text-gray-400">
                        {notification.createdAt ? formatRelativeTime(notification.createdAt) : ''}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <button
                        type="button"
                        onClick={() => onNotificationRead(notification._id)}
                        disabled={markingReadIds.has(notification._id) || markingAllRead}
                        className="flex items-center gap-1 text-xs font-semibold text-primary transition hover:text-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {markingReadIds.has(notification._id) && (
                          <div className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        )}
                        Marcat citit
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
