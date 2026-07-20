import { useEffect, useMemo, useState } from 'react';
import { Bell, Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';

import FloatingChatWidget from '@/components/chat/FloatingChatWidget';
import LocationSwitcher from '@/components/LocationSwitcher';
import LocationSwitchingOverlay from '@/components/LocationSwitchingOverlay';
import DashboardSidebar from '@/components/layout/dashboard/DashboardSidebar';
import NotificationsDrawer from '@/components/layout/dashboard/NotificationsDrawer';
import {
  buildDashboardNavigation,
  expandedSectionsForPath,
  filterNavigationByRole,
} from '@/components/layout/dashboard/dashboardNavigation';
import useAuth from '@/context/useAuth';
import useToast from '@/context/useToast';
import { useTerminology } from '@/context/TerminologyContext';
import { useMyLocations } from '@/hooks/useLocations';
import useNotifications from '@/hooks/useNotifications';
import { markNotificationRead, markNotificationsRead } from '@/services/notificationService';

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
  const hasAssets = features?.useAssets !== false;
  const location = useLocation();

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
  const navigation = useMemo(() => buildDashboardNavigation(hasAssets), [hasAssets]);
  const filteredNavigation = filterNavigationByRole(navigation, hasRole);

  useEffect(() => {
    const nextExpandedSections = expandedSectionsForPath(navigation, location.pathname);
    if (nextExpandedSections) setExpandedSections(nextExpandedSections);
  }, [location.pathname, navigation]);

  useEffect(() => {
    if (notificationsOpen) refreshNotifications();
  }, [notificationsOpen, refreshNotifications]);

  const handleNotificationRead = async (notificationId) => {
    if (markingReadIds.has(notificationId)) return;

    setMarkingReadIds((previous) => new Set(previous).add(notificationId));
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
      setMarkingReadIds((previous) => {
        const next = new Set(previous);
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
    setExpandedSections((previous) => {
      if (!previous[key]) {
        return {
          crm: key === 'crm',
          echipa: key === 'echipa',
          setari: key === 'setari',
        };
      }
      return { ...previous, [key]: false };
    });
  };

  const sidebarProps = {
    expandedSections,
    hasRole,
    navigation: filteredNavigation,
    onClose: () => setSidebarOpen(false),
    onLogout: logout,
    onToggleSection: toggleSection,
    onToggleUserMenu: () => setUserMenuOpen((open) => !open),
    onUserMenuClose: () => setUserMenuOpen(false),
    pathname: location.pathname,
    user,
    userMenuOpen,
  };

  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            className="flex-1 bg-gray-900/40"
            onClick={() => setSidebarOpen(false)}
            aria-label="Inchide meniul"
          />
          <aside className="relative flex h-full w-64 flex-col bg-secondary shadow-2xl">
            <DashboardSidebar {...sidebarProps} onNavigate={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      <aside className="hidden lg:flex lg:h-screen lg:w-64 lg:flex-col lg:bg-secondary lg:shadow-xl lg:sticky lg:top-0">
        <DashboardSidebar {...sidebarProps} />
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
          <button
            type="button"
            className="text-gray-600 transition hover:text-gray-900 lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Deschide meniu"
          >
            <Menu size={24} />
          </button>

          <div className="flex flex-1 items-center justify-end gap-3">
            <LocationSwitcher />
            <button
              type="button"
              className="relative rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
              onClick={() => setNotificationsOpen(true)}
              aria-label={unreadCount > 0 ? `Notificari (${unreadCount} necitite)` : 'Notificari'}
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
        <NotificationsDrawer
          error={notificationsError}
          loading={notificationsLoading}
          markingAllRead={markingAllRead}
          markingReadIds={markingReadIds}
          notifications={notifications}
          onClose={() => setNotificationsOpen(false)}
          onMarkAllRead={handleMarkAllRead}
          onNotificationRead={handleNotificationRead}
          unreadCount={unreadCount}
        />
      )}

      <FloatingChatWidget />
      <LocationSwitchingOverlay />
    </div>
  );
};

export default DashboardLayout;
