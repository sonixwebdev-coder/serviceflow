import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpCircle,
  CalendarPlus,
  CreditCard,
  MoreHorizontal,
  RefreshCw,
  ShieldOff,
  Undo2,
  XCircle,
} from 'lucide-react';
import {
  useCancelSubscription,
  useExtendTrial,
  useOverridePlan,
  useProcessRefund,
  useReactivateOrg,
} from '@/hooks/useBilling';
import { useRevokeOverride } from '@/hooks/useOrganizations';
import { BillingStatus } from './BillingOverview';

export function OrganizationBillingTable({ data, isLoading, page, onPageChange, showTrialInfo }) {
  const [actionOrgId, setActionOrgId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const tableRef = useRef(null);

  useEffect(() => {
    if (!actionOrgId) return undefined;
    const closeOnOutsideClick = (event) => {
      if (tableRef.current && !tableRef.current.contains(event.target)) setActionOrgId(null);
    };
    const closeMenu = () => setActionOrgId(null);
    document.addEventListener('mousedown', closeOnOutsideClick);
    window.addEventListener('resize', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      window.removeEventListener('resize', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
    };
  }, [actionOrgId]);

  const toggleMenu = (organizationId, button) => {
    const rect = button.getBoundingClientRect();
    const openAbove = window.innerHeight - rect.bottom < 320 && rect.top > 320;
    setMenuPosition({
      top: openAbove ? rect.top - 8 : rect.bottom + 8,
      left: Math.min(rect.right, window.innerWidth - 8),
      openAbove,
    });
    setActionOrgId((current) => (current === organizationId ? null : organizationId));
  };

  if (isLoading) return <LoadingState />;
  if (!data?.subscriptions?.length) return <EmptyState />;

  return (
    <div ref={tableRef} className="rounded-2xl border border-gray-200/60 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <OrganizationTableHead showTrialInfo={showTrialInfo} />
          <tbody className="divide-y divide-gray-50">
            {data.subscriptions.map((organization) => (
              <OrganizationRow
                key={organization.id}
                organization={organization}
                showTrialInfo={showTrialInfo}
                menuOpen={actionOrgId === organization.id}
                menuPosition={menuPosition}
                onToggleMenu={toggleMenu}
                onCloseMenu={() => setActionOrgId(null)}
              />
            ))}
          </tbody>
        </table>
      </div>
      <Pagination pagination={data.pagination} page={page} onPageChange={onPageChange} />
    </div>
  );
}

function OrganizationTableHead({ showTrialInfo }) {
  const columns = ['Organizatie', 'Plan', 'Status', 'Interval'];
  if (showTrialInfo) columns.push('Expira in');
  columns.push('Stripe', 'Suma', 'Data start', 'Actiuni');

  return (
    <thead>
      <tr className="border-b border-gray-100 bg-gray-50/50 text-left">
        {columns.map((column) => (
          <th
            key={column}
            className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500"
          >
            {column}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function OrganizationRow({
  organization,
  showTrialInfo,
  menuOpen,
  menuPosition,
  onToggleMenu,
  onCloseMenu,
}) {
  return (
    <tr className="transition-colors hover:bg-gray-50/50">
      <td className="px-5 py-3.5">
        <div className="font-medium text-gray-900">{organization.name}</div>
        <div className="font-mono text-[11px] text-gray-400">/{organization.slug}</div>
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-1.5">
          <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
            {organization.plan}
          </span>
          {organization.planOverride && (
            <span className="rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
              OVR
            </span>
          )}
        </div>
      </td>
      <td className="px-5 py-3.5">
        <BillingStatus status={organization.status} />
      </td>
      <td className="px-5 py-3.5 text-xs text-gray-500">{formatBillingInterval(organization)}</td>
      {showTrialInfo && <TrialCell trialEndsAt={organization.trialEndsAt} />}
      <td className="px-5 py-3.5 text-xs text-gray-500">
        {organization.stripe?.status || (organization.subscriptionId ? 'N/A' : '-')}
      </td>
      <td className="px-5 py-3.5 text-sm font-medium tabular-nums text-gray-900">
        {organization.stripe?.amount != null
          ? `${organization.stripe.amount.toLocaleString('ro-RO')} RON`
          : '-'}
      </td>
      <td className="px-5 py-3.5 text-xs text-gray-500">{formatStartDate(organization)}</td>
      <td className="px-5 py-3.5">
        <button
          type="button"
          aria-label={`Actiuni facturare pentru ${organization.name}`}
          aria-expanded={menuOpen}
          onClick={(event) => {
            event.stopPropagation();
            onToggleMenu(organization.id, event.currentTarget);
          }}
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        {menuOpen && (
          <BillingActionMenu
            organization={organization}
            position={menuPosition}
            onClose={onCloseMenu}
          />
        )}
      </td>
    </tr>
  );
}

function TrialCell({ trialEndsAt }) {
  if (!trialEndsAt) return <td className="px-5 py-3.5">-</td>;
  const days = Math.max(0, Math.ceil((new Date(trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24)));
  return (
    <td className="px-5 py-3.5">
      <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
        {days} zile
      </span>
    </td>
  );
}

function BillingActionMenu({ organization, position, onClose }) {
  const [trialDays, setTrialDays] = useState('');
  const [showTrialInput, setShowTrialInput] = useState(false);
  const actions = useBillingActions();

  const runAction = async (action) => {
    try {
      const completed = await actions[action](organization, Number(trialDays) || 14);
      if (completed !== false) onClose();
    } catch (error) {
      window.alert(
        error?.response?.data?.message || error?.message || 'Eroare la procesarea actiunii'
      );
    }
  };

  return (
    <div
      className="animate-fade-in fixed z-[9999] w-60 rounded-xl border border-gray-200 bg-white py-1.5 shadow-xl"
      style={{
        top: position.top,
        left: position.left,
        transform: `translate(-100%, ${position.openAbove ? '-100%' : '0'})`,
      }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      {(organization.status === 'TRIAL' || organization.status === 'PAYMENT_REQUIRED') &&
        (showTrialInput ? (
          <TrialExtensionForm
            value={trialDays}
            onChange={setTrialDays}
            onSubmit={() => runAction('extendTrial')}
          />
        ) : (
          <ActionItem
            icon={CalendarPlus}
            label="Extinde perioada de proba"
            onClick={() => setShowTrialInput(true)}
          />
        ))}
      {organization.status === 'PAYMENT_REQUIRED' && (
        <ActionItem
          icon={RefreshCw}
          label="Reactiveaza (14 zile proba)"
          onClick={() => runAction('reactivate')}
        />
      )}
      {organization.planOverride ? (
        <ActionItem
          icon={ShieldOff}
          label="Revocare override plan"
          onClick={() => runAction('revokeOverride')}
          className="text-orange-600"
        />
      ) : (
        <>
          <ActionItem
            icon={ArrowUpCircle}
            label="Override → Professional"
            onClick={() => runAction('overrideProfessional')}
          />
          <ActionItem
            icon={ArrowUpCircle}
            label="Override → Enterprise"
            onClick={() => runAction('overrideEnterprise')}
          />
        </>
      )}
      {organization.subscriptionId && organization.billingInterval === 'year' && (
        <ActionItem
          icon={Undo2}
          label="Rambursare (plan anual)"
          onClick={() => runAction('refund')}
          className="text-orange-600"
        />
      )}
      {organization.subscriptionId && (
        <>
          <div className="my-1 border-t border-gray-100" />
          <ActionItem
            icon={XCircle}
            label="Anuleaza abonamentul"
            onClick={() => runAction('cancel')}
            className="text-red-600"
          />
        </>
      )}
    </div>
  );
}

function useBillingActions() {
  const extendTrial = useExtendTrial();
  const overridePlan = useOverridePlan();
  const refund = useProcessRefund();
  const cancel = useCancelSubscription();
  const reactivate = useReactivateOrg();
  const revokeOverride = useRevokeOverride();

  return {
    extendTrial: (organization, days) => extendTrial.mutateAsync({ orgId: organization.id, days }),
    reactivate: (organization, days) => reactivate.mutateAsync({ orgId: organization.id, days }),
    overrideProfessional: (organization) =>
      overridePlan.mutateAsync({
        orgId: organization.id,
        plan: 'PROFESSIONAL',
        reason: 'Admin override',
      }),
    overrideEnterprise: (organization) =>
      overridePlan.mutateAsync({
        orgId: organization.id,
        plan: 'ENTERPRISE',
        reason: 'Admin override',
      }),
    revokeOverride: (organization) =>
      confirmAction('Sigur doresti sa revoci override-ul?', () =>
        revokeOverride.mutateAsync({ id: organization.id })
      ),
    refund: (organization) =>
      confirmAction('Sigur doresti sa procesezi rambursarea?', () =>
        refund.mutateAsync({ orgId: organization.id })
      ),
    cancel: (organization) =>
      confirmAction('Sigur doresti sa anulezi abonamentul?', () =>
        cancel.mutateAsync({ orgId: organization.id })
      ),
  };
}

function confirmAction(message, action) {
  return window.confirm(message) ? action() : false;
}

function TrialExtensionForm({ value, onChange, onSubmit }) {
  return (
    <div className="space-y-2 px-3 py-2.5">
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        Numar de zile
      </label>
      <div className="flex gap-2">
        <input
          type="number"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="14"
          min="1"
          max="365"
          className="w-20 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          autoFocus
        />
        <button
          type="button"
          onClick={onSubmit}
          className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-primary-700"
        >
          Extinde
        </button>
      </div>
    </div>
  );
}

function ActionItem({ icon: Icon, label, onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-gray-700 transition-colors hover:bg-gray-50 ${className}`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </button>
  );
}

function Pagination({ pagination, page, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  return (
    <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p className="text-xs text-gray-500">{pagination.total} rezultate</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
        >
          Inapoi
        </button>
        <span className="min-w-[60px] text-center text-xs tabular-nums text-gray-500">
          {page} / {pagination.totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(pagination.totalPages, page + 1))}
          disabled={page >= pagination.totalPages}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
        >
          Inainte
        </button>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-gray-200/60 bg-white p-16 text-center">
      <CreditCard className="mx-auto mb-3 h-8 w-8 text-gray-300" />
      <p className="text-sm font-medium text-gray-500">Niciun rezultat gasit</p>
    </div>
  );
}

function formatBillingInterval(organization) {
  if (organization.billingInterval === 'year') return 'Anual';
  if (organization.billingInterval === 'month') return 'Lunar';
  return organization.stripe?.interval || '-';
}

function formatStartDate(organization) {
  const date = organization.subscriptionStartedAt || organization.createdAt;
  return date ? new Date(date).toLocaleDateString('ro-RO') : '-';
}
