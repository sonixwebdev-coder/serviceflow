import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Building2, CreditCard, ScrollText, LogOut,
  Settings as SettingsIcon, LifeBuoy, Wrench, Menu, X, Mail,
  ChevronRight,
} from 'lucide-react';
import useAuthStore from '@/state/useAuthStore';
import { useLogout } from '@/hooks/useAuth';

const navGroups = [
  {
    label: 'General',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/organizations', icon: Building2, label: 'Organizatii' },
      { to: '/billing', icon: CreditCard, label: 'Facturare' },
    ],
  },
  {
    label: 'Suport',
    items: [
      { to: '/tickets', icon: LifeBuoy, label: 'Tichete' },
      { to: '/contact-messages', icon: Mail, label: 'Mesaje Contact' },
    ],
  },
  {
    label: 'Sistem',
    items: [
      { to: '/logs', icon: ScrollText, label: 'Loguri' },
      { to: '/settings', icon: SettingsIcon, label: 'Setari' },
      { to: '/maintenance', icon: Wrench, label: 'Mentenanta' },
    ],
  },
];

export default function AdminLayout() {
  const user = useAuthStore((s) => s.user);
  const { mutate: logout } = useLogout();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const pageTitle = navGroups
    .flatMap((g) => g.items)
    .find((item) => item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to))
    ?.label || 'Dashboard';

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-white/[0.06]">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-bold text-white shadow-lg shadow-primary-500/20">
          F
        </div>
        <div>
          <span className="text-[15px] font-semibold tracking-tight">ForjaIt</span>
          <span className="ml-1.5 rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">Admin</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-white/[0.08] text-white shadow-sm'
                        : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'
                    }`
                  }
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <span className="flex-1">{label}</span>
                  <ChevronRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 transition-all duration-150 group-hover:opacity-40 group-hover:translate-x-0" />
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/[0.06] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-gray-600 to-gray-700 text-xs font-semibold text-white">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-[13px] font-medium text-gray-200">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="truncate text-[11px] text-gray-500">{user?.email}</p>
          </div>
          <button
            onClick={() => logout()}
            className="rounded-lg p-2 text-gray-500 hover:bg-white/[0.06] hover:text-gray-300 transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-gray-950 text-white transition-transform duration-200 ease-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute right-3 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-white/[0.06] hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[260px] flex-col bg-gray-950 text-white">
        {sidebarContent}
      </aside>

      {/* Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-gray-200/80 bg-white/80 backdrop-blur-md px-4 sm:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h2 className="text-sm font-semibold text-gray-800">{pageTitle}</h2>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
