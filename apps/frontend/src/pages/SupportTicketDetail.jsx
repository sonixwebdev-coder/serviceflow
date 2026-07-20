import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { useTicket, useSendMessage } from '../hooks/useSupport';
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

export default function SupportTicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: ticket, isLoading } = useTicket(id);
  const { mutate: sendMessage, isPending: sending } = useSendMessage();
  const [reply, setReply] = useState('');
  const { showToast } = useToast();

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
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!ticket) {
    return <div className="text-center py-20 text-gray-500">Tichetul nu a fost gasit.</div>;
  }

  const isClosed = ticket.status === 'CLOSED' || ticket.status === 'RESOLVED';

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/support')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Inapoi la suport
        </button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{ticket.subject}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[ticket.status]}`}
              >
                {ticket.status.replace('_', ' ')}
              </span>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORITY_COLORS[ticket.priority]}`}
              >
                {ticket.priority}
              </span>
              <span className="text-xs text-gray-500">{CATEGORY_LABELS[ticket.category]}</span>
              <span className="text-xs text-gray-400">
                &#183; {new Date(ticket.createdAt).toLocaleDateString('ro-RO')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto p-4 space-y-3">
          {ticket.messages?.map((msg) => {
            const isOrgUser = msg.authorType === 'ORG_USER';
            return (
              <div key={msg.id} className={`flex ${isOrgUser ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-xl px-4 py-3 ${
                    isOrgUser ? 'bg-blue-50 text-gray-800' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold">
                      {msg.author?.firstName} {msg.author?.lastName}
                    </span>
                    <span
                      className={`text-[10px] rounded-full px-1.5 py-0.5 ${
                        isOrgUser ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {isOrgUser ? 'Tu' : 'Suport'}
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
        {!isClosed ? (
          <form onSubmit={handleSend} className="border-t border-gray-200 p-4">
            <div className="flex gap-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Scrie un mesaj..."
                rows={2}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                disabled={!reply.trim() || sending}
                className="self-end rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
              >
                {sending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="border-t border-gray-200 p-4 text-center text-sm text-gray-500">
            Acest tichet este inchis.
          </div>
        )}
      </div>
    </div>
  );
}
