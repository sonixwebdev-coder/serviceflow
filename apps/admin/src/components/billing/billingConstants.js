export const BILLING_TABS = [
  { key: 'overview', label: 'Prezentare generala' },
  { key: 'subscriptions', label: 'Abonamente' },
  { key: 'expiring', label: 'Perioade de proba' },
  { key: 'failed', label: 'Plati esuate' },
];

export const STATUS_LABELS = {
  ACTIVE: 'Activ',
  TRIAL: 'Perioada de proba',
  SUSPENDED: 'Suspendat',
  CANCELLED: 'Anulat',
  PAYMENT_REQUIRED: 'Plata necesara',
};

export const STATUS_STYLES = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  TRIAL: 'bg-blue-50 text-blue-700 border-blue-200',
  SUSPENDED: 'bg-red-50 text-red-700 border-red-200',
  CANCELLED: 'bg-gray-100 text-gray-600 border-gray-200',
  PAYMENT_REQUIRED: 'bg-orange-50 text-orange-700 border-orange-200',
};
