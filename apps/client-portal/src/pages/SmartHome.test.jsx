import { render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SmartHome from './SmartHome';

const { authState } = vi.hoisted(() => ({
  authState: { isAuthenticated: false, loading: true },
}));

vi.mock('@/state/useAuthStore', () => ({
  useAuthStore: (selector) => selector(authState),
}));

vi.mock('./Landing', () => ({ default: () => <div>Portal landing</div> }));

describe('portal SmartHome', () => {
  beforeEach(() => {
    authState.isAuthenticated = false;
    authState.loading = true;
  });

  it('shows a loading state while authentication is restored', () => {
    render(
      <MemoryRouter>
        <SmartHome />
      </MemoryRouter>
    );

    expect(screen.getByText('Se incarca...')).toBeVisible();
  });

  it('loads the public landing branch after authentication is restored', async () => {
    authState.loading = false;

    render(
      <MemoryRouter>
        <Suspense fallback={<div>Se pregateste pagina...</div>}>
          <SmartHome />
        </Suspense>
      </MemoryRouter>
    );

    expect(await screen.findByText('Portal landing')).toBeVisible();
  });
});
