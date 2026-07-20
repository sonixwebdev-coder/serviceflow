import { Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

export const STATUS_FILTERS = [
  { label: 'Toate', value: undefined },
  { label: 'In asteptare', value: 'pending' },
  { label: 'Prezentat', value: 'prezentat' },
  { label: 'In desfasurare', value: 'in_progress' },
  { label: 'Finalizate', value: 'completed' },
  { label: 'Anulate', value: 'cancelled' },
];

export const STATUS_META = {
  PENDING: {
    label: 'In asteptare',
    badgeClass: 'border border-yellow-400 bg-yellow-50 text-yellow-800',
    calendarClass: 'status-pending',
  },
  PREZENTAT: {
    label: 'Prezentat',
    badgeClass: 'border border-blue-400 bg-blue-50 text-blue-900',
    calendarClass: 'status-prezentat',
  },
  IN_PROGRESS: {
    label: 'In desfasurare',
    badgeClass: 'border border-amber-400 bg-amber-50 text-amber-900',
    calendarClass: 'status-in-progress',
  },
  COMPLETED: {
    label: 'Finalizata',
    badgeClass: 'border border-emerald-400 bg-emerald-50 text-emerald-900',
    calendarClass: 'status-completed',
  },
  CANCELLED: {
    label: 'Anulata',
    badgeClass: 'border border-red-400 bg-red-50 text-red-800',
    calendarClass: 'status-cancelled',
  },
};

export const STATUS_LABELS = {
  pending: STATUS_META.PENDING.label,
  prezentat: STATUS_META.PREZENTAT.label,
  'in-progress': STATUS_META.IN_PROGRESS.label,
  in_progress: STATUS_META.IN_PROGRESS.label,
  completed: STATUS_META.COMPLETED.label,
  cancelled: STATUS_META.CANCELLED.label,
};

export const STATUS_SEQUENCE = ['PENDING', 'PREZENTAT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export const PAYMENT_STATUS_META = {
  UNPAID: {
    label: 'Neplatit',
    badgeClass: 'bg-gray-100 text-gray-800 border border-gray-300',
    icon: Clock,
  },
  PARTIAL: {
    label: 'Partial platit',
    badgeClass: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
    icon: AlertCircle,
  },
  PAID: {
    label: 'Platit complet',
    badgeClass: 'bg-green-100 text-green-800 border border-green-300',
    icon: CheckCircle2,
  },
};

export const STATUS_DOT_COLORS = {
  PENDING: 'rgb(250, 204, 21)',
  PREZENTAT: 'rgb(96, 165, 250)',
  IN_PROGRESS: 'rgb(251, 191, 36)',
  COMPLETED: 'rgb(52, 211, 153)',
  CANCELLED: 'rgb(248, 113, 113)',
};

export const HARDWARE_UNITS = [
  { value: 'buc', label: 'buc (bucati)' },
  { value: 'set', label: 'set' },
  { value: 'pereche', label: 'pereche' },
  { value: 'm', label: 'm (metri)' },
  { value: 'm²', label: 'm² (metri patrati)' },
  { value: 'l', label: 'l (litri)' },
  { value: 'kg', label: 'kg (kilograme)' },
  { value: 'pachet', label: 'pachet' },
];

export const LABOR_UNITS = [
  { value: 'ore', label: 'ore' },
  { value: 'ore/om', label: 'ore/om (om-ore)' },
  { value: 'zile', label: 'zile' },
  { value: 'interventie', label: 'interventie' },
];

export const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, index) => {
  const totalMinutes = index * 15;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
});

export const defaultForm = {
  title: '',
  description: '',
  scheduledDate: null,
  startTime: '09:00',
  endTime: '10:00',
  assigneeIds: [],
  clientId: '',
  assetId: '',
  advancePayment: '',
};

export const defaultClientForm = {
  type: 'PF',
  firstName: '',
  lastName: '',
  companyName: '',
  contactName: '',
  phone: '',
  email: '',
  vatNumber: '',
  registrationNumber: '',
  notes: '',
  fidelityCardSerie: '',
};

export const defaultAssetForm = {
  metadata: {},
  notes: '',
};

export const createDefaultOrderDraft = () => ({
  notes: '',
  lineItems: [
    {
      name: '',
      description: '',
      hardwareQuantity: 1,
      laborQuantity: 1,
      hardwarePrice: 0,
      laborPrice: 0,
      hardwareUnit: '',
      laborUnit: '',
    },
  ],
});

export const getStatusMeta = (value) => {
  if (!value) {
    return {
      label: 'Necunoscut',
      badgeClass: 'border border-gray-200 bg-gray-100 text-gray-600',
      calendarClass: 'status-unknown',
    };
  }
  const normalized = value.toString().toUpperCase().replace(/-/g, '_');
  return (
    STATUS_META[normalized] || {
      label: value,
      badgeClass: 'border border-gray-200 bg-gray-100 text-gray-600',
      calendarClass: 'status-unknown',
    }
  );
};

export const getPaymentStatusMeta = (status) => {
  return PAYMENT_STATUS_META[status] || PAYMENT_STATUS_META.UNPAID;
};

export const normalizeRoleKey = (value) =>
  typeof value === 'string' ? value.toLowerCase().replace(/\s+/g, '-') : '';

export const extractRoleKeys = (person) => {
  const keys = new Set();
  if (!person) return keys;
  const primary = normalizeRoleKey(person.role);
  if (primary) {
    keys.add(primary);
  }
  person.roles?.forEach((assignment) => {
    const key = normalizeRoleKey(assignment?.role?.key || assignment?.key || assignment?.role);
    if (key) {
      keys.add(key);
    }
  });
  return keys;
};

export const combineDateAndTime = (date, time) => {
  if (!date || !time) return null;
  const [hours, minutes] = time.split(':').map((value) => Number(value));
  const result = new Date(date);
  result.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return result;
};

export const currencyFormatter = new Intl.NumberFormat('ro-RO', {
  style: 'currency',
  currency: 'RON',
});
export const numberFormatter = new Intl.NumberFormat('ro-RO');
