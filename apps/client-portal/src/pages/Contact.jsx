import { useState } from 'react';
import { Mail, MapPin, Send, Loader2, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import api from '@/utils/api';

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

  const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Contact</h1>
      <p className="text-gray-500 mb-8">
        Ai intrebari sau ai nevoie de ajutor? Ne poti contacta prin oricare dintre canalele de mai jos sau trimite-ne un mesaj direct.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
        <Card>
          <CardContent>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Email</h3>
            </div>
            <p className="text-sm text-gray-500 mb-2">
              Trimite-ne un email si iti vom raspunde in cel mai scurt timp.
            </p>
            <a
              href="mailto:contact@forja.it.com"
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              contact@forja.it.com
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Program suport</h3>
            </div>
            <p className="text-sm text-gray-500 mb-2">
              Luni - Vineri: 09:00 - 18:00
            </p>
            <p className="text-sm text-gray-600">
              Raspundem in maxim 24 de ore lucratoare.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Contact Form */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Trimite-ne un mesaj</h2>

        {status === 'sent' ? (
          <div className="text-center py-8">
            <CheckCircle className="mx-auto h-10 w-10 text-green-600 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900">Mesaj trimis!</h3>
            <p className="mt-2 text-sm text-gray-600">Va vom raspunde in cel mai scurt timp.</p>
            <button
              onClick={() => setStatus('idle')}
              className="mt-4 text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              Trimite alt mesaj
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {status === 'error' && (
              <p className="text-sm text-red-600">{errorMsg}</p>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nume *</label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={100}
                  value={form.name}
                  onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                  className={inputCls}
                  placeholder="Minim 2 caractere"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                  className={inputCls}
                  placeholder="exemplu@email.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subiect *</label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={200}
                value={form.subject}
                onChange={(e) => setForm(p => ({ ...p, subject: e.target.value }))}
                className={inputCls}
                placeholder="Minim 3 caractere"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mesajul tau *</label>
              <textarea
                required
                rows={5}
                minLength={10}
                maxLength={2000}
                value={form.message}
                onChange={(e) => setForm(p => ({ ...p, message: e.target.value }))}
                className={inputCls + ' resize-none'}
                placeholder="Descrie cat mai detaliat cererea ta (minim 10 caractere)"
              />
              <p className="mt-1 text-xs text-gray-400">{form.message.length}/2000 caractere (minim 10)</p>
            </div>
            <button
              type="submit"
              disabled={status === 'sending'}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {status === 'sending' ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Se trimite...</>
              ) : (
                <><Send className="h-4 w-4" /> Trimite mesajul</>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
