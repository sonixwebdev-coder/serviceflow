import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Users, Calendar, FileText, Ban, CheckCircle, Shield, ShieldOff } from 'lucide-react';
import {
  useOrganization, useUpdateOrganization, useSuspendOrganization, useActivateOrganization,
  useGrantPlan, useRevokeOverride,
} from '@/hooks/useOrganizations';
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

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [showGrantForm, setShowGrantForm] = useState(false);
  const [grantForm, setGrantForm] = useState({ plan: 'PROFESSIONAL', reason: '' });

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
    updateMutation.mutate({ id, ...form }, { onSuccess: () => setEditing(false) });
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

  if (isLoading) {
    return <div className="flex items-center justify-center py-12 text-sm text-gray-400">Se incarca...</div>;
  }

  if (!org) {
    return <div className="flex items-center justify-center py-12 text-sm text-gray-400">Organizatia nu a fost gasita</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/organizations')} className="rounded-lg p-2 hover:bg-gray-100 transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
            <StatusBadge status={org.status} />
            <PlanBadge plan={org.plan} />
            {org.planOverride && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                <Shield className="h-3 w-3" /> Override
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">/{org.slug}</p>
        </div>
        <div className="flex gap-2">
          {!org.planOverride && (
            <button
              onClick={() => setShowGrantForm(!showGrantForm)}
              className="flex items-center gap-2 rounded-lg border border-purple-200 px-3 py-2 text-sm font-medium text-purple-600 hover:bg-purple-50 transition-colors"
            >
              <Shield className="h-4 w-4" /> Acorda Plan
            </button>
          )}
          {org.planOverride && (
            <button
              onClick={handleRevoke}
              disabled={revokeMutation.isPending}
              className="flex items-center gap-2 rounded-lg border border-orange-200 px-3 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 transition-colors"
            >
              <ShieldOff className="h-4 w-4" /> Revocare Override
            </button>
          )}
          {org.status !== 'SUSPENDED' && (
            <button
              onClick={() => suspendMutation.mutate(id)}
              disabled={suspendMutation.isPending}
              className="flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <Ban className="h-4 w-4" /> Suspenda
            </button>
          )}
          {org.status === 'SUSPENDED' && (
            <button
              onClick={() => activateMutation.mutate(id)}
              disabled={activateMutation.isPending}
              className="flex items-center gap-2 rounded-lg border border-green-200 px-3 py-2 text-sm font-medium text-green-600 hover:bg-green-50 transition-colors"
            >
              <CheckCircle className="h-4 w-4" /> Activeaza
            </button>
          )}
          {!editing && (
            <button
              onClick={startEditing}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
            >
              Editeaza
            </button>
          )}
        </div>
      </div>

      {/* Grant Plan inline form */}
      {showGrantForm && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
          <h4 className="text-sm font-semibold text-purple-900 mb-3">Acorda Plan (Override)</h4>
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-purple-700 mb-1">Plan</label>
              <select
                value={grantForm.plan}
                onChange={(e) => setGrantForm({ ...grantForm, plan: e.target.value })}
                className="rounded-lg border border-purple-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
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
                className="w-full rounded-lg border border-purple-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
              />
            </div>
            <button
              onClick={handleGrant}
              disabled={grantMutation.isPending}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {grantMutation.isPending ? 'Se acorda...' : 'Acorda'}
            </button>
            <button
              onClick={() => setShowGrantForm(false)}
              className="rounded-lg border border-purple-200 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 transition-colors"
            >
              Anuleaza
            </button>
          </div>
        </div>
      )}

      {/* Override banner */}
      {org.planOverride && (
        <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
          <div>
            <p className="text-sm font-semibold text-green-800">Plan acordat manual (override activ)</p>
            <p className="mt-1 text-sm text-green-700">
              Acordat de <span className="font-medium">{org.planOverrideBy}</span>
              {org.planOverrideAt && (
                <> la {new Date(org.planOverrideAt).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}</>
              )}
              {org.planOverrideReason && <> — {org.planOverrideReason}</>}
            </p>
            <p className="mt-1 text-xs text-green-600">Webhook-urile Stripe nu vor modifica acest plan.</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={Users} label="Utilizatori" value={org._count?.users || 0} />
        <StatCard icon={Building2} label="Clienti" value={org._count?.clients || 0} />
        <StatCard icon={Calendar} label="Programari" value={org._count?.appointments || 0} />
        <StatCard icon={FileText} label="Facturi" value={org._count?.invoices || 0} />
      </div>

      {/* Details / Edit form */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Detalii Organizatie</h3>

        {editing ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              >
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <select
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              >
                {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Utilizatori</label>
              <input
                type="number"
                value={form.maxUsers}
                onChange={(e) => setForm({ ...form, maxUsers: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Clienti</label>
              <input
                type="number"
                value={form.maxClients}
                onChange={(e) => setForm({ ...form, maxClients: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Programari</label>
              <input
                type="number"
                value={form.maxAppointments}
                onChange={(e) => setForm({ ...form, maxAppointments: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {updateMutation.isPending ? 'Se salveaza...' : 'Salveaza'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Anuleaza
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoField label="Sector Activitate" value={org.activitySector} />
            <InfoField label="Max Utilizatori" value={org.maxUsers} />
            <InfoField label="Max Clienti" value={org.maxClients} />
            <InfoField label="Max Programari" value={org.maxAppointments} />
            <InfoField label="Stripe Customer" value={org.stripeCustomerId || 'N/A'} />
            <InfoField label="Subscription" value={org.subscriptionId || 'N/A'} />
            <InfoField label="Subscription Ends" value={org.subscriptionEndsAt ? new Date(org.subscriptionEndsAt).toLocaleDateString('ro-RO') : 'N/A'} />
            <InfoField label="Data Crearii" value={new Date(org.createdAt).toLocaleDateString('ro-RO')} />
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-gray-400" />
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    ACTIVE: 'bg-green-100 text-green-700',
    TRIAL: 'bg-blue-100 text-blue-700',
    SUSPENDED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-700',
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${styles[status] || styles.ACTIVE}`}>
      {status}
    </span>
  );
}

function PlanBadge({ plan }) {
  const styles = {
    FREE: 'bg-gray-100 text-gray-600',
    STARTER: 'bg-blue-100 text-blue-700',
    PROFESSIONAL: 'bg-purple-100 text-purple-700',
    ENTERPRISE: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${styles[plan] || styles.FREE}`}>
      {plan}
    </span>
  );
}
