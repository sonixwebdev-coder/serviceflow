import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import NotFound from './NotFound';

describe('public website NotFound', () => {
  it('identifies the unavailable tenant website', () => {
    render(
      <MemoryRouter initialEntries={['/missing-business']}>
        <Routes>
          <Route path="/:subdomain" element={<NotFound />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /pagina nu a fost gasita/i })).toBeVisible();
    expect(screen.getByText(/missing-business/)).toBeVisible();
  });
});
