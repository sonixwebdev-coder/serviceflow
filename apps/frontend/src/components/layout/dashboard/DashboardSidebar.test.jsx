import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import DashboardSidebar from './DashboardSidebar';
import { buildDashboardNavigation, filterNavigationByRole } from './dashboardNavigation';

const createProps = () => {
  const hasRole = vi.fn(() => false);
  return {
    expandedSections: { crm: true, echipa: false, setari: false },
    hasRole,
    navigation: filterNavigationByRole(buildDashboardNavigation(true), hasRole),
    onClose: vi.fn(),
    onLogout: vi.fn(),
    onNavigate: vi.fn(),
    onToggleSection: vi.fn(),
    onToggleUserMenu: vi.fn(),
    onUserMenuClose: vi.fn(),
    pathname: '/crm/clients',
    user: { firstName: 'Ana', lastName: 'Pop', role: 'USER' },
    userMenuOpen: false,
  };
};

describe('DashboardSidebar', () => {
  it('marks the active child and preserves accordion interaction', () => {
    const props = createProps();
    render(
      <MemoryRouter>
        <DashboardSidebar {...props} />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /^Clienti$/ })).toHaveAttribute('aria-current', 'page');
    const crmButton = screen.getByRole('button', { name: 'CRM' });
    expect(crmButton).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(crmButton);
    expect(props.onToggleSection).toHaveBeenCalledWith('crm');
  });

  it('keeps privileged links out of a restricted user menu', () => {
    const props = createProps();
    props.expandedSections = { crm: false, echipa: true, setari: false };
    render(
      <MemoryRouter>
        <DashboardSidebar {...props} />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Task-uri' })).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Angajati' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Setari' })).not.toBeInTheDocument();
  });
});
