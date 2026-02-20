import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { useTicket, useUpdateTicket, useSendMessage } from '@/hooks/useTickets';
import useToast from '@/context/useToast';

const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const STATUS_COLORS = {
  OPEN: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-600',
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
    updateTicket({ id, status }, {
      onSuccess: () => showToast({ title: 'Status actualizat', type: 'success' }),
      onError: () => showToast({ title: 'Eroare', description: 'Nu s-a putut actualiza statusul.', type: 'error' }),
    });
  };

  const handlePriorityChange = (priority) => {
    updateTicket({ id, priority }, {
      onSuccess: () => showToast({ title: 'Prioritate actualizata', type: 'success' }),
      onError: () => showToast({ title: 'Eroare', description: 'Nu s-a putut actualiza prioritatea.', type: 'error' }),
    });
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
        onError: () => showToast({ title: 'Eroare', description: 'Nu s-a putut trimite mesajul.', type: 'error' }),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (!ticket) {
    return <div className="text-center py-20 text-gray-500">Tichetul nu a fost gasit.</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/tickets')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Inapoi la tichete
        </button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{ticket.subject}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
              <span>{ticket.organization?.name}</span>
              <span>&#183;</span>
              <span>{ticket.createdBy?.firstName} {ticket.createdBy?.lastName}</span>
              <span>&#183;</span>
              <span>{CATEGORY_LABELS[ticket.category]}</span>
              <span>&#183;</span>
              <span>{new Date(ticket.createdAt).toLocaleDateString('ro-RO')}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={ticket.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${STATUS_COLORS[ticket.status]}`}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
            <select
              value={ticket.priority}
              onChange={(e) => handlePriorityChange(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto p-4 space-y-3">
          {ticket.messages?.map((msg) => {
            const isSuperAdmin = msg.authorType === 'SUPER_ADMIN';
            return (
              <div
                key={msg.id}
                className={`flex ${isSuperAdmin ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-xl px-4 py-3 ${
                    isSuperAdmin
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-blue-50 text-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold">
                      {msg.author?.firstName} {msg.author?.lastName}
                    </span>
                    <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${
                      isSuperAdmin ? 'bg-gray-200 text-gray-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {isSuperAdmin ? 'Admin' : 'Utilizator'}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {new Date(msg.createdAt).toLocaleString('ro-RO')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reply */}
        <form onSubmit={handleSend} className="border-t border-gray-200 p-4">
          <div className="flex gap-2">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Scrie un raspuns..."
              rows={2}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
            <button
              type="submit"
              disabled={!reply.trim() || sending}
              className="self-end rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
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
