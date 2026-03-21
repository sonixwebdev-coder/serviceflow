import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Building2, CreditCard, ScrollText, LogOut, Settings as SettingsIcon, LifeBuoy, Wrench, Menu, X, Mail } from 'lucide-react';
import useAuthStore from '@/state/useAuthStore';
import { useLogout } from '@/hooks/useAuth';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/organizations', icon: Building2, label: 'Organizatii' },
  { to: '/billing', icon: CreditCard, label: 'Billing' },
  { to: '/logs', icon: ScrollText, label: 'Loguri' },
  { to: '/settings', icon: SettingsIcon, label: 'Setari' },
  { to: '/tickets', icon: LifeBuoy, label: 'Tichete' },
  { to: '/contact-messages', icon: Mail, label: 'Mesaje Contact' },
  { to: '/maintenance', icon: Wrench, label: 'Mentenanta' },
];

export default function AdminLayout() {
  const user = useAuthStore((s) => s.user);
  const { mutate: logout } = useLogout();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sidebarContent = (
    <>
      <div className="flex h-16 items-center gap-2 px-6 border-b border-gray-800">
        <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center text-sm font-bold">
          F
        </div>
        <span className="text-lg font-semibold">ForjaIt Admin</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => setSidebarOpen(false)}
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
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-gray-900 text-white transition-transform duration-200 lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute right-3 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-gray-900 text-white">
        {sidebarContent}
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        {/* Mobile header */}
        <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-gray-900">ForjaIt Admin</span>
        </div>
        <div className="p-4 sm:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
