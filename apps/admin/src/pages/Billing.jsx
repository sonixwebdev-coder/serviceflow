import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BillingOverview } from '@/components/billing/BillingOverview';
import {
  ExpiringTrialsTab,
  FailedPaymentsTab,
  SubscriptionsTab,
} from '@/components/billing/BillingTabs';
import { BILLING_TABS } from '@/components/billing/billingConstants';

export default function Billing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const organizationId = searchParams.get('organizationId') || '';
  const [tab, setTab] = useState(organizationId ? 'subscriptions' : 'overview');

  const clearOrganization = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('organizationId');
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-5">
      <nav aria-label="Sectiuni facturare" className="overflow-x-auto">
        <div className="flex min-w-max gap-1 rounded-xl bg-gray-100/80 p-1">
          {BILLING_TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              aria-current={tab === key ? 'page' : undefined}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                tab === key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      {organizationId && (
        <div className="flex flex-col gap-3 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-800 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Afisezi administrarea facturarii pentru o singura organizatie. Toate actiunile
            financiare sunt centralizate aici.
          </span>
          <button
            type="button"
            onClick={clearOrganization}
            className="shrink-0 rounded-lg border border-primary-200 bg-white px-3 py-1.5 font-medium hover:bg-primary-100"
          >
            Afiseaza toate
          </button>
        </div>
      )}

      {tab === 'overview' && <BillingOverview />}
      {tab === 'subscriptions' && <SubscriptionsTab organizationId={organizationId || undefined} />}
      {tab === 'expiring' && <ExpiringTrialsTab />}
      {tab === 'failed' && <FailedPaymentsTab />}
    </div>
  );
}
