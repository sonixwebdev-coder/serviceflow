import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import roDateLocale from 'date-fns/locale/ro';
import {
  LayoutDashboard,
  ClipboardList,
  Umbrella,
  Clock,
  Users,
  Menu,
  X,
  LogOut,
  Bell,
  CalendarDays,
  UserCircle,
  Settings,
  FileText,
  User,
  FileCheck,
  Globe,
  CheckSquare
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { USER_ROLES } from '../../utils/constants';
import useAuth from '../../context/useAuth';
import useToast from '../../context/useToast';
import useNotifications from '../../hooks/useNotifications';
import { markNotificationRead, markNotificationsRead } from '../../services/notificationService';

const formatRelativeTime = (value) => {
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true, locale: roDateLocale });
  } catch {
    return '';
  }
};

const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [markingReadIds, setMarkingReadIds] = useState(new Set());
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const { user, logout, hasRole } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();

  const {
    notifications,
    loading: notificationsLoading,
    error: notificationsError,
    refresh: refreshNotifications,
  } = useNotifications();

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.isRead),
    [notifications]
  );
  const unreadCount = unreadNotifications.length;

  const navigation = [
    { name: 'Tablou de bord', href: '/dashboard', icon: LayoutDashboard, roles: [] },
    { name: 'Task-uri', href: '/tasks', icon: ClipboardList, roles: [] },
    { name: 'Todo-uri Personale', href: '/personal-todos', icon: CheckSquare, roles: [] },
    { name: 'CRM Clienti', href: '/crm/clients', icon: UserCircle, roles: [] },
    { name: 'Clienti Online', href: '/crm/online-clients', icon: Globe, roles: [] },
    { name: 'CRM Programari', href: '/crm/appointments', icon: CalendarDays, roles: [] },
    { name: 'Facturi', href: '/crm/invoices', icon: FileText, roles: [USER_ROLES.ADMIN, USER_ROLES.MANAGER] },
    { name: 'ANAF E-Factura', href: '/anaf', icon: FileCheck, roles: [USER_ROLES.ADMIN] },
    { name: 'Cereri concediu', href: '/leaves', icon: Umbrella, roles: [] },
    { name: 'Pontaj', href: '/time-tracking', icon: Clock, roles: [] },
    { name: 'Angajati', href: '/employees', icon: Users, roles: [USER_ROLES.ADMIN] },
    { name: 'Setari companie', href: '/settings/company', icon: Settings, roles: [USER_ROLES.ADMIN] },
  ];

  const filteredNavigation = navigation.filter((item) => {
    if (item.roles.length === 0) return true;
    return hasRole(...item.roles);
  });

  useEffect(() => {
    if (notificationsOpen) {
      refreshNotifications();
    }
  }, [notificationsOpen, refreshNotifications]);

  const handleNotificationRead = async (notificationId) => {
    if (markingReadIds.has(notificationId)) return;

    setMarkingReadIds((prev) => new Set(prev).add(notificationId));
    try {
      await markNotificationRead(notificationId);
      await refreshNotifications();
    } catch (error) {
      showToast({
        title: 'Eroare la actualizare notificare',
        description: error.message || 'Te rugam sa incerci din nou.',
        type: 'error',
      });
    } finally {
      setMarkingReadIds((prev) => {
        const next = new Set(prev);
        next.delete(notificationId);
        return next;
      });
    }
  };

  const handleMarkAllRead = async () => {
    if (!unreadCount || markingAllRead) return;

    setMarkingAllRead(true);
    try {
      await markNotificationsRead(unreadNotifications.map((notification) => notification._id));
      await refreshNotifications();
      showToast({
        title: 'Notificari actualizate',
        description: 'Toate notificarile au fost marcate ca citite.',
        type: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Eroare la actualizare notificari',
        description: error.message || 'Te rugam sa incerci din nou.',
        type: 'error',
      });
    } finally {
      setMarkingAllRead(false);
    }
  };

  const renderSidebarContent = (onNavigate) => (
    <div className="flex h-full flex-col text-white">
      <div className="flex h-16 items-center justify-between px-6">
        <span className="text-2xl font-bold text-viperx-primary">ServiceFlow</span>
        <button
          type="button"
          className="lg:hidden text-gray-400 hover:text-white"
          onClick={() => setSidebarOpen(false)}
        >
          <X size={22} />
        </button>
      </div>
      <nav className="flex-1 space-y-1 px-4 py-4">
        {filteredNavigation.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => {
                onNavigate?.();
              }}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-viperx-primary text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-gray-700 px-4 py-4">
        <div className="flex items-center gap-3 text-sm text-gray-200">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-viperx-primary font-semibold text-white">
            {user?.firstName?.[0]}
            {user?.lastName?.[0]}
          </div>
          <div>
            <p className="font-semibold text-white">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs capitalize text-gray-400">{user?.role}</p>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          <Link
            to="/profile"
            onClick={() => {
              onNavigate?.();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-gray-600 hover:text-white"
          >
            <User size={18} />
            Profil
          </Link>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-gray-600 hover:text-white"
          >
            <LogOut size={18} />
            Deconecteaza-te
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="flex-1 bg-gray-900/40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative flex h-full w-64 flex-col bg-viperx-secondary shadow-2xl">
            {renderSidebarContent(() => setSidebarOpen(false))}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:h-screen lg:w-64 lg:flex-col lg:bg-viperx-secondary lg:shadow-xl lg:sticky lg:top-0">
        {renderSidebarContent()}
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
          <button
            type="button"
            className="text-gray-600 transition hover:text-gray-900 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>

          <div className="flex flex-1 items-center justify-end gap-3">
            <button
              type="button"
              className="relative rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
              onClick={() => setNotificationsOpen(true)}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="mx-auto w-full max-w-7xl space-y-6">{children}</div>
        </main>
      </div>

      {notificationsOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div
            className="flex-1 bg-gray-900/40"
            onClick={() => setNotificationsOpen(false)}
          />
          <aside className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Notificari</h2>
                <p className="text-sm text-gray-500">Fii la curent cu actualizarile echipei.</p>
              </div>
              <button
                type="button"
                onClick={() => setNotificationsOpen(false)}
                className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
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
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0 || markingAllRead}
                className="flex items-center gap-2 text-sm font-semibold text-viperx-primary transition hover:text-orange-600 disabled:cursor-not-allowed disabled:text-gray-400"
              >
                {markingAllRead && (
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-viperx-primary border-t-transparent" />
                )}
                Marcheaza toate ca citite
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {notificationsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-viperx-primary" />
                </div>
              ) : notificationsError ? (
                <p className="text-sm text-red-600">{notificationsError}</p>
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
                          : 'border-viperx-primary/30 bg-orange-50'
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
                            onClick={() => handleNotificationRead(notification._id)}
                            disabled={markingReadIds.has(notification._id) || markingAllRead}
                            className="flex items-center gap-1 text-xs font-semibold text-viperx-primary transition hover:text-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {markingReadIds.has(notification._id) && (
                              <div className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-viperx-primary border-t-transparent" />
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
      )}
    </div>
  );
};

export default DashboardLayout;
