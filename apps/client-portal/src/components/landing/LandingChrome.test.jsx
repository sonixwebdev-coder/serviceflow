import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { runtimeConfig } from '@/config/runtime';
import { FRONTEND_URL } from '@/config/urls';
import LandingFooter from './LandingFooter';
import LandingHeader from './LandingHeader';

const CurrentPath = () => <output aria-label="Ruta curenta">{useLocation().pathname}</output>;

describe('landing chrome', () => {
  it('preserves header navigation interaction', () => {
    const { container } = render(
      <MemoryRouter>
        <LandingHeader />
        <CurrentPath />
      </MemoryRouter>
    );
    const header = within(container.querySelector('header'));

    expect(header.getByText(runtimeConfig.platformName)).toBeVisible();
    fireEvent.click(header.getByRole('link', { name: 'Autentificare' }));

    expect(screen.getByRole('status', { name: 'Ruta curenta' })).toHaveTextContent('/login');
  });

  it('preserves platform, business, legal, and operator footer links', () => {
    const { container } = render(
      <MemoryRouter>
        <LandingFooter />
      </MemoryRouter>
    );
    const footer = within(container.querySelector('footer'));

    expect(footer.getByText(runtimeConfig.platformName)).toBeVisible();
    expect(footer.getByRole('link', { name: 'Platforma business' })).toHaveAttribute(
      'href',
      FRONTEND_URL
    );
    expect(footer.getByRole('link', { name: 'Preturi' })).toHaveAttribute(
      'href',
      `${FRONTEND_URL}/pricing`
    );
    expect(footer.getByRole('link', { name: 'Politica de Confidentialitate' })).toHaveAttribute(
      'href',
      '/privacy'
    );
    expect(footer.getByRole('link', { name: 'ANPC' })).toHaveAttribute('href', 'https://anpc.ro/');
    expect(footer.getByText('Suport Luni – Vineri, 09:00 – 18:00')).toBeVisible();
  });
});
