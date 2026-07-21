import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Building2, ChevronRight } from 'lucide-react';
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
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200/60 bg-white p-4 shadow-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cauta dupa nume sau slug..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-gray-200 bg-gray-50/50 py-2 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-primary-500/20 transition-colors"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-700 focus:border-primary-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500/20 transition-colors"
        >
          <option value="">Toate statusurile</option>
          {STATUS_OPTIONS.filter(Boolean).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={plan}
          onChange={(e) => {
            setPlan(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-700 focus:border-primary-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500/20 transition-colors"
        >
          <option value="">Toate planurile</option>
          {PLAN_OPTIONS.filter(Boolean).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={sector}
          onChange={(e) => {
            setSector(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-700 focus:border-primary-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500/20 transition-colors"
        >
          <option value="">Toate sectoarele</option>
          {SECTOR_OPTIONS.filter(Boolean).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200/60 bg-white shadow-xs">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          </div>
        ) : !data?.organizations?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
              <Building2 className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-500">Nicio organizatie gasita</p>
            <p className="mt-1 text-xs text-gray-400">Incearca sa modifici filtrele</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-left">
                    <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Nume
                    </th>
                    <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Slug
                    </th>
                    <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Plan
                    </th>
                    <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Sector
                    </th>
                    <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Utilizatori
                    </th>
                    <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Data crearii
                    </th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.organizations.map((org) => (
                    <tr
                      key={org.id}
                      onClick={() => navigate(`/organizations/${org.id}`)}
                      className="group cursor-pointer transition-colors hover:bg-primary-50/30"
                    >
                      <td className="whitespace-nowrap px-5 py-3.5 font-medium text-gray-900">
                        {org.name}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-gray-500 font-mono text-xs">
                        /{org.slug}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <PlanBadge plan={org.plan} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <StatusBadge status={org.status} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-gray-500 text-xs">
                        {org.activitySector || '-'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-gray-600 tabular-nums">
                        {org._count?.users || 0}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-gray-500 text-xs">
                        {new Date(org.createdAt).toLocaleDateString('ro-RO')}
                      </td>
                      <td className="px-3 py-3.5">
                        <ChevronRight className="h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-500" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.pagination?.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
                <p className="text-xs text-gray-500">{data.pagination.total} rezultate</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors disabled:opacity-40 hover:bg-gray-50"
                  >
                    Inapoi
                  </button>
                  <span className="min-w-[60px] text-center text-xs tabular-nums text-gray-500">
                    {page} / {data.pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                    disabled={page >= data.pagination.totalPages}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors disabled:opacity-40 hover:bg-gray-50"
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
    ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    TRIAL: 'bg-blue-50 text-blue-700 border-blue-200',
    SUSPENDED: 'bg-red-50 text-red-700 border-red-200',
    CANCELLED: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  return (
    <span
      className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${styles[status] || styles.ACTIVE}`}
    >
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
    <span
      className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${styles[plan] || styles.FREE}`}
    >
      {plan}
    </span>
  );
}
