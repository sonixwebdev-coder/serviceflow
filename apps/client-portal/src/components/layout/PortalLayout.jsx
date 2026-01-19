import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { Calendar, FileText, User, LogOut, Home, Menu, X, Bell, Check } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useAuthStore } from '@/state/useAuthStore';
import { useLogout } from '@/hooks/useAuth';
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Programari', href: '/appointments', icon: Calendar },
  { name: 'Facturi', href: '/invoices', icon: FileText },
  { name: 'Profil', href: '/profile', icon: User },
];

export default function PortalLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const client = useAuthStore((state) => state.client);
  const logoutMutation = useLogout();
  const navigate = useNavigate();

  // Initialize real-time events connection
  useRealtimeEvents();

  // Notifications
  const {
    notifications,
    loading: notificationsLoading,
    unreadCount,
    markRead,
    markAllRead,
    markingAllRead,
  } = useNotifications();

  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.isRead),
    [notifications]
  );

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => navigate('/login'),
    });
  };

  const clientName = client?.companyName || `${client?.firstName || ''} ${client?.lastName || ''}`.trim() || 'Client';

  const formatRelativeTime = (date) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Acum';
    if (diffMins < 60) return `Acum ${diffMins} min`;
    if (diffHours < 24) return `Acum ${diffHours} ore`;
    if (diffDays < 7) return `Acum ${diffDays} zile`;
    return then.toLocaleDateString('ro-RO');
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.entityType === 'appointment' && notification.entityId) {
      navigate(`/appointments/${notification.entityId}`);
      setNotificationsOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-lg font-semibold text-primary-600">Portal Client</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 rounded-lg hover:bg-gray-100"
            >
              <Bell className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 h-5 w-5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <nav className="px-4 pb-4 space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 w-full"
            >
              <LogOut className="h-5 w-5" />
              Deconectare
            </button>
          </nav>
        )}
      </div>

      <div className="lg:flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-gray-200">
          <div className="flex flex-col flex-1 overflow-y-auto">
            {/* Logo */}
            <div className="flex items-center h-16 px-6 border-b border-gray-200">
              <span className="text-xl font-bold text-primary-600">Portal Client</span>
            </div>

            {/* User info */}
            <div className="px-6 py-4 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900 truncate">{clientName}</p>
              <p className="text-xs text-gray-500 truncate">{client?.email}</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-1">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    )
                  }
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </NavLink>
              ))}
            </nav>

            {/* Logout button */}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 w-full transition-colors"
              >
                <LogOut className="h-5 w-5" />
                Deconectare
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:ml-64">
          {/* Desktop header with notification bell */}
          <div className="hidden lg:flex items-center justify-end h-16 px-8 bg-white border-b border-gray-200">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 rounded-lg hover:bg-gray-100"
            >
              <Bell className="h-6 w-6 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 h-5 w-5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>

          <div className="py-6 px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Notification dropdown */}
      {notificationsOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setNotificationsOpen(false)}
          />
          <div className="fixed right-4 top-16 lg:top-20 z-50 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-200 max-h-[calc(100vh-100px)] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Notificari</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllRead()}
                    disabled={markingAllRead}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
                  >
                    Marcheaza toate citite
                  </button>
                )}
                <button
                  onClick={() => setNotificationsOpen(false)}
                  className="p-1 rounded-lg hover:bg-gray-100"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {notificationsLoading ? (
                <div className="p-4 text-center text-gray-500">Se incarca...</div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Nu ai notificari</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        'w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors',
                        !notification.isRead && 'bg-primary-50/50'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            'text-sm',
                            notification.isRead ? 'text-gray-900' : 'text-gray-900 font-semibold'
                          )}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatRelativeTime(notification.createdAt)}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <span className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-primary-500" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
