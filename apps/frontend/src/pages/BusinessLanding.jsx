import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Menu,
  X,
  Check,
  ChevronDown,
  ArrowRight,
  Users,
  Calendar,
  FileText,
  Globe,
  MessageCircle,
  UserCog,
  Car,
  Scissors,
  Wrench,
  Smartphone,
  CalendarCheck,
  Receipt,
  Mail,
  Building2,
  Bell,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// FAQ Accordion Item
// ---------------------------------------------------------------------------
function FAQItem({ question, answer }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-gray-200">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="text-base font-medium text-gray-900">{question}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-40 pb-5' : 'max-h-0'}`}
      >
        <p className="text-sm leading-relaxed text-gray-600">{answer}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const PAIN_POINTS = [
  {
    title: 'Telefonul suna. Tu esti ocupat.',
    text: 'Clientul suna la 8 dimineata pentru o programare. Tu esti deja la un client. La 12, cand revii, a sunat concurenta.',
  },
  {
    title: 'Programarile sunt in cap, pe foi, pe WhatsApp.',
    text: 'Confuzia nu e o strategie. Un client uitat inseamna o recenzie proasta si bani pierduti.',
  },
  {
    title: 'Facturile se trimit cand iti aduci aminte.',
    text: 'Si cand iti aduci aminte, clientul a uitat deja. Fiecare zi de intarziere e un risc.',
  },
];

const SOLUTIONS = [
  {
    num: '01',
    title: 'Clientii se programeaza singuri.',
    text: 'Portal de programari online, disponibil 24/7. Clientul alege data, ora si serviciul fara telefon, fara asteptare.',
  },
  {
    num: '02',
    title: 'Totul intr-un singur loc.',
    text: 'Clienti, programari, facturi, mesaje, echipa. Un singur dashboard, zero haos.',
  },
  {
    num: '03',
    title: 'Cresti fara sa angajezi un receptioner.',
    text: 'Automatizarile fac treaba: notificari automate, remindere, facturi generate la un click.',
  },
];

const FEATURES = [
  {
    pill: 'CRM',
    pillColor: 'bg-blue-100 text-blue-700',
    title: 'Cunoaste-ti clientii',
    desc: 'Baza de date completa, cu istoric programari, facturi si comunicare. Fiecare client are propriul profil.',
    bullets: [
      'Profil client cu istoric complet',
      'Import si export date',
      'Cautare si filtrare avansata',
      'Note si etichete personalizate',
    ],
    icon: Users,
    iconColor: 'text-blue-600',
    mockAccent: 'border-blue-200',
  },
  {
    pill: 'Programari',
    pillColor: 'bg-green-100 text-green-700',
    title: 'Programari care merg pe pilot automat',
    desc: 'Calendar inteligent, configurabil pe locatii si angajati. Clientii aleg singuri din intervalele disponibile.',
    bullets: [
      'Programari online 24/7',
      'Calendar multi-locatie',
      'Notificari si remindere automate',
      'Gestionare statusuri (in asteptare, confirmat, finalizat)',
    ],
    icon: Calendar,
    iconColor: 'text-green-600',
    mockAccent: 'border-green-200',
  },
  {
    pill: 'Facturare',
    pillColor: 'bg-amber-100 text-amber-700',
    title: 'Facturi profesionale, trimise la timp',
    desc: 'Genereaza facturi direct din programare, trimite-le clientului si urmareste plata totul din aceeasi platforma.',
    bullets: [
      'Generare facturi dintr-un click',
      'Tracking plati',
      'Notificari automate catre client',
      'Export pentru contabilitate',
    ],
    icon: FileText,
    iconColor: 'text-amber-600',
    mockAccent: 'border-amber-200',
  },
  {
    pill: 'Website',
    pillColor: 'bg-purple-100 text-purple-700',
    title: 'Site-ul tau, fara developer',
    desc: 'Builder drag & drop cu blocuri pre-construite. Lanseaza un site profesional in sub o ora.',
    bullets: [
      'Template-uri pe industrie',
      'Blocuri: hero, servicii, echipa, testimoniale, galerie, FAQ',
      'SEO optimizat',
      'Formular de contact si leads',
    ],
    icon: Globe,
    iconColor: 'text-purple-600',
    mockAccent: 'border-purple-200',
  },
  {
    pill: 'Comunicare',
    pillColor: 'bg-pink-100 text-pink-700',
    title: 'Conversatii, nu email-uri pierdute',
    desc: 'Chat integrat cu clientii, notificari in timp real, push notifications pe mobil.',
    bullets: [
      'Chat in-app cu clientii',
      'Notificari push',
      'Mesaje, poze, documente',
      'Istoric complet al conversatiilor',
    ],
    icon: MessageCircle,
    iconColor: 'text-pink-600',
    mockAccent: 'border-pink-200',
  },
  {
    pill: 'Echipa',
    pillColor: 'bg-teal-100 text-teal-700',
    title: 'Echipa organizata, fara micro-management',
    desc: 'Gestioneaza angajatii, task-urile, pontajul si concediile totul centralizat.',
    bullets: [
      'Management angajati cu roluri',
      'Task-uri si todos',
      'Time tracking',
      'Cereri de concediu',
    ],
    icon: UserCog,
    iconColor: 'text-teal-600',
    mockAccent: 'border-teal-200',
  },
];

const SECTORS = [
  {
    key: 'auto',
    label: 'Auto',
    desc: 'Service auto, ITP, vulcanizare, spalatorie',
    icon: Car,
    accent: 'border-blue-500',
    bg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    key: 'beauty',
    label: 'Beauty',
    desc: 'Salon, frizerie, cosmetica, manichiura',
    icon: Scissors,
    accent: 'border-pink-500',
    bg: 'bg-pink-50',
    iconColor: 'text-pink-600',
  },
  {
    key: 'digital',
    label: 'Servicii Digitale',
    desc: 'Web development, design grafic, marketing digital, consultanta IT',
    icon: Globe,
    accent: 'border-indigo-500',
    bg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
  },
  {
    key: 'home',
    label: 'Home Services',
    desc: 'Instalatii, electrician, HVAC, reparatii',
    icon: Wrench,
    accent: 'border-amber-500',
    bg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  {
    key: 'it',
    label: 'IT & Electronice',
    desc: 'Reparatii telefoane, PC, laptop, electronice',
    icon: Smartphone,
    accent: 'border-green-500',
    bg: 'bg-green-50',
    iconColor: 'text-green-600',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Cat costa ForjaIt?',
    a: 'Poti incepe gratuit. Planurile cu functionalitati avansate sunt disponibile pe masura ce cresti.',
  },
  {
    q: 'Cat dureaza configurarea?',
    a: 'Sub 5 minute. Creeaza contul, adauga serviciile si esti gata sa primesti programari.',
  },
  {
    q: 'Pot folosi platforma pe telefon?',
    a: 'Da. Platforma este complet responsiva si functioneaza pe orice dispozitiv.',
  },
  {
    q: 'Clientii mei trebuie sa isi faca cont?',
    a: 'Nu obligatoriu. Pot programa direct din marketplace sau de pe site-ul tau, fara cont.',
  },
  {
    q: 'Pot sa imi conectez propriul domeniu?',
    a: 'Da. Website builder-ul suporta domenii personalizate.',
  },
  {
    q: 'Datele mele sunt in siguranta?',
    a: 'Absolut. Comunicatii criptate, GDPR compliant, backup-uri automate.',
  },
];

// ---------------------------------------------------------------------------
// Feature mock UI cards (Tailwind-only, no images)
// ---------------------------------------------------------------------------
function MockCRM() {
  return (
    <div className="rounded-xl border border-blue-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
          <Users className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <div className="text-sm font-medium text-gray-900">Andrei Popescu</div>
          <div className="text-xs text-gray-400">12 programari · 3 facturi</div>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Ultima vizita</span>
          <span className="text-gray-700">3 feb 2026</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Total</span>
          <span className="font-medium text-gray-900">1,250 RON</span>
        </div>
      </div>
    </div>
  );
}

function MockCalendar() {
  return (
    <div className="rounded-xl border border-green-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900">Februarie 2026</span>
        <Calendar className="h-4 w-4 text-green-600" />
      </div>
      <div className="space-y-1.5">
        {[
          { time: '09:00', name: 'Maria I.', status: 'Confirmat', color: 'bg-green-100 text-green-700' },
          { time: '11:30', name: 'Vlad P.', status: 'In asteptare', color: 'bg-amber-100 text-amber-700' },
          { time: '14:00', name: 'Elena R.', status: 'Confirmat', color: 'bg-green-100 text-green-700' },
        ].map((apt) => (
          <div key={apt.time} className="flex items-center justify-between text-xs">
            <span className="text-gray-500 w-10">{apt.time}</span>
            <span className="text-gray-700 flex-1">{apt.name}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${apt.color}`}>
              {apt.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockInvoice() {
  return (
    <div className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900">Factura #0042</span>
        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700">Platita</span>
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">Client</span>
          <span className="text-gray-700">Andrei P.</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Suma</span>
          <span className="font-medium text-gray-900">350 RON</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Data</span>
          <span className="text-gray-700">5 feb 2026</span>
        </div>
      </div>
    </div>
  );
}

function MockWebsite() {
  return (
    <div className="rounded-xl border border-purple-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Globe className="h-4 w-4 text-purple-600" />
        <span className="text-sm font-medium text-gray-900">autoservice.ro</span>
      </div>
      <div className="space-y-2">
        <div className="h-16 rounded-lg bg-purple-50 flex items-center justify-center text-[10px] text-purple-400 font-medium">Hero Block</div>
        <div className="grid grid-cols-3 gap-1.5">
          <div className="h-8 rounded bg-gray-50"></div>
          <div className="h-8 rounded bg-gray-50"></div>
          <div className="h-8 rounded bg-gray-50"></div>
        </div>
      </div>
    </div>
  );
}

function MockChat() {
  return (
    <div className="rounded-xl border border-pink-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-pink-600" />
        <span className="text-sm font-medium text-gray-900">Conversatie</span>
      </div>
      <div className="space-y-2">
        <div className="flex justify-end">
          <div className="rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] text-white max-w-[80%]">
            Buna, la ce ora pot veni maine?
          </div>
        </div>
        <div className="flex justify-start">
          <div className="rounded-lg bg-gray-100 px-3 py-1.5 text-[11px] text-gray-700 max-w-[80%]">
            Avem loc la 10:00 sau 14:30.
          </div>
        </div>
      </div>
    </div>
  );
}

function MockTeam() {
  return (
    <div className="rounded-xl border border-teal-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900">Echipa</span>
        <UserCog className="h-4 w-4 text-teal-600" />
      </div>
      <div className="space-y-2">
        {[
          { name: 'Alex M.', role: 'Technician', active: true },
          { name: 'Dana V.', role: 'Receptie', active: true },
          { name: 'Mihai C.', role: 'Technician', active: false },
        ].map((m) => (
          <div key={m.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${m.active ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-gray-700">{m.name}</span>
            </div>
            <span className="text-gray-400">{m.role}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const FEATURE_MOCKS = [MockCRM, MockCalendar, MockInvoice, MockWebsite, MockChat, MockTeam];

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function BusinessLanding() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollTo = (id) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ================================================================ */}
      {/* 1. STICKY HEADER                                                 */}
      {/* ================================================================ */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/business" className="text-lg font-bold tracking-tight text-gray-900">
            ForjaIt
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-8 text-sm font-medium text-gray-600 md:flex">
            <button onClick={() => scrollTo('features')} className="hover:text-gray-900 transition-colors">
              Functionalitati
            </button>
            <button onClick={() => scrollTo('sectors')} className="hover:text-gray-900 transition-colors">
              Sectoare
            </button>
            <Link to="/pricing" className="hover:text-gray-900 transition-colors">
              Preturi
            </Link>
            <button onClick={() => scrollTo('contact')} className="hover:text-gray-900 transition-colors">
              Contact
            </button>
          </nav>

          <div className="hidden items-center gap-4 md:flex">
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Autentificare
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Incearca gratuit
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden rounded-lg p-2 text-gray-600 hover:bg-gray-100"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="border-t border-gray-100 bg-white px-4 pb-4 pt-2 md:hidden">
            <nav className="flex flex-col gap-3 text-sm font-medium text-gray-600">
              <button onClick={() => scrollTo('features')} className="text-left py-2 hover:text-gray-900">
                Functionalitati
              </button>
              <button onClick={() => scrollTo('sectors')} className="text-left py-2 hover:text-gray-900">
                Sectoare
              </button>
              <Link to="/pricing" className="py-2 hover:text-gray-900" onClick={() => setMobileMenuOpen(false)}>
                Preturi
              </Link>
              <button onClick={() => scrollTo('contact')} className="text-left py-2 hover:text-gray-900">
                Contact
              </button>
              <hr className="border-gray-100" />
              <Link to="/login" className="py-2 hover:text-gray-900">
                Autentificare
              </Link>
              <Link
                to="/signup"
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white"
              >
                Incearca gratuit
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* ================================================================ */}
      {/* 2. HERO                                                          */}
      {/* ================================================================ */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:items-center">
          {/* Left – text */}
          <div>
            <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              Pentru afaceri de servicii
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-gray-900 sm:text-5xl">
              Clientii tai merita o experienta mai buna.
              <span className="block mt-1 font-semibold text-gray-400">Si tu, la fel.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-gray-500">
              ForjaIt este platforma completa care iti organizeaza programarile, clientii,
              echipa si facturile ca tu sa te concentrezi pe ceea ce faci cel mai bine.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/signup"
                className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
              >
                Incearca gratuit
              </Link>
            </div>
            <p className="mt-4 text-xs text-gray-400">
              Fara card de credit · Configurare in 5 minute · Anuleaza oricand
            </p>
          </div>

          {/* Right – card stack visual */}
          <div className="relative hidden lg:block h-[380px]">
            {/* Notification card */}
            <div className="absolute left-0 top-0 w-64 rounded-xl border border-gray-200 bg-white p-4 shadow-lg -rotate-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                  <Bell className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-900">Programare noua</div>
                  <div className="text-[10px] text-gray-400">Acum 2 minute</div>
                </div>
              </div>
              <p className="text-[11px] text-gray-500">Maria I. a programat o vizita pentru maine la 10:00.</p>
            </div>

            {/* Calendar mini-preview */}
            <div className="absolute left-32 top-24 w-56 rounded-xl border border-gray-200 bg-white p-4 shadow-lg rotate-2">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-900">Azi - 9 feb</span>
                <CalendarCheck className="h-4 w-4 text-blue-600" />
              </div>
              <div className="space-y-1.5">
                {['09:00 - Andrei P.', '11:30 - Elena R.', '14:00 - Vlad M.'].map((line) => (
                  <div key={line} className="flex items-center gap-2 text-[11px]">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                    <span className="text-gray-600">{line}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Message preview */}
            <div className="absolute right-0 top-48 w-60 rounded-xl border border-gray-200 bg-white p-4 shadow-lg -rotate-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Mail className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-900">Mesaj nou</div>
                  <div className="text-[10px] text-gray-400">Vlad M.</div>
                </div>
              </div>
              <p className="text-[11px] text-gray-500">
                Buna ziua, am o intrebare legata de factura din ianuarie.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 3. PROBLEM AGITATION — "Suna cunoscut?"                          */}
      {/* ================================================================ */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Suna cunoscut?</h2>
          <div className="mt-10 space-y-6">
            {PAIN_POINTS.map((p) => (
              <div
                key={p.title}
                className="rounded-lg border-l-4 border-amber-400 bg-white py-5 pl-6 pr-5 shadow-sm"
              >
                <h3 className="text-base font-bold text-gray-900">{p.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 4. SOLUTION PIVOT                                                */}
      {/* ================================================================ */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Cu Forja, lucrurile stau altfel.
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {SOLUTIONS.map((s) => (
              <div key={s.num} className="relative">
                <span className="text-5xl font-extrabold text-blue-100">{s.num}</span>
                <h3 className="mt-2 text-lg font-bold text-gray-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 5. FEATURES DEEP DIVE — "Ce primesti"                            */}
      {/* ================================================================ */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Ce primesti</h2>
          <div className="mt-16 space-y-24">
            {FEATURES.map((feat, i) => {
              const Mock = FEATURE_MOCKS[i];
              const reversed = i % 2 === 1;
              return (
                <div
                  key={feat.pill}
                  className={`flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-16 ${reversed ? 'lg:flex-row-reverse' : ''}`}
                >
                  {/* Text */}
                  <div className="flex-1">
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${feat.pillColor}`}>
                      {feat.pill}
                    </span>
                    <h3 className="mt-4 text-2xl font-bold text-gray-900">{feat.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-gray-600">{feat.desc}</p>
                    <ul className="mt-5 space-y-2.5">
                      {feat.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2 text-sm text-gray-700">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* Mock card */}
                  <div className="flex-1 flex justify-center">
                    <div className="w-full max-w-xs">
                      <Mock />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 6. SECTORS — "Construit pentru industria ta"                      */}
      {/* ================================================================ */}
      <section id="sectors" className="bg-gray-50 py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Construit pentru industria ta
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Solutii adaptate pe domeniu, nu o platforma generica.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {SECTORS.map((s) => (
              <div
                key={s.key}
                className={`rounded-xl border-t-4 ${s.accent} bg-white p-5 shadow-sm`}
              >
                <div className={`h-10 w-10 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
                  <s.icon className={`h-5 w-5 ${s.iconColor}`} />
                </div>
                <h3 className="text-base font-bold text-gray-900">{s.label}</h3>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 7. CLIENT PORTAL PREVIEW                                         */}
      {/* ================================================================ */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Si clientii tai primesc propriul portal
          </h2>
          <p className="mt-3 text-sm text-gray-500 max-w-xl mx-auto">
            Fiecare client isi poate gestiona programarile, facturile si comunicarea direct din contul sau.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {[
              { label: 'Programari online', icon: CalendarCheck },
              { label: 'Facturi', icon: Receipt },
              { label: 'Mesaje', icon: MessageCircle },
            ].map((pill) => (
              <span
                key={pill.label}
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700"
              >
                <pill.icon className="h-3.5 w-3.5" />
                {pill.label}
              </span>
            ))}
          </div>

          {/* Browser frame mock */}
          <div className="mt-10 mx-auto max-w-lg">
            <div className="rounded-t-xl border border-b-0 border-gray-200 bg-gray-50 px-4 py-2 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-300" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-300" />
              </div>
              <div className="flex-1 rounded bg-white border border-gray-200 px-3 py-1 text-[10px] text-gray-400 text-center">
                portal.forja.ro
              </div>
            </div>
            <div className="rounded-b-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-gray-900">Programarile mele</span>
                <span className="text-[10px] text-gray-400">3 active</span>
              </div>
              <div className="space-y-2.5">
                {[
                  { service: 'Schimb ulei', date: '10 feb, 09:00', status: 'Confirmat', color: 'bg-green-100 text-green-700' },
                  { service: 'Revizie AC', date: '14 feb, 14:00', status: 'In asteptare', color: 'bg-amber-100 text-amber-700' },
                  { service: 'Geometrie', date: '18 feb, 11:30', status: 'Confirmat', color: 'bg-green-100 text-green-700' },
                ].map((apt) => (
                  <div key={apt.service} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5">
                    <div>
                      <div className="text-xs font-medium text-gray-900">{apt.service}</div>
                      <div className="text-[10px] text-gray-400">{apt.date}</div>
                    </div>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${apt.color}`}>
                      {apt.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 9. FAQ                                                           */}
      {/* ================================================================ */}
      <section className="py-20">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Intrebari frecvente</h2>
          <div className="mt-10">
            {FAQ_ITEMS.map((item) => (
              <FAQItem key={item.q} question={item.q} answer={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 10. FINAL CTA                                                    */}
      {/* ================================================================ */}
      <section id="contact" className="border-t border-gray-100 py-20">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Gata sa incerci?</h2>
          <p className="mt-3 text-sm text-gray-500">
            Creeaza contul in 30 de secunde. Fara card, fara obligatii.
          </p>
          <Link
            to="/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            Incearca gratuit <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-4 text-xs text-gray-400">
            Ai intrebari? Scrie-ne la contact@forja.ro
          </p>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 11. FOOTER                                                       */}
      {/* ================================================================ */}
      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-3">
            {/* Col 1 */}
            <div>
              <span className="text-base font-bold text-gray-900">Forja</span>
              <p className="mt-2 text-xs leading-relaxed text-gray-500">
                Platforma completa de management pentru afaceri de servicii. CRM, programari, facturare, website si comunicare totul intr-un singur loc.
              </p>
            </div>
            {/* Col 2 */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Produs
              </h4>
              <ul className="mt-3 space-y-2 text-sm text-gray-600">
                <li>
                  <button onClick={() => scrollTo('features')} className="hover:text-gray-900 transition-colors">
                    Functionalitati
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollTo('sectors')} className="hover:text-gray-900 transition-colors">
                    Sectoare
                  </button>
                </li>
                <li>
                  <Link to="/pricing" className="hover:text-gray-900 transition-colors">
                    Preturi
                  </Link>
                </li>
              </ul>
            </div>
            {/* Col 3 */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Legal
              </h4>
              <ul className="mt-3 space-y-2 text-sm text-gray-600">
                <li>
                  <Link to="/terms" className="hover:text-gray-900 transition-colors">
                    Termeni si Conditii
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="hover:text-gray-900 transition-colors">
                    Confidentialitate
                  </Link>
                </li>
                <li>
                  <button onClick={() => scrollTo('contact')} className="hover:text-gray-900 transition-colors">
                    Contact
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-gray-200 pt-6 text-center text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Forja. Toate drepturile rezervate.
          </div>
        </div>
      </footer>
    </div>
  );
}
