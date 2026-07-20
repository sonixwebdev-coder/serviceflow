import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import ButtonBlock from './ButtonBlock';
import PricingTableBlock from './PricingTableBlock';
import ContactFormBlock from './ContactFormBlock';

const renderWithProviders = (component) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{component}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('public website blocks', () => {
  it('keeps relative button links inside the organization site', () => {
    renderWithProviders(
      <ButtonBlock subdomain="sample-company" data={{ text: 'Contact', link: '/contact' }} />
    );

    expect(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute(
      'href',
      '/sample-company/contact'
    );
  });

  it('keeps pricing calls to action inside the organization site', () => {
    renderWithProviders(
      <PricingTableBlock
        subdomain="sample-company"
        data={{
          plans: [{ name: 'Consulting', price: '100', ctaText: 'Ask us', ctaLink: '/contact' }],
        }}
      />
    );

    expect(screen.getByRole('link', { name: 'Ask us' })).toHaveAttribute(
      'href',
      '/sample-company/contact'
    );
  });

  it('prefers organization contact settings over template placeholders', () => {
    renderWithProviders(
      <ContactFormBlock
        subdomain="sample-company"
        data={{ contactInfo: { email: 'template@example.com' } }}
        organization={{ profile: { email: 'organization@example.com' } }}
      />
    );

    expect(screen.getByRole('link', { name: 'organization@example.com' })).toHaveAttribute(
      'href',
      'mailto:organization@example.com'
    );
    expect(screen.queryByText('template@example.com')).not.toBeInTheDocument();
  });
});
