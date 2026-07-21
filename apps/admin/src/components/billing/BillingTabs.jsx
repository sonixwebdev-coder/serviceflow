import { useState } from 'react';
import { useSubscriptions } from '@/hooks/useBilling';
import { OrganizationBillingTable } from './OrganizationBillingTable';
import { isTrialExpiringWithinSevenDays } from './billingUtils';

const SUBSCRIPTION_FILTERS = [
  {
    key: 'status',
    options: [
      ['', 'Toate statusurile'],
      ['ACTIVE', 'Activ'],
      ['TRIAL', 'Perioada de proba'],
      ['PAYMENT_REQUIRED', 'Plata necesara'],
      ['SUSPENDED', 'Suspendat'],
      ['CANCELLED', 'Anulat'],
    ],
  },
  {
    key: 'plan',
    options: [
      ['', 'Toate planurile'],
      ['FREE', 'Free'],
      ['STARTER', 'Starter'],
      ['PROFESSIONAL', 'Professional'],
      ['ENTERPRISE', 'Enterprise'],
    ],
  },
  {
    key: 'interval',
    options: [
      ['', 'Toate intervalele'],
      ['month', 'Lunar'],
      ['year', 'Anual'],
    ],
  },
];

export function SubscriptionsTab({ organizationId }) {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', plan: '', interval: '' });
  const params = { page, limit: 20, ...(organizationId && { organizationId }) };

  for (const [key, value] of Object.entries(filters)) {
    if (value) params[key] = value;
  }

  const { data, isLoading } = useSubscriptions(params);
  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {SUBSCRIPTION_FILTERS.map(({ key, options }) => (
          <select
            key={key}
            value={filters[key]}
            onChange={(event) => updateFilter(key, event.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-700 transition-colors focus:border-primary-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500/20 sm:w-auto"
          >
            {options.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        ))}
      </div>
      <OrganizationBillingTable
        data={data}
        isLoading={isLoading}
        page={page}
        onPageChange={setPage}
      />
    </div>
  );
}

export function ExpiringTrialsTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSubscriptions({ page, limit: 20, status: 'TRIAL' });
  const subscriptions = data?.subscriptions?.filter(isTrialExpiringWithinSevenDays) || [];
  const filteredData = data ? { ...data, subscriptions } : null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Organizatii cu perioada de proba ce expira in urmatoarele 7 zile
      </p>
      <OrganizationBillingTable
        data={filteredData}
        isLoading={isLoading}
        page={page}
        onPageChange={setPage}
        showTrialInfo
      />
    </div>
  );
}

export function FailedPaymentsTab() {
  const [page, setPage] = useState(1);
  const { data: paymentRequired, isLoading: paymentRequiredLoading } = useSubscriptions({
    page,
    limit: 20,
    status: 'PAYMENT_REQUIRED',
  });
  const { data: suspended, isLoading: suspendedLoading } = useSubscriptions({
    page: 1,
    limit: 20,
    status: 'SUSPENDED',
  });
  const data = {
    subscriptions: [...(paymentRequired?.subscriptions || []), ...(suspended?.subscriptions || [])],
    pagination: paymentRequired?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 },
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Organizatii cu plati esuate sau suspendate</p>
      <OrganizationBillingTable
        data={data}
        isLoading={paymentRequiredLoading || suspendedLoading}
        page={page}
        onPageChange={setPage}
      />
    </div>
  );
}
