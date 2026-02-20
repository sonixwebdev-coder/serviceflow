import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Building2, CreditCard, ScrollText, LogOut, Settings as SettingsIcon, LifeBuoy } from 'lucide-react';
import useAuthStore from '@/state/useAuthStore';
import { useLogout } from '@/hooks/useAuth';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/organizations', icon: Building2, label: 'Organizatii' },
  { to: '/billing', icon: CreditCard, label: 'Billing' },
  { to: '/logs', icon: ScrollText, label: 'Loguri' },
  { to: '/settings', icon: SettingsIcon, label: 'Setari' },
  { to: '/tickets', icon: LifeBuoy, label: 'Tichete' },
];

export default function AdminLayout() {
  const user = useAuthStore((s) => s.user);
  const { mutate: logout } = useLogout();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col bg-gray-900 text-white">
        <div className="flex h-16 items-center gap-2 px-6 border-b border-gray-800">
          <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center text-sm font-bold">
            F
          </div>
          <span className="text-lg font-semibold">Forja Admin</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div className="truncate">
              <p className="text-sm font-medium truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={() => logout()}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
