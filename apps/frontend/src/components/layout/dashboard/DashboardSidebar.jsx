import { ChevronDown, ChevronRight, LogOut, MoreVertical, User, X } from 'lucide-react';
import { Link } from 'react-router-dom';

import { runtimeConfig } from '@/config/runtime';

export default function DashboardSidebar({
  expandedSections,
  hasRole,
  navigation,
  onClose,
  onLogout,
  onNavigate,
  onToggleSection,
  onToggleUserMenu,
  onUserMenuClose,
  pathname,
  user,
  userMenuOpen,
}) {
  return (
    <div className="flex h-full flex-col text-white">
      <div className="flex h-16 items-center justify-between px-6">
        <span className="text-2xl font-bold text-primary">{runtimeConfig.platformName}</span>
        <button
          type="button"
          className="lg:hidden text-gray-400 hover:text-white"
          onClick={onClose}
          aria-label="Inchide meniul"
        >
          <X size={22} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-4 overflow-y-auto" aria-label="Navigare principala">
        {navigation.map((item) => {
          const Icon = item.icon;

          if (item.children) {
            const isExpanded = expandedSections[item.key];
            const hasActiveChild = item.children.some((child) => pathname === child.href);

            return (
              <div key={item.name}>
                <button
                  type="button"
                  onClick={() => onToggleSection(item.key)}
                  className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                    hasActiveChild
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                  aria-expanded={isExpanded}
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
                      .filter((child) => child.roles.length === 0 || hasRole(...child.roles))
                      .map((child) => {
                        const ChildIcon = child.icon;
                        const isActive = pathname === child.href;
                        return (
                          <Link
                            key={child.name}
                            to={child.href}
                            onClick={onNavigate}
                            aria-current={isActive ? 'page' : undefined}
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

          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onNavigate}
              aria-current={isActive ? 'page' : undefined}
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
            onClick={onToggleUserMenu}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-700 hover:text-white"
            aria-label={
              userMenuOpen ? 'Inchide meniul utilizatorului' : 'Deschide meniul utilizatorului'
            }
            aria-expanded={userMenuOpen}
          >
            <MoreVertical size={18} />
          </button>

          {userMenuOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-10"
                onClick={onUserMenuClose}
                aria-label="Inchide meniul utilizatorului"
              />
              <div className="absolute bottom-full right-0 z-20 mb-2 w-48 rounded-lg bg-gray-700 py-1 shadow-lg">
                <Link
                  to="/profile"
                  onClick={() => {
                    onUserMenuClose();
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
                    onUserMenuClose();
                    onLogout();
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
}
