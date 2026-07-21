import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { useTicket, useUpdateTicket, useSendMessage } from '@/hooks/useTickets';
import useToast from '@/context/useToast';

const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const STATUS_COLORS = {
  OPEN: 'bg-blue-50 text-blue-700 border-blue-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
  RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CLOSED: 'bg-gray-100 text-gray-500 border-gray-200',
};

const PRIORITY_COLORS = {
  LOW: 'text-gray-500',
  MEDIUM: 'text-blue-600',
  HIGH: 'text-amber-600',
  URGENT: 'text-red-600',
};

const CATEGORY_LABELS = {
  BUG: 'Bug',
  FEATURE_REQUEST: 'Feature Request',
  BILLING: 'Billing',
  GENERAL_QUESTION: 'General',
};

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: ticket, isLoading } = useTicket(id);
  const { mutate: updateTicket } = useUpdateTicket();
  const { mutate: sendMessage, isPending: sending } = useSendMessage();
  const [reply, setReply] = useState('');
  const { showToast } = useToast();

  const handleStatusChange = (status) => {
    updateTicket(
      { id, status },
      {
        onSuccess: () => showToast({ title: 'Status actualizat', type: 'success' }),
        onError: () =>
          showToast({
            title: 'Eroare',
            description: 'Nu s-a putut actualiza statusul.',
            type: 'error',
          }),
      }
    );
  };

  const handlePriorityChange = (priority) => {
    updateTicket(
      { id, priority },
      {
        onSuccess: () => showToast({ title: 'Prioritate actualizata', type: 'success' }),
        onError: () =>
          showToast({
            title: 'Eroare',
            description: 'Nu s-a putut actualiza prioritatea.',
            type: 'error',
          }),
      }
    );
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!reply.trim()) return;

    sendMessage(
      { ticketId: id, content: reply.trim() },
      {
        onSuccess: () => {
          setReply('');
          showToast({ title: 'Mesaj trimis', type: 'success' });
        },
        onError: () =>
          showToast({
            title: 'Eroare',
            description: 'Nu s-a putut trimite mesajul.',
            type: 'error',
          }),
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

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-sm font-medium text-gray-500">Tichetul nu a fost gasit.</p>
        <button
          onClick={() => navigate('/tickets')}
          className="mt-3 text-sm text-primary-600 hover:text-primary-700 transition-colors"
        >
          Inapoi la tichete
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/tickets')}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-3 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Inapoi la tichete
        </button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{ticket.subject}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="text-xs font-medium text-gray-700">{ticket.organization?.name}</span>
              <span className="text-gray-300">&middot;</span>
              <span className="text-xs text-gray-500">
                {ticket.createdBy?.firstName} {ticket.createdBy?.lastName}
              </span>
              <span className="text-gray-300">&middot;</span>
              <span className="inline-flex rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                {CATEGORY_LABELS[ticket.category]}
              </span>
              <span className="text-gray-300">&middot;</span>
              <span className="text-[11px] text-gray-400">
                {new Date(ticket.createdAt).toLocaleDateString('ro-RO')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={ticket.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${STATUS_COLORS[ticket.status]}`}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
            <select
              value={ticket.priority}
              onChange={(e) => handlePriorityChange(e.target.value)}
              className={`rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-1.5 text-xs font-medium transition-colors ${PRIORITY_COLORS[ticket.priority]}`}
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="rounded-2xl border border-gray-200/60 bg-white shadow-xs">
        <div className="max-h-[500px] overflow-y-auto p-5 space-y-3">
          {ticket.messages?.map((msg) => {
            const isSuperAdmin = msg.authorType === 'SUPER_ADMIN';
            return (
              <div
                key={msg.id}
                className={`flex ${isSuperAdmin ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    isSuperAdmin
                      ? 'bg-primary-50 text-gray-800 border border-primary-100'
                      : 'bg-gray-50 text-gray-800 border border-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-900">
                      {msg.author?.firstName} {msg.author?.lastName}
                    </span>
                    <span
                      className={`text-[10px] rounded-full px-1.5 py-0.5 font-medium ${
                        isSuperAdmin
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {isSuperAdmin ? 'Admin' : 'Utilizator'}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    {new Date(msg.createdAt).toLocaleString('ro-RO')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reply */}
        <form onSubmit={handleSend} className="border-t border-gray-100 p-4">
          <div className="flex gap-2">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Scrie un raspuns..."
              rows={2}
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm resize-none placeholder:text-gray-400 focus:border-primary-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-primary-500/20 transition-colors"
            />
            <button
              type="submit"
              disabled={!reply.trim() || sending}
              className="self-end rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-primary-700 hover:shadow-sm disabled:opacity-50 transition-all"
            >
              {sending ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
