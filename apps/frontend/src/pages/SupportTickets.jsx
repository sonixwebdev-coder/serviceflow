import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, X } from 'lucide-react';
import { useTickets, useCreateTicket } from '../hooks/useSupport';
import useToast from '../context/useToast';

const STATUS_COLORS = {
  OPEN: 'border border-blue-400 bg-blue-50 text-blue-900',
  IN_PROGRESS: 'border border-yellow-400 bg-yellow-50 text-yellow-800',
  RESOLVED: 'border border-emerald-400 bg-emerald-50 text-emerald-900',
  CLOSED: 'border border-gray-300 bg-gray-100 text-gray-800',
};

const PRIORITY_COLORS = {
  LOW: 'border border-gray-300 bg-gray-100 text-gray-800',
  MEDIUM: 'border border-blue-400 bg-blue-50 text-blue-900',
  HIGH: 'border border-amber-400 bg-amber-50 text-amber-900',
  URGENT: 'border border-red-400 bg-red-50 text-red-800',
};

const CATEGORY_LABELS = {
  BUG: 'Bug',
  FEATURE_REQUEST: 'Feature Request',
  BILLING: 'Billing',
  GENERAL_QUESTION: 'General',
};

export default function SupportTickets() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ page: 1, limit: 20 });
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ subject: '', category: 'GENERAL_QUESTION', message: '' });

  const { data, isLoading } = useTickets({ ...filters, ...(search ? { search } : {}) });
  const { mutate: createTicket, isPending: creating } = useCreateTicket();
  const { showToast } = useToast();

  const tickets = data?.tickets || [];
  const pagination = data?.pagination;

  const handleCreate = (e) => {
    e.preventDefault();
    createTicket(form, {
      onSuccess: () => {
        setShowModal(false);
        setForm({ subject: '', category: 'GENERAL_QUESTION', message: '' });
        showToast({ title: 'Tichet creat', description: 'Tichetul a fost trimis cu succes.', type: 'success' });
      },
      onError: () => showToast({ title: 'Eroare', description: 'Nu s-a putut crea tichetul.', type: 'error' }),
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suport</h1>
          <p className="text-sm text-gray-500 mt-1">Trimite si gestioneaza tichetele de suport.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-viperx-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Creaza tichet
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cauta dupa subiect..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-viperx-primary focus:ring-1 focus:ring-viperx-primary"
          />
        </div>
        <select
          value={filters.status || ''}
          onChange={(e) => setFilters((prev) => ({ ...prev, page: 1, status: e.target.value || undefined }))}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Toate statusurile</option>
          <option value="OPEN">Deschis</option>
          <option value="IN_PROGRESS">In progres</option>
          <option value="RESOLVED">Rezolvat</option>
          <option value="CLOSED">Inchis</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-viperx-primary" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">Niciun tichet gasit.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Subiect</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Categorie</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Prioritate</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  onClick={() => navigate(`/support/${ticket.id}`)}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">
                    {ticket.subject}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {CATEGORY_LABELS[ticket.category]}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[ticket.status]}`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[ticket.priority]}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(ticket.createdAt).toLocaleDateString('ro-RO')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Pagina {pagination.page} din {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page <= 1}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Inapoi
            </button>
            <button
              onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page >= pagination.totalPages}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Inainte
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-gray-900/40" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Tichet nou</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subiect</label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={200}
                  value={form.subject}
                  onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:ring-1 focus:ring-viperx-primary"
                  placeholder="Descrie pe scurt problema..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categorie</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="GENERAL_QUESTION">Intrebare generala</option>
                  <option value="BUG">Bug</option>
                  <option value="FEATURE_REQUEST">Feature Request</option>
                  <option value="BILLING">Billing</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mesaj</label>
                <textarea
                  required
                  minLength={1}
                  maxLength={5000}
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:border-viperx-primary focus:ring-1 focus:ring-viperx-primary"
                  placeholder="Descrie problema in detaliu..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Anuleaza
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-2 rounded-lg bg-viperx-primary px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  {creating && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  Trimite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
