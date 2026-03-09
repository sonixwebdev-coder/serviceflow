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
  // FileCheck, // ANAF functionality temporarily disabled
  Globe,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Briefcase,
  MessageSquare,
  MoreVertical,
  Activity,
  BarChart3,
  Package,
  Mail,
  MapPin,
  CreditCard,
  Gift,
  LifeBuoy,

} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { USER_ROLES } from '../../utils/constants';
import useAuth from '../../context/useAuth';
import useToast from '../../context/useToast';
import { useTerminology } from '../../context/TerminologyContext';
import useNotifications from '../../hooks/useNotifications';
import { markNotificationRead, markNotificationsRead } from '../../services/notificationService';
import FloatingChatWidget from '../chat/FloatingChatWidget';
import LocationSwitcher from '../LocationSwitcher';
import LocationSwitchingOverlay from '../LocationSwitchingOverlay';
import { useMyLocations } from '../../hooks/useLocations';

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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    crm: true,
    echipa: false,
    setari: false,
  });

  const { user, logout, hasRole } = useAuth();
  const { showToast } = useToast();
  const { features } = useTerminology();
  const hasAssets = features?.useAssets !== false; // Default to true if undefined
  const location = useLocation();

  // Initialize user locations
  useMyLocations();

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

  const navigation = useMemo(() => {
    // Build CRM children based on features
    // Appointments first — most frequently used in daily operations
    const crmChildren = [
      { name: 'Programari', href: '/crm/appointments', icon: CalendarDays, roles: [] },
      { name: 'Clienti', href: '/crm/clients', icon: UserCircle, roles: [] },
      { name: 'Clienti Online', href: '/crm/online-clients', icon: Globe, roles: [] },
      { name: 'Facturi', href: '/crm/invoices', icon: FileText, roles: [USER_ROLES.ADMIN, USER_ROLES.MANAGER] },
      { name: 'Fidelitate', href: '/crm/loyalty', icon: Gift, roles: [] },
    ];

    // Only show Assets nav item for sectors with assets (not BEAUTY)
    // Placed after Online Clients, before Invoices
    if (hasAssets) {
      crmChildren.splice(3, 0, { name: 'Active', href: '/crm/assets', icon: Package, roles: [] });
    }

    return [
    // 1. Primary entry point
    {
      name: 'Tablou de bord',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: []
    },

    // 2. Core business operations
    {
      name: 'CRM',
      key: 'crm',
      icon: Briefcase,
      roles: [],
      children: crmChildren
    },

    // 3. Team & internal operations
    {
      name: 'Echipa & Pontaj',
      key: 'echipa',
      icon: Users,
      roles: [],
      children: [
        { name: 'Task-uri', href: '/tasks', icon: ClipboardList, roles: [] },
        { name: 'Todo-uri Personale', href: '/personal-todos', icon: CheckSquare, roles: [] },
        { name: 'Pontaj', href: '/time-tracking', icon: Clock, roles: [] },
        { name: 'Cereri concediu', href: '/leaves', icon: Umbrella, roles: [] },
        { name: 'Angajati', href: '/employees', icon: Users, roles: [USER_ROLES.ADMIN] },
      ]
    },

    // 4. Communication & monitoring
    {
      name: 'Chat',
      href: '/chat',
      icon: MessageSquare,
      roles: []
    },
    {
      name: 'Activitate',
      href: '/activity',
      icon: Activity,
      roles: []
    },
    {
      name: 'Statistici',
      href: '/analytics',
      icon: BarChart3,
      roles: []
    },

    // 5. Configuration (admin only)
    // ANAF functionality temporarily disabled
    // {
    //   name: 'ANAF E-Factura',
    //   href: '/anaf',
    //   icon: FileCheck,
    //   roles: [USER_ROLES.ADMIN]
    // },
    {
      name: 'Setari',
      key: 'setari',
      icon: Settings,
      roles: [USER_ROLES.ADMIN],
      children: [
        { name: 'Setari companie', href: '/settings/company', icon: Settings, roles: [USER_ROLES.ADMIN] },
        { name: 'Setari organizatie', href: '/settings/organization', icon: Settings, roles: [USER_ROLES.ADMIN] },
        { name: 'Locatii', href: '/settings/locations', icon: MapPin, roles: [USER_ROLES.ADMIN] },
        { name: 'Servicii', href: '/settings/services', icon: Briefcase, roles: [USER_ROLES.ADMIN] },
        { name: 'Website', href: '/settings/website', icon: Globe, roles: [USER_ROLES.ADMIN] },
        { name: 'Template-uri Email', href: '/settings/email-templates', icon: Mail, roles: [USER_ROLES.ADMIN] },
        { name: 'Fidelitate', href: '/settings/loyalty', icon: Gift, roles: [USER_ROLES.ADMIN] },
        { name: 'Abonament', href: '/settings/billing', icon: CreditCard, roles: [USER_ROLES.ADMIN] },
      ]
    },

    // 6. Help & support (always last)
    {
      name: 'Suport',
      href: '/support',
      icon: LifeBuoy,
      roles: []
    },
  ];
  }, [hasAssets]);

  const filteredNavigation = navigation.filter((item) => {
    if (item.roles.length === 0) return true;
    return hasRole(...item.roles);
  });

  // Auto-expand section containing active page (only on route change)
  useEffect(() => {
    let activeSectionKey = null;

    // Find which section contains the active page
    navigation.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some(child => location.pathname === child.href);
        if (hasActiveChild) {
          activeSectionKey = item.key;
        }
      }
    });

    // If an active section was found, expand only that one (accordion behavior)
    if (activeSectionKey) {
      setExpandedSections({
        crm: activeSectionKey === 'crm',
        echipa: activeSectionKey === 'echipa',
        setari: activeSectionKey === 'setari',
      });
    }
  }, [location.pathname, navigation]);

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

  const toggleSection = (key) => {
    setExpandedSections((prev) => {
      const isCurrentlyExpanded = prev[key];

      // If clicking to expand, close all other sections (accordion behavior)
      if (!isCurrentlyExpanded) {
        const newState = { crm: false, echipa: false, setari: false };
        newState[key] = true;
        return newState;
      }

      // If clicking to collapse, just collapse this one
      return {
        ...prev,
        [key]: false,
      };
    });
  };

  const renderSidebarContent = (onNavigate) => (
    <div className="flex h-full flex-col text-white">
      <div className="flex h-16 items-center justify-between px-6">
        <span className="text-2xl font-bold text-primary">ForjaIt</span>
        <button
          type="button"
          className="lg:hidden text-gray-400 hover:text-white"
          onClick={() => setSidebarOpen(false)}
        >
          <X size={22} />
        </button>
      </div>
      <nav className="flex-1 space-y-1 px-4 py-4 overflow-y-auto">
        {filteredNavigation.map((item) => {
          const Icon = item.icon;

          // Item with children (collapsible section)
          if (item.children) {
            const isExpanded = expandedSections[item.key];
            const hasActiveChild = item.children.some(child => location.pathname === child.href);

            return (
              <div key={item.name}>
                <button
                  type="button"
                  onClick={() => toggleSection(item.key)}
                  className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                    hasActiveChild
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={20} />
                    <span>{item.name}</span>
                  </div>
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>

                {isExpanded && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.children
                      .filter(child => child.roles.length === 0 || hasRole(...child.roles))
                      .map((child) => {
                        const ChildIcon = child.icon;
                        const isActive = location.pathname === child.href;
                        return (
                          <Link
                            key={child.name}
                            to={child.href}
                            onClick={() => onNavigate?.()}
                            className={`flex items-center gap-3 rounded-lg px-4 py-2 text-sm transition-colors ${
                              isActive
                                ? 'bg-primary text-white'
                                : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                            }`}
                          >
                            <ChildIcon size={18} />
                            <span>{child.name}</span>
                          </Link>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          }

          // Regular item (no children)
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => onNavigate?.()}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-white'
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
        <div className="relative flex items-center justify-between text-sm text-gray-200">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-semibold text-white">
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
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-700 hover:text-white"
          >
            <MoreVertical size={18} />
          </button>

          {/* User Menu Dropdown */}
          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setUserMenuOpen(false)}
              />
              <div className="absolute bottom-full right-0 z-20 mb-2 w-48 rounded-lg bg-gray-700 py-1 shadow-lg">
                <Link
                  to="/profile"
                  onClick={() => {
                    setUserMenuOpen(false);
                    onNavigate?.();
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-200 transition hover:bg-gray-600 hover:text-white"
                >
                  <User size={16} />
                  Profil
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-200 transition hover:bg-gray-600 hover:text-white"
                >
                  <LogOut size={16} />
                  Deconecteaza-te
                </button>
              </div>
            </>
          )}
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
          <aside className="relative flex h-full w-64 flex-col bg-secondary shadow-2xl">
            {renderSidebarContent(() => setSidebarOpen(false))}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:h-screen lg:w-64 lg:flex-col lg:bg-secondary lg:shadow-xl lg:sticky lg:top-0">
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
            <LocationSwitcher />
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
                className="flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-orange-600 disabled:cursor-not-allowed disabled:text-gray-400"
              >
                {markingAllRead && (
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                )}
                Marcheaza toate ca citite
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {notificationsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
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
                            onClick={() => handleNotificationRead(notification._id)}
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
      )}

      {/* Floating Chat Widget */}
      <FloatingChatWidget />

      {/* Location Switching Overlay */}
      <LocationSwitchingOverlay />
    </div>
  );
};

export default DashboardLayout;
