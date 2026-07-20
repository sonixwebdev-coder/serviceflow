import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import NotFound from './NotFound';

describe('admin NotFound', () => {
  it('offers a route back to the dashboard', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /pagina nu a fost gasita/i })).toBeVisible();
    expect(screen.getByRole('link', { name: /inapoi la dashboard/i })).toHaveAttribute('href', '/');
  });
});
