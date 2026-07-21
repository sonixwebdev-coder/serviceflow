import { useState } from 'react';
import { Check, Loader2, Send } from 'lucide-react';
import API from '../../utils/api';

export default function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg('');
    try {
      await API.post('/contact', form);
      setStatus('sent');
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setStatus('error');
      const data = err.response?.data;
      const msg = data?.errors?.length
        ? data.errors.map((e) => e.message).join('. ')
        : data?.message || 'Eroare la trimiterea mesajului. Incercati din nou.';
      setErrorMsg(msg);
    }
  };

  if (status === 'sent') {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
          <Check className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Mesaj trimis!</h3>
        <p className="mt-2 text-sm text-gray-600">Va vom raspunde in cel mai scurt timp.</p>
        <button
          onClick={() => setStatus('idle')}
          className="mt-4 text-sm font-medium text-primary hover:text-primary-800"
        >
          Trimite alt mesaj
        </button>
      </div>
    );
  }

  const inputCls =
    'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm transition focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden';

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 space-y-4"
    >
      <h3 className="text-lg font-semibold text-gray-900">Contacteaza-ne</h3>
      {status === 'error' && <p className="text-sm text-red-600">{errorMsg}</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <input
          type="text"
          placeholder="Nume *"
          required
          minLength={2}
          maxLength={100}
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          className={inputCls}
        />
        <input
          type="email"
          placeholder="Email *"
          required
          value={form.email}
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          className={inputCls}
        />
      </div>
      <input
        type="text"
        placeholder="Subiect *"
        required
        minLength={3}
        maxLength={200}
        value={form.subject}
        onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
        className={inputCls}
      />
      <div>
        <textarea
          placeholder="Descrie cat mai detaliat cererea ta * (minim 10 caractere)"
          required
          minLength={10}
          maxLength={2000}
          rows={4}
          value={form.message}
          onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
          className={inputCls + ' resize-none'}
        />
        <p className="mt-1 text-xs text-gray-400">{form.message.length}/2000 caractere</p>
      </div>
      <button
        type="submit"
        disabled={status === 'sending'}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-700 transition-colors disabled:opacity-50 shadow-xs shadow-primary/25"
      >
        {status === 'sending' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Se trimite...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" /> Trimite mesajul
          </>
        )}
      </button>
    </form>
  );
}
