import { describe, expect, it, vi } from 'vitest';

import {
  buildDashboardNavigation,
  expandedSectionsForPath,
  filterNavigationByRole,
} from './dashboardNavigation';

const getSection = (navigation, key) => navigation.find((item) => item.key === key);

describe('dashboard navigation', () => {
  it('keeps assets in the established CRM position only for applicable sectors', () => {
    const withAssets = getSection(buildDashboardNavigation(true), 'crm').children;
    const withoutAssets = getSection(buildDashboardNavigation(false), 'crm').children;

    expect(withAssets.map((item) => item.href)).toEqual([
      '/crm/appointments',
      '/crm/clients',
      '/crm/online-clients',
      '/crm/assets',
      '/crm/invoices',
      '/crm/loyalty',
    ]);
    expect(withoutAssets.some((item) => item.href === '/crm/assets')).toBe(false);
  });

  it('keeps unrestricted navigation while filtering privileged top-level items', () => {
    const hasRole = vi.fn(() => false);
    const filtered = filterNavigationByRole(buildDashboardNavigation(true), hasRole);

    expect(filtered.map((item) => item.name)).toEqual([
      'Tablou de bord',
      'CRM',
      'Echipa & Pontaj',
      'Chat',
      'Suport',
    ]);
  });

  it('expands only the section containing the active child route', () => {
    const navigation = buildDashboardNavigation(true);

    expect(expandedSectionsForPath(navigation, '/settings/services')).toEqual({
      crm: false,
      echipa: false,
      setari: true,
    });
    expect(expandedSectionsForPath(navigation, '/dashboard')).toBeNull();
  });
});
