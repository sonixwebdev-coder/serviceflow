import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Building2 } from 'lucide-react';
import { useOrganizations } from '@/hooks/useOrganizations';

const STATUS_OPTIONS = ['', 'ACTIVE', 'TRIAL', 'SUSPENDED', 'CANCELLED'];
const PLAN_OPTIONS = ['', 'FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
const SECTOR_OPTIONS = ['', 'AUTOMOTIVE', 'BEAUTY', 'HOME_SERVICES', 'IT_ELECTRONICS'];

export default function Organizations() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [plan, setPlan] = useState('');
  const [sector, setSector] = useState('');

  const params = { page, limit: 20 };
  if (search) params.search = search;
  if (status) params.status = status;
  if (plan) params.plan = plan;
  if (sector) params.sector = sector;

  const { data, isLoading } = useOrganizations(params);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Organizatii</h1>
        <p className="text-sm text-gray-500">Gestioneaza toate organizatiile din platforma</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cauta dupa nume sau slug..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
        >
          <option value="">Toate statusurile</option>
          {STATUS_OPTIONS.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={plan}
          onChange={(e) => { setPlan(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
        >
          <option value="">Toate planurile</option>
          {PLAN_OPTIONS.filter(Boolean).map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select
          value={sector}
          onChange={(e) => { setSector(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
        >
          <option value="">Toate sectoarele</option>
          {SECTOR_OPTIONS.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-gray-400">
            Se incarca...
          </div>
        ) : !data?.organizations?.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">Nicio organizatie gasita</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500">
                    <th className="px-4 py-3 font-medium">Nume</th>
                    <th className="px-4 py-3 font-medium">Slug</th>
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Sector</th>
                    <th className="px-4 py-3 font-medium">Utilizatori</th>
                    <th className="px-4 py-3 font-medium">Data crearii</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.organizations.map((org) => (
                    <tr
                      key={org.id}
                      onClick={() => navigate(`/organizations/${org.id}`)}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{org.name}</td>
                      <td className="px-4 py-3 text-gray-500">{org.slug}</td>
                      <td className="px-4 py-3">
                        <PlanBadge plan={org.plan} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={org.status} />
                      </td>
                      <td className="px-4 py-3 text-gray-500">{org.activitySector}</td>
                      <td className="px-4 py-3 text-gray-500">{org._count?.users || 0}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(org.createdAt).toLocaleDateString('ro-RO')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.pagination?.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                <p className="text-xs text-gray-500">
                  {data.pagination.total} rezultate
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium disabled:opacity-50 hover:bg-gray-50"
                  >
                    Inapoi
                  </button>
                  <span className="flex items-center text-xs text-gray-500">
                    {page} / {data.pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                    disabled={page >= data.pagination.totalPages}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium disabled:opacity-50 hover:bg-gray-50"
                  >
                    Inainte
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
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
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || styles.ACTIVE}`}>
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
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[plan] || styles.FREE}`}>
      {plan}
    </span>
  );
}
