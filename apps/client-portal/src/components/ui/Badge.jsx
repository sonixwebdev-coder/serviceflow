import { cn } from '@/lib/utils';

const variants = {
  default: 'bg-gray-100 text-gray-800',
  primary: 'bg-primary-100 text-primary-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-800',
};

export default function Badge({ children, variant = 'default', className, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const statusConfig = {
    SCHEDULED: { label: 'Programat', variant: 'primary' },
    IN_PROGRESS: { label: 'In progres', variant: 'warning' },
    COMPLETED: { label: 'Finalizat', variant: 'success' },
    CANCELLED: { label: 'Anulat', variant: 'danger' },
    GENERATED: { label: 'Generat', variant: 'default' },
    SENT: { label: 'Trimis', variant: 'primary' },
    PAID: { label: 'Platit', variant: 'success' },
    OVERDUE: { label: 'Restant', variant: 'danger' },
    DRAFT: { label: 'Draft', variant: 'default' },
  };

  const config = statusConfig[status] || { label: status, variant: 'default' };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
