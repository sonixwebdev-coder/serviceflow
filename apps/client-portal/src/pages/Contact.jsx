import { useState } from 'react';
import { Mail, Clock, Send, Loader2, CheckCircle } from 'lucide-react';
import api from '@/utils/api';
import SEOHead from '@/components/landing/SEOHead';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg('');
    try {
      await api.post('/contact', form);
      setStatus('sent');
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setStatus('error');
      const data = err.response?.data;
      const msg = data?.errors?.length
        ? data.errors.map(e => e.message).join('. ')
        : data?.message || 'Eroare la trimiterea mesajului. Incercati din nou.';
      setErrorMsg(msg);
    }
  };

  const inputCls = 'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm transition focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <SEOHead
        title="Contact - ForjaIt"
        description="Ai o intrebare sau nevoie de ajutor? Trimite-ne un mesaj si iti raspundem in cel mai scurt timp."
        canonical="https://portal.forja.it.com/contact"
      />
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Suport</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Contact</h1>
        <p className="mt-3 text-base text-gray-500 max-w-xl">
          Ai intrebari sau ai nevoie de ajutor? Ne poti contacta prin oricare dintre canalele de mai jos sau trimite-ne un mesaj direct.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 hover:shadow-lg hover:shadow-primary-50 hover:border-primary-200 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-gray-900">Email</h3>
          </div>
          <p className="text-sm text-gray-500 mb-2">
            Trimite-ne un email si iti vom raspunde in cel mai scurt timp.
          </p>
          <a href="mailto:contact@forja.it.com" className="text-sm font-medium text-primary hover:text-primary-800 transition-colors">
            contact@forja.it.com
          </a>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 hover:shadow-lg hover:shadow-primary-50 hover:border-primary-200 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-gray-900">Program suport</h3>
          </div>
          <p className="text-sm text-gray-500 mb-2">
            Luni – Vineri: 09:00 – 18:00
          </p>
          <p className="text-sm text-gray-600">
            Raspundem in maxim 24 de ore lucratoare.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-5">Trimite-ne un mesaj</h2>

        {status === 'sent' ? (
          <div className="text-center py-8">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Mesaj trimis!</h3>
            <p className="mt-2 text-sm text-gray-600">Va vom raspunde in cel mai scurt timp.</p>
            <button onClick={() => setStatus('idle')} className="mt-4 text-sm font-medium text-primary hover:text-primary-800 transition-colors">
              Trimite alt mesaj
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {status === 'error' && <p className="text-sm text-red-600">{errorMsg}</p>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <input type="text" placeholder="Nume *" required minLength={2} maxLength={100} value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} className={inputCls} />
              <input type="email" placeholder="Email *" required value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} className={inputCls} />
            </div>
            <input type="text" placeholder="Subiect *" required minLength={3} maxLength={200} value={form.subject} onChange={(e) => setForm(p => ({ ...p, subject: e.target.value }))} className={inputCls} />
            <div>
              <textarea placeholder="Descrie cat mai detaliat cererea ta * (minim 10 caractere)" required minLength={10} maxLength={2000} rows={5} value={form.message} onChange={(e) => setForm(p => ({ ...p, message: e.target.value }))} className={inputCls + ' resize-none'} />
              <p className="mt-1 text-xs text-gray-400">{form.message.length}/2000 caractere</p>
            </div>
            <button type="submit" disabled={status === 'sending'} className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-700 transition-colors disabled:opacity-50 shadow-sm shadow-primary/25">
              {status === 'sending' ? (<><Loader2 className="h-4 w-4 animate-spin" /> Se trimite...</>) : (<><Send className="h-4 w-4" /> Trimite mesajul</>)}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
