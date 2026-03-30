import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Users, Calendar, FileText, Ban, CheckCircle, Shield, ShieldOff, CalendarPlus } from 'lucide-react';
import {
  useOrganization, useUpdateOrganization, useSuspendOrganization, useActivateOrganization,
  useGrantPlan, useRevokeOverride,
} from '@/hooks/useOrganizations';
import { useExtendTrial } from '@/hooks/useBilling';
import useToast from '@/context/useToast';

const PLAN_OPTIONS = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
const STATUS_OPTIONS = ['ACTIVE', 'TRIAL', 'SUSPENDED', 'CANCELLED'];
const OVERRIDE_PLAN_OPTIONS = ['PROFESSIONAL', 'ENTERPRISE'];

export default function OrganizationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: org, isLoading } = useOrganization(id);
  const updateMutation = useUpdateOrganization();
  const suspendMutation = useSuspendOrganization();
  const activateMutation = useActivateOrganization();
  const grantMutation = useGrantPlan();
  const revokeMutation = useRevokeOverride();
  const extendTrialMutation = useExtendTrial();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [showGrantForm, setShowGrantForm] = useState(false);
  const [grantForm, setGrantForm] = useState({ plan: 'PROFESSIONAL', reason: '' });
  const [showTrialForm, setShowTrialForm] = useState(false);
  const [trialDays, setTrialDays] = useState(14);

  const startEditing = () => {
    setForm({
      status: org.status,
      plan: org.plan,
      maxUsers: org.maxUsers,
      maxClients: org.maxClients,
      maxAppointments: org.maxAppointments,
    });
    setEditing(true);
  };

  const handleSave = () => {
    const payload = {
      id,
      status: form.status,
      plan: form.plan,
      maxUsers: Number(form.maxUsers) || 0,
      maxClients: Number(form.maxClients) || 0,
      maxAppointments: Number(form.maxAppointments) || 0,
    };
    updateMutation.mutate(payload, { onSuccess: () => setEditing(false) });
  };

  const handleGrant = () => {
    grantMutation.mutate(
      { id, plan: grantForm.plan, reason: grantForm.reason || undefined },
      {
        onSuccess: () => {
          setShowGrantForm(false);
          setGrantForm({ plan: 'PROFESSIONAL', reason: '' });
          showToast({ title: 'Plan acordat', description: `Plan ${grantForm.plan} acordat cu succes.`, type: 'success' });
        },
      }
    );
  };

  const handleRevoke = () => {
    if (!window.confirm('Sigur doresti sa revoci override-ul? Organizatia va reveni la planul FREE sau la abonamentul Stripe activ.')) return;
    revokeMutation.mutate(
      { id },
      {
        onSuccess: () => {
          showToast({ title: 'Override revocat', description: 'Planul a fost resetat.', type: 'success' });
        },
      }
    );
  };

  const handleExtendTrial = () => {
    const days = Number(trialDays);
    if (!days || days < 1) return;
    extendTrialMutation.mutate(
      { orgId: id, days },
      {
        onSuccess: () => {
          setShowTrialForm(false);
          setTrialDays(14);
          showToast({ title: 'Perioada extinsa', description: `Perioada de proba extinsa cu ${days} zile.`, type: 'success' });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Building2 className="mb-3 h-10 w-10 text-gray-300" />
        <p className="text-sm font-medium text-gray-500">Organizatia nu a fost gasita</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate('/organizations')} className="mt-1 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{org.name}</h1>
            <StatusBadge status={org.status} />
            <PlanBadge plan={org.plan} />
            {org.planOverride && (
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                <Shield className="h-3 w-3" /> Override
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-gray-500 font-mono">/{org.slug}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(org.status === 'TRIAL' || org.status === 'PAYMENT_REQUIRED') && (
            <ActionBtn onClick={() => setShowTrialForm(!showTrialForm)} variant="blue" icon={CalendarPlus}>
              Extinde Proba
            </ActionBtn>
          )}
          {!org.planOverride && (
            <ActionBtn onClick={() => setShowGrantForm(!showGrantForm)} variant="purple" icon={Shield}>
              Acorda Plan
            </ActionBtn>
          )}
          {org.planOverride && (
            <ActionBtn onClick={handleRevoke} disabled={revokeMutation.isPending} variant="orange" icon={ShieldOff}>
              Revocare Override
            </ActionBtn>
          )}
          {org.status !== 'SUSPENDED' && (
            <ActionBtn onClick={() => suspendMutation.mutate(id)} disabled={suspendMutation.isPending} variant="red" icon={Ban}>
              Suspenda
            </ActionBtn>
          )}
          {org.status === 'SUSPENDED' && (
            <ActionBtn onClick={() => activateMutation.mutate(id)} disabled={activateMutation.isPending} variant="green" icon={CheckCircle}>
              Activeaza
            </ActionBtn>
          )}
          {!editing && (
            <button
              onClick={startEditing}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 transition-colors"
            >
              Editeaza
            </button>
          )}
        </div>
      </div>

      {/* Grant Plan form */}
      {showGrantForm && (
        <InlinePanel title="Acorda Plan (Override)" color="purple" onClose={() => setShowGrantForm(false)}>
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-purple-700 mb-1">Plan</label>
              <select
                value={grantForm.plan}
                onChange={(e) => setGrantForm({ ...grantForm, plan: e.target.value })}
                className="rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              >
                {OVERRIDE_PLAN_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-purple-700 mb-1">Motiv (optional)</label>
              <input
                type="text"
                value={grantForm.reason}
                onChange={(e) => setGrantForm({ ...grantForm, reason: e.target.value })}
                placeholder="ex: Early adopter, companie proprie"
                className="w-full rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm placeholder:text-purple-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
            <button
              onClick={handleGrant}
              disabled={grantMutation.isPending}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {grantMutation.isPending ? 'Se acorda...' : 'Acorda'}
            </button>
          </div>
        </InlinePanel>
      )}

      {/* Extend Trial form */}
      {showTrialForm && (
        <InlinePanel title="Extinde Perioada de Proba" color="blue" onClose={() => setShowTrialForm(false)}>
          {org.trialEndsAt && (
            <p className="text-xs text-blue-600 mb-3">
              Trial-ul expira pe <strong>{new Date(org.trialEndsAt).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
            </p>
          )}
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-blue-700 mb-1">Zile</label>
              <input
                type="number"
                value={trialDays}
                onChange={(e) => setTrialDays(e.target.value)}
                min="1"
                max="365"
                className="w-24 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <button
              onClick={handleExtendTrial}
              disabled={extendTrialMutation.isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {extendTrialMutation.isPending ? 'Se extinde...' : 'Extinde'}
            </button>
          </div>
        </InlinePanel>
      )}

      {/* Override banner */}
      {org.planOverride && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Plan acordat manual (override activ)</p>
            <p className="mt-1 text-sm text-emerald-700">
              Acordat de <span className="font-medium">{org.planOverrideBy}</span>
              {org.planOverrideAt && (
                <> la {new Date(org.planOverrideAt).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}</>
              )}
              {org.planOverrideReason && <> - {org.planOverrideReason}</>}
            </p>
            <p className="mt-1 text-xs text-emerald-600/70">Webhook-urile Stripe nu vor modifica acest plan.</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStatCard icon={Users} label="Utilizatori" value={org._count?.users || 0} />
        <MiniStatCard icon={Building2} label="Clienti" value={org._count?.clients || 0} />
        <MiniStatCard icon={Calendar} label="Programari" value={org._count?.appointments || 0} />
        <MiniStatCard icon={FileText} label="Facturi" value={org._count?.invoices || 0} />
      </div>

      {/* Details / Edit form */}
      <div className="rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-gray-900">Detalii Organizatie</h3>
          {editing && (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="rounded-lg bg-primary-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {updateMutation.isPending ? 'Se salveaza...' : 'Salveaza'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Anuleaza
              </button>
            </div>
          )}
        </div>

        {editing ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Status">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors"
              >
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
            <FormField label="Plan">
              <select
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value })}
                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors"
              >
                {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </FormField>
            <FormField label="Max Utilizatori">
              <input
                type="number"
                value={form.maxUsers ?? ''}
                onChange={(e) => setForm({ ...form, maxUsers: e.target.value })}
                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors"
              />
            </FormField>
            <FormField label="Max Clienti">
              <input
                type="number"
                value={form.maxClients ?? ''}
                onChange={(e) => setForm({ ...form, maxClients: e.target.value })}
                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors"
              />
            </FormField>
            <FormField label="Max Programari">
              <input
                type="number"
                value={form.maxAppointments ?? ''}
                onChange={(e) => setForm({ ...form, maxAppointments: e.target.value })}
                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors"
              />
            </FormField>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoField label="Sector Activitate" value={org.activitySector || '-'} />
            <InfoField label="Max Utilizatori" value={org.maxUsers} />
            <InfoField label="Max Clienti" value={org.maxClients} />
            <InfoField label="Max Programari" value={org.maxAppointments} />
            <InfoField label="Trial Expira" value={org.trialEndsAt ? new Date(org.trialEndsAt).toLocaleDateString('ro-RO') : '-'} />
            <InfoField label="Trial Folosit" value={org.trialUsed ? 'Da' : 'Nu'} />
            <InfoField label="Stripe Customer" value={org.stripeCustomerId || '-'} mono />
            <InfoField label="Subscription" value={org.subscriptionId || '-'} mono />
            <InfoField label="Subscription Ends" value={org.subscriptionEndsAt ? new Date(org.subscriptionEndsAt).toLocaleDateString('ro-RO') : '-'} />
            <InfoField label="Data Crearii" value={new Date(org.createdAt).toLocaleDateString('ro-RO')} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shared Sub-components ──────────────────────────────────────────────────

function ActionBtn({ onClick, disabled, variant, icon: Icon, children }) {
  const variants = {
    blue: 'border-blue-200 text-blue-600 hover:bg-blue-50',
    purple: 'border-purple-200 text-purple-600 hover:bg-purple-50',
    orange: 'border-orange-200 text-orange-600 hover:bg-orange-50',
    red: 'border-red-200 text-red-600 hover:bg-red-50',
    green: 'border-green-200 text-green-600 hover:bg-green-50',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors disabled:opacity-50 ${variants[variant]}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

function InlinePanel({ title, color, onClose, children }) {
  const colors = {
    purple: 'border-purple-200 bg-purple-50/60',
    blue: 'border-blue-200 bg-blue-50/60',
  };
  const titleColors = {
    purple: 'text-purple-900',
    blue: 'text-blue-900',
  };
  return (
    <div className={`animate-fade-in rounded-2xl border p-4 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className={`text-sm font-semibold ${titleColors[color]}`}>{title}</h4>
        <button onClick={onClose} className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors">Anuleaza</button>
      </div>
      {children}
    </div>
  );
}

function MiniStatCard({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-200/60 bg-white p-4 shadow-sm">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100">
        <Icon className="h-4 w-4 text-gray-500" />
      </div>
      <div>
        <p className="text-[11px] text-gray-500">{label}</p>
        <p className="text-lg font-bold tabular-nums text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function InfoField({ label, value, mono }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`mt-0.5 text-sm font-medium text-gray-900 ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    TRIAL: 'bg-blue-50 text-blue-700 border-blue-200',
    SUSPENDED: 'bg-red-50 text-red-700 border-red-200',
    CANCELLED: 'bg-gray-100 text-gray-600 border-gray-200',
    PAYMENT_REQUIRED: 'bg-orange-50 text-orange-700 border-orange-200',
  };
  return (
    <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${styles[status] || styles.ACTIVE}`}>
      {status}
    </span>
  );
}

function PlanBadge({ plan }) {
  const styles = {
    FREE: 'bg-gray-100 text-gray-600 border-gray-200',
    STARTER: 'bg-blue-50 text-blue-700 border-blue-200',
    PROFESSIONAL: 'bg-purple-50 text-purple-700 border-purple-200',
    ENTERPRISE: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  return (
    <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${styles[plan] || styles.FREE}`}>
      {plan}
    </span>
  );
}
