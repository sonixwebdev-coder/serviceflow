import { useState } from 'react';
import { Mail, MailOpen, Reply, Archive, Trash2, Eye, ChevronDown } from 'lucide-react';
import { useContactMessages, useContactMessageStats, useUpdateContactMessage, useDeleteContactMessage } from '@/hooks/useContactMessages';
import useToast from '@/context/useToast';

const STATUS_CONFIG = {
  NEW: { label: 'Nou', color: 'bg-blue-100 text-blue-700', icon: Mail },
  READ: { label: 'Citit', color: 'bg-gray-100 text-gray-600', icon: MailOpen },
  REPLIED: { label: 'Raspuns', color: 'bg-green-100 text-green-700', icon: Reply },
  ARCHIVED: { label: 'Arhivat', color: 'bg-yellow-100 text-yellow-700', icon: Archive },
};

export default function ContactMessages() {
  const { showToast } = useToast();
  const [filters, setFilters] = useState({ page: 1, limit: 20 });
  const [expanded, setExpanded] = useState(null);

  const { data: stats } = useContactMessageStats();
  const { data, isLoading } = useContactMessages(filters);
  const updateMutation = useUpdateContactMessage();
  const deleteMutation = useDeleteContactMessage();

  const messages = data?.messages || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / (filters.limit || 20));

  const handleStatusChange = (id, status) => {
    updateMutation.mutate({ id, status }, {
      onSuccess: () => showToast({ title: `Status actualizat: ${STATUS_CONFIG[status].label}`, type: 'success' }),
    });
  };

  const handleDelete = (id) => {
    if (!window.confirm('Sigur doriti sa stergeti acest mesaj?')) return;
    deleteMutation.mutate(id, {
      onSuccess: () => showToast({ title: 'Mesaj sters', type: 'success' }),
    });
  };

  const toggleExpand = (id, currentStatus) => {
    setExpanded(expanded === id ? null : id);
    // Auto-mark as READ when expanding a NEW message
    if (expanded !== id && currentStatus === 'NEW') {
      updateMutation.mutate({ id, status: 'READ' });
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mesaje Contact</h1>
        <p className="text-sm text-gray-500 mt-1">Mesaje primite din formularul de contact al platformei.</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { key: 'new', label: 'Noi', value: stats.new || 0, color: 'text-blue-600', bg: 'bg-blue-50', icon: Mail },
            { key: 'read', label: 'Citite', value: stats.read || 0, color: 'text-gray-500', bg: 'bg-gray-100', icon: MailOpen },
            { key: 'replied', label: 'Raspunse', value: stats.replied || 0, color: 'text-green-600', bg: 'bg-green-50', icon: Reply },
            { key: 'archived', label: 'Arhivate', value: stats.archived || 0, color: 'text-yellow-600', bg: 'bg-yellow-50', icon: Archive },
          ].map((stat) => (
            <div key={stat.key} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2.5 ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <select
          value={filters.status || ''}
          onChange={(e) => setFilters((prev) => ({ ...prev, page: 1, status: e.target.value || undefined }))}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Toate ({total})</option>
          <option value="NEW">Noi ({stats?.new || 0})</option>
          <option value="READ">Citite ({stats?.read || 0})</option>
          <option value="REPLIED">Raspunse ({stats?.replied || 0})</option>
          <option value="ARCHIVED">Arhivate ({stats?.archived || 0})</option>
        </select>
      </div>

      {/* Messages List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white py-12 text-center text-sm text-gray-500">
            Niciun mesaj gasit.
          </div>
        ) : (
          messages.map((msg) => {
            const isExpanded = expanded === msg.id;
            const statusCfg = STATUS_CONFIG[msg.status] || STATUS_CONFIG.NEW;

            return (
              <div
                key={msg.id}
                className={`rounded-xl border bg-white shadow-sm transition-all ${
                  msg.status === 'NEW' ? 'border-blue-200' : 'border-gray-200'
                }`}
              >
                {/* Header row */}
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleExpand(msg.id, msg.status)}
                >
                  <div className={`flex-shrink-0 rounded-full p-2 ${statusCfg.color}`}>
                    <statusCfg.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${msg.status === 'NEW' ? 'text-gray-900' : 'text-gray-700'}`}>
                        {msg.name}
                      </span>
                      <span className="text-xs text-gray-400">&lt;{msg.email}&gt;</span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{msg.subject}</p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {new Date(msg.createdAt).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap mb-4">{msg.message}</p>

                    <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                      <a
                        href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject)}`}
                        onClick={() => handleStatusChange(msg.id, 'REPLIED')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 transition-colors"
                      >
                        <Reply className="h-3.5 w-3.5" /> Raspunde
                      </a>
                      {msg.status !== 'ARCHIVED' && (
                        <button
                          onClick={() => handleStatusChange(msg.id, 'ARCHIVED')}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          <Archive className="h-3.5 w-3.5" /> Arhiveaza
                        </button>
                      )}
                      {msg.status === 'ARCHIVED' && (
                        <button
                          onClick={() => handleStatusChange(msg.id, 'READ')}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" /> Dezarhiveaza
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(msg.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors ml-auto"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Sterge
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Pagina {filters.page} din {totalPages} ({total} mesaje)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
              disabled={filters.page <= 1}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Inapoi
            </button>
            <button
              onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
              disabled={filters.page >= totalPages}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Inainte
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
