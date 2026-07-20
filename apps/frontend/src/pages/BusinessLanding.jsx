import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  Check,
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
  Shield,
  Zap,
  Bell,
  Mail,
  BarChart3,
  Sparkles,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { CLIENT_PORTAL_URL } from '../config/urls';
import { runtimeConfig } from '../config/runtime';
import PublicHeader from '../components/landing/PublicHeader';
import PublicFooter from '../components/landing/PublicFooter';
import SectionHeading from '../components/landing/SectionHeading';
import AnimatedSection, {
  StaggerContainer,
  StaggerItem,
} from '../components/landing/AnimatedSection';
import FAQAccordion from '../components/landing/FAQAccordion';
import GridBackground from '../components/landing/GridBackground';
import ContactForm from '../components/landing/ContactForm';
import SEOHead from '../components/landing/SEOHead';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const FEATURES = [
  {
    pill: 'CRM',
    title: 'Stii totul despre fiecare client',
    desc: 'Cand a venit ultima data, ce a platit, ce i-ai spus. Fara sa cauti in mesaje sau pe hartii.',
    bullets: [
      'Profil client cu istoric complet',
      'Import rapid din Excel sau CSV',
      'Cautare si filtrare in 2 secunde',
      'Note si etichete personalizate',
    ],
    icon: Users,
  },
  {
    pill: 'Programari',
    title: 'Clientii se programeaza singuri, 24/7',
    desc: 'Calendar inteligent pe locatii si angajati. Clientul alege ora, primeste confirmare, tu primesti notificare. Zero telefoane.',
    bullets: [
      'Portal de programari non-stop',
      'Calendar multi-locatie si multi-angajat',
      'Remindere automate (SMS + email)',
      'Statusuri: confirmat, in lucru, finalizat',
    ],
    icon: Calendar,
  },
  {
    pill: 'Facturare',
    title: 'Factura gata in 3 secunde',
    desc: 'Se genereaza direct din programare cu datele clientului completate. O trimiti, o urmaresti, o incasezi - din acelasi ecran.',
    bullets: [
      'Un click: programare → factura',
      'Tracking plati si restante',
      'Reminder automat daca nu plateste',
      'Export pentru contabilitate',
    ],
    icon: FileText,
  },
  {
    pill: 'Website',
    title: 'Site profesional, fara developer',
    desc: 'Drag & drop. Alegi template-ul, schimbi textele, publici. In sub o ora ai un site mai bun decat 90% din competitie.',
    bullets: [
      'Template-uri testate pe industrie',
      'Blocuri: hero, servicii, echipa, galerie, FAQ',
      'SEO optimizat automat',
      'Formular de contact integrat cu CRM-ul',
    ],
    icon: Globe,
  },
  {
    pill: 'Comunicare',
    title: 'Vorbesti cu clientii fara WhatsApp',
    desc: 'Chat integrat in portal. Clientul iti scrie, tu primesti notificare instant. Totul salvat, nimic pierdut.',
    bullets: [
      'Chat in-app cu clientii',
      'Push notifications in timp real',
      'Trimite mesaje, poze, documente',
      'Istoric complet al conversatiilor',
    ],
    icon: MessageCircle,
  },
  {
    pill: 'Echipa',
    title: 'Echipa stie ce are de facut',
    desc: 'Task-uri, pontaj, concedii, roluri - nu mai pierzi 30 de minute pe zi cu "cine face ce azi?".',
    bullets: [
      'Angajati cu roluri si permisiuni',
      'Task-uri si to-do-uri zilnice',
      'Time tracking per proiect',
      'Cereri de concediu cu aprobare',
    ],
    icon: UserCog,
  },
];

const SECTORS = [
  {
    key: 'auto',
    label: 'Auto',
    desc: 'Service, ITP, vulcanizare, detailing, spalatorie',
    icon: Car,
  },
  {
    key: 'beauty',
    label: 'Beauty & Wellness',
    desc: 'Salon, frizerie, cosmetica, manichiura, spa',
    icon: Scissors,
  },
  {
    key: 'digital',
    label: 'Servicii Digitale',
    desc: 'Agentii web, design, marketing, consultanta',
    icon: Globe,
  },
  {
    key: 'home',
    label: 'Home Services',
    desc: 'Instalatii, electrician, HVAC, curatenie',
    icon: Wrench,
  },
  {
    key: 'it',
    label: 'IT & Electronice',
    desc: 'Reparatii telefoane, PC, laptop, GSM',
    icon: Smartphone,
  },
];

const FAQ_ITEMS = [
  {
    q: 'Cat costa si merita investitia?',
    a: 'Starter: 99 RON/luna (5 utilizatori). Professional: 249 RON/luna (15 utilizatori). Enterprise: 399 RON/luna (nelimitat). E mai putin decat costul unui singur client pierdut pe luna. Toate planurile includ 14 zile gratuit, fara card.',
  },
  {
    q: 'Cat dureaza pana sunt operational?',
    a: 'Sub 5 minute. Parcurgi un wizard rapid: datele firmei (cu verificare CUI automata), locatia, serviciile - si esti gata sa primesti programari. Nu ai nevoie de cunostinte tehnice.',
  },
  {
    q: 'Pot folosi platforma de pe telefon?',
    a: 'Da, 100%. Interfata e construita mobile-first. Primesti notificari push pentru programari noi, mesaje si plati - exact ca un mesaj pe WhatsApp, dar organizat.',
  },
  {
    q: 'Clientii mei trebuie sa isi faca cont?',
    a: 'Nu. Pot programa direct din marketplace sau de pe site-ul tau, fara cont. Optional, isi pot crea un cont gratuit pentru a-si vedea istoricul si a comunica direct cu tine.',
  },
  {
    q: 'Nu am site. Asta e o problema?',
    a: 'Nu. Platforma include un website builder drag & drop. Alegi un template pentru industria ta, schimbi textele si publici, fara sa modifici codul aplicatiei.',
  },
  {
    q: 'Daca nu imi place, pot anula?',
    a: 'Oricand, dintr-un singur click din setari. Fara contracte, fara penalizari, fara intrebari. Exporti datele tale si gata.',
  },
  {
    q: 'Ce tipuri de afaceri functioneaza cel mai bine?',
    a: 'Orice afacere bazata pe programari si servicii: service auto, saloane, ateliere reparatii, agentii digitale, servicii la domiciliu. Platforma se adapteaza automat pe domeniu - terminologie, fluxuri, template-uri.',
  },
  {
    q: 'Datele clientilor mei sunt in siguranta?',
    a: 'Platforma include parole hashuite, 2FA optionala, protectie CSRF, control al accesului si exporturi. Operatorul instalarii ramane responsabil pentru HTTPS, backup, gazduire, actualizari si obligatiile sale privind protectia datelor.',
  },
];

// ---------------------------------------------------------------------------
// Mock UI cards for feature section
// ---------------------------------------------------------------------------
function MockCRM() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-lg shadow-gray-200/50">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">Andrei Popescu</div>
          <div className="text-xs text-gray-400">12 programari · 3 facturi</div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Ultima vizita</span>
          <span className="text-gray-700 font-medium">3 feb 2026</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Total incasat</span>
          <span className="font-semibold text-gray-900">1,250 RON</span>
        </div>
      </div>
    </div>
  );
}
function MockCalendar() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-lg shadow-gray-200/50">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-900">Februarie 2026</span>
        <Calendar className="h-4 w-4 text-primary" />
      </div>
      <div className="space-y-2">
        {[
          {
            time: '09:00',
            name: 'Maria I.',
            status: 'Confirmat',
            color: 'bg-emerald-50 text-emerald-700',
          },
          {
            time: '11:30',
            name: 'Vlad P.',
            status: 'In asteptare',
            color: 'bg-amber-50 text-amber-700',
          },
          {
            time: '14:00',
            name: 'Elena R.',
            status: 'Confirmat',
            color: 'bg-emerald-50 text-emerald-700',
          },
        ].map((apt) => (
          <div key={apt.time} className="flex items-center justify-between text-xs">
            <span className="text-gray-400 w-12 font-medium">{apt.time}</span>
            <span className="text-gray-700 flex-1">{apt.name}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${apt.color}`}>
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
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-lg shadow-gray-200/50">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-900">Factura #0042</span>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
          Platita
        </span>
      </div>
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">Client</span>
          <span className="text-gray-700">Andrei P.</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Suma</span>
          <span className="font-semibold text-gray-900">350 RON</span>
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
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-lg shadow-gray-200/50">
      <div className="mb-4 flex items-center gap-2">
        <Globe className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-gray-900">autoservice.ro</span>
      </div>
      <div className="space-y-2">
        <div className="h-16 rounded-xl bg-primary-50 flex items-center justify-center text-[10px] text-primary/60 font-semibold">
          Hero Block
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <div className="h-8 rounded-lg bg-gray-50" />
          <div className="h-8 rounded-lg bg-gray-50" />
          <div className="h-8 rounded-lg bg-gray-50" />
        </div>
      </div>
    </div>
  );
}
function MockChat() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-lg shadow-gray-200/50">
      <div className="mb-4 flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-gray-900">Conversatie</span>
      </div>
      <div className="space-y-2.5">
        <div className="flex justify-end">
          <div className="rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-[11px] text-white max-w-[80%]">
            Buna, la ce ora pot veni maine?
          </div>
        </div>
        <div className="flex justify-start">
          <div className="rounded-2xl rounded-bl-md bg-gray-100 px-3.5 py-2 text-[11px] text-gray-700 max-w-[80%]">
            Avem loc la 10:00 sau 14:30.
          </div>
        </div>
      </div>
    </div>
  );
}
function MockTeam() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-lg shadow-gray-200/50">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-900">Echipa</span>
        <UserCog className="h-4 w-4 text-primary" />
      </div>
      <div className="space-y-2.5">
        {[
          { name: 'Alex M.', role: 'Technician', active: true },
          { name: 'Dana V.', role: 'Receptie', active: true },
          { name: 'Mihai C.', role: 'Technician', active: false },
        ].map((m) => (
          <div key={m.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div
                className={`h-2 w-2 rounded-full ${m.active ? 'bg-emerald-500' : 'bg-gray-300'}`}
              />
              <span className="text-gray-700 font-medium">{m.name}</span>
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
  const location = useLocation();
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  // Handle hash-based scroll when navigating from another page (e.g. /pricing -> /#features)
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [location.hash]);

  const seoSchema = [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: runtimeConfig.platformName,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description:
        'Platforma de management pentru afaceri de servicii din Romania - programari online, CRM, facturare, website builder si portal clienti.',
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'RON',
        lowPrice: '0',
        highPrice: '499',
        offerCount: '4',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ_ITEMS.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <SEOHead
        title={`${runtimeConfig.platformName} - Clientii se programeaza singuri | Programari, CRM, Facturare`}
        description="O singura platforma care inlocuieste agenda, Excel-ul si WhatsApp-ul. Programari online, CRM, facturare, website builder si portal clienti. 14 zile gratuit."
        canonical={`${runtimeConfig.platformUrl}/`}
        og={{
          title: `${runtimeConfig.platformName} - Clientii se programeaza singuri. Tu te ocupi de business.`,
          description:
            'Programari online, CRM, facturare si website - o singura platforma pentru afaceri de servicii. 14 zile gratuit.',
          url: `${runtimeConfig.platformUrl}/`,
        }}
        schema={seoSchema}
      />
      <PublicHeader />

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative bg-slate-950 text-white overflow-hidden">
        <GridBackground />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-36">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.08] border border-white/10 text-xs font-medium text-slate-300 mb-8">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                Construit pentru service-uri, saloane si ateliere din Romania
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight leading-[1.1]">
                Clientii se programeaza singuri.
                <span className="block mt-2 bg-gradient-to-r from-primary-400 to-accent bg-clip-text text-transparent">
                  Tu te ocupi de business.
                </span>
              </h1>
              <p className="mt-6 text-lg text-slate-400 leading-relaxed max-w-lg">
                O singura platforma care iti inlocuieste agenda, Excel-ul, WhatsApp-ul si facturile
                de mana si iti economiseste 10+ ore pe saptamana.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-semibold text-white hover:bg-primary-500 transition-all shadow-lg shadow-primary/30"
                >
                  Activeaza cont gratuit <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/pricing"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-medium text-slate-300 hover:bg-white/10 transition-colors"
                >
                  Vezi preturile
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  14 zile gratuit, fara card
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  Gata in 5 minute
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  Fara contract pe termen lung
                </span>
              </div>
            </motion.div>

            {/* Floating cards */}
            <motion.div
              className="relative hidden lg:block h-[400px]"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            >
              <motion.div
                className="absolute left-0 top-0 w-64"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-md p-4 shadow-2xl -rotate-3">
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className="h-9 w-9 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Bell className="h-4 w-4 text-primary-400" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">Programare noua</div>
                      <div className="text-[10px] text-slate-500">Acum 2 minute</div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Maria I. a programat o vizita pentru maine la 10:00.
                  </p>
                </div>
              </motion.div>
              <motion.div
                className="absolute left-28 top-28 w-56"
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              >
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-md p-4 shadow-2xl rotate-2">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-white">Azi - 9 feb</span>
                    <CalendarCheck className="h-4 w-4 text-primary-400" />
                  </div>
                  <div className="space-y-1.5">
                    {['09:00 - Andrei P.', '11:30 - Elena R.', '14:00 - Vlad M.'].map((line) => (
                      <div key={line} className="flex items-center gap-2 text-[11px]">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary-400" />
                        <span className="text-slate-400">{line}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
              <motion.div
                className="absolute right-0 top-52 w-60"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              >
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-md p-4 shadow-2xl -rotate-1">
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className="h-9 w-9 rounded-xl bg-accent/20 flex items-center justify-center">
                      <Mail className="h-4 w-4 text-accent-400" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">Mesaj nou</div>
                      <div className="text-[10px] text-slate-500">Vlad M.</div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Buna ziua, am o intrebare legata de factura din ianuarie.
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Trust strip ────────────────────────────────────────── */}
      <section className="border-b border-gray-100 py-5 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-gray-500">
            {[
              { icon: Zap, text: 'Operational din prima zi' },
              { icon: Shield, text: 'Controale de acces si 2FA optionala' },
              { icon: MessageCircle, text: 'Canale de suport configurabile' },
              { icon: TrendingUp, text: 'Inlocuieste 5 unelte separate' },
            ].map((item) => (
              <span key={item.text} className="flex items-center gap-2">
                <item.icon className="h-4 w-4 text-primary" />
                {item.text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Problem ────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <SectionHeading
              label="Te recunosti?"
              title="Asa pierzi bani in fiecare saptamana."
              subtitle="Fiecare client ratat, fiecare factura intarziata, fiecare programare pierduta te costa. Iata cum:"
            />
          </AnimatedSection>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6" stagger={0.1}>
            {[
              {
                title: 'Telefonul suna. Tu esti sub masina.',
                text: 'Clientul suna la 8 dimineata pentru o programare. Tu esti deja la un client. La 12, cand revii, a sunat concurenta. Asta se intampla de 3-4 ori pe zi.',
                icon: Clock,
              },
              {
                title: 'Programarile sunt pe WhatsApp si pe hartie.',
                text: 'Confuzia nu e o strategie. Un client uitat = o recenzie de 1 stea si 200+ RON pierduti. In fiecare luna.',
                icon: MessageCircle,
              },
              {
                title: 'Facturile se trimit cand iti aduci aminte.',
                text: 'Si cand iti aduci aminte, clientul a uitat deja. Media de intarziere la plata: 47 de zile. Cu automatizare: sub 7.',
                icon: FileText,
              },
            ].map((p) => (
              <StaggerItem key={p.title}>
                <div className="group rounded-2xl border border-gray-200 bg-white p-7 hover:border-red-200 hover:shadow-lg hover:shadow-red-50 transition-all h-full">
                  <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center mb-4 group-hover:bg-red-100 transition-colors">
                    <p.icon className="h-5 w-5 text-red-500" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{p.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">{p.text}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ── Solution ───────────────────────────────────────────── */}
      <section className="py-24 lg:py-32 bg-gray-50/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <SectionHeading
              label="Dupa prima saptamana"
              title={`Asa arata afacerea ta cu ${runtimeConfig.platformName}.`}
            />
          </AnimatedSection>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8" stagger={0.1}>
            {[
              {
                num: '01',
                title: 'Clientii se programeaza la 2 noaptea.',
                text: 'Portal de programari online, disponibil 24/7. Clientul alege singur ora, primeste confirmare instant. Tu nu ridici telefonul.',
                icon: CalendarCheck,
              },
              {
                num: '02',
                title: 'Un singur ecran, nu 5 aplicatii.',
                text: 'Clienti, programari, facturi, mesaje, echipa - totul in acelasi dashboard. Deschizi o singura aplicatie dimineata.',
                icon: BarChart3,
              },
              {
                num: '03',
                title: 'Cresti fara angajat in plus.',
                text: `Notificari automate, remindere pre-programare, facturi generate la un click. Ce facea un receptioner, acum face ${runtimeConfig.platformName}.`,
                icon: TrendingUp,
              },
            ].map((s) => (
              <StaggerItem key={s.num}>
                <div className="group bg-white rounded-2xl border border-gray-200 p-7 hover:border-primary-200 hover:shadow-lg hover:shadow-primary-50 transition-all h-full">
                  <div className="flex items-center gap-3 mb-5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-sm font-extrabold text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      {s.num}
                    </span>
                    <s.icon className="h-5 w-5 text-primary/40" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{s.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">{s.text}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
          <AnimatedSection className="mt-12 text-center" delay={0.3}>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors shadow-sm shadow-primary/25"
            >
              Vreau sa incerc gratuit <ArrowRight className="h-4 w-4" />
            </Link>
          </AnimatedSection>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section id="features" className="py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <SectionHeading
              label="Ce primesti concret"
              title="6 unelte. 1 platforma. 0 batai de cap."
              subtitle="Fiecare modul este gandit sa iti reduca munca manuala si sa iti creasca numarul de clienti."
            />
          </AnimatedSection>
          <div className="space-y-28">
            {FEATURES.map((feat, i) => {
              const Mock = FEATURE_MOCKS[i];
              const reversed = i % 2 === 1;
              return (
                <AnimatedSection key={feat.pill}>
                  <div
                    className={`flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-20 ${reversed ? 'lg:flex-row-reverse' : ''}`}
                  >
                    <div className="flex-1">
                      <span className="inline-block rounded-lg border border-primary-100 bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 mb-4">
                        {feat.pill}
                      </span>
                      <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                        {feat.title}
                      </h3>
                      <p className="mt-4 text-base leading-relaxed text-gray-600">{feat.desc}</p>
                      <ul className="mt-6 space-y-3">
                        {feat.bullets.map((b) => (
                          <li key={b} className="flex items-start gap-2.5 text-sm text-gray-700">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex-1 flex justify-center">
                      <div className="w-full max-w-sm">
                        <Mock />
                      </div>
                    </div>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Sectors ────────────────────────────────────────────── */}
      <section id="sectors" className="py-24 lg:py-32 bg-gray-50/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <SectionHeading
              label="Domenii"
              title="Nu e o platforma generica. E construita pe industria ta."
              subtitle="Terminologia, fluxurile si template-urile se adapteaza automat cand iti alegi domeniul."
            />
          </AnimatedSection>
          <StaggerContainer
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5"
            stagger={0.06}
          >
            {SECTORS.map((s) => (
              <StaggerItem key={s.key}>
                <div className="group rounded-2xl border border-gray-200 bg-white p-6 hover:border-primary-200 hover:shadow-lg hover:shadow-primary-50 transition-all h-full">
                  <div className="h-11 w-11 rounded-xl bg-primary-50 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:scale-105 transition-all">
                    <s.icon className="h-5 w-5 text-primary group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">{s.label}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{s.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ── Client Portal Preview ──────────────────────────────── */}
      <section className="py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <SectionHeading
              center
              label="Portal clienti inclus"
              title="Clientii tai nu te mai suna. Se descurca singuri."
              subtitle="Fiecare client primeste un portal unde isi vede programarile, facturile si iti trimite mesaje - fara sa te deranjeze."
            />
            <div className="flex flex-wrap justify-center gap-2 -mt-8 mb-10">
              {[
                { label: 'Programari online', icon: CalendarCheck },
                { label: 'Facturi', icon: Receipt },
                { label: 'Mesaje', icon: MessageCircle },
              ].map((pill) => (
                <span
                  key={pill.label}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary-100 bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700"
                >
                  <pill.icon className="h-3.5 w-3.5" />
                  {pill.label}
                </span>
              ))}
            </div>
          </AnimatedSection>
          <AnimatedSection delay={0.15}>
            <div className="mx-auto max-w-lg">
              <div className="rounded-t-2xl border border-b-0 border-gray-200 bg-gray-50/80 px-4 py-2.5 flex items-center gap-2.5">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-300" />
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                </div>
                <div className="flex-1 rounded-lg bg-white border border-gray-200 px-3 py-1 text-[10px] text-gray-400 text-center font-medium">
                  {CLIENT_PORTAL_URL.replace(/^https?:\/\//, '')}
                </div>
              </div>
              <div className="rounded-b-2xl border border-gray-200 bg-white p-6">
                <div className="flex items-center justify-between mb-5">
                  <span className="text-sm font-semibold text-gray-900">Programarile mele</span>
                  <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                    3 active
                  </span>
                </div>
                <div className="space-y-3">
                  {[
                    {
                      service: 'Schimb ulei',
                      date: '10 feb, 09:00',
                      status: 'Confirmat',
                      color: 'bg-emerald-50 text-emerald-700',
                    },
                    {
                      service: 'Revizie AC',
                      date: '14 feb, 14:00',
                      status: 'In asteptare',
                      color: 'bg-amber-50 text-amber-700',
                    },
                    {
                      service: 'Geometrie',
                      date: '18 feb, 11:30',
                      status: 'Confirmat',
                      color: 'bg-emerald-50 text-emerald-700',
                    },
                  ].map((apt) => (
                    <div
                      key={apt.service}
                      className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 hover:bg-gray-50/50 transition-colors"
                    >
                      <div>
                        <div className="text-xs font-medium text-gray-900">{apt.service}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{apt.date}</div>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${apt.color}`}
                      >
                        {apt.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── Pricing Teaser ─────────────────────────────────────── */}
      <section className="py-24 lg:py-32 bg-gray-50/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <SectionHeading
              center
              label="Preturi transparente"
              title="Costa mai putin decat o zi de munca pierduta."
              subtitle="Alege planul care se potriveste. Schimba sau anuleaza oricand - fara contracte, fara penalizari."
            />
          </AnimatedSection>
          <StaggerContainer
            className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto"
            stagger={0.1}
          >
            {[
              {
                name: 'Starter',
                price: '99',
                desc: '5 utilizatori · 500 clienti',
                highlight: false,
              },
              {
                name: 'Profesional',
                price: '249',
                desc: '15 utilizatori · 2,000 clienti',
                highlight: true,
              },
              { name: 'Enterprise', price: '499', desc: 'Resurse nelimitate', highlight: false },
            ].map((plan) => (
              <StaggerItem key={plan.name}>
                <div
                  className={`rounded-2xl border p-7 text-center transition-all ${plan.highlight ? 'border-primary bg-white shadow-xl shadow-primary/10 ring-1 ring-primary' : 'border-gray-200 bg-white hover:shadow-lg'}`}
                >
                  {plan.highlight && (
                    <span className="inline-block rounded-full bg-primary px-3 py-1 text-[10px] font-semibold text-white mb-4">
                      Popular
                    </span>
                  )}
                  <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                  <div className="mt-3 flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
                    <span className="text-sm text-gray-500">RON/luna</span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">{plan.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
          <AnimatedSection className="mt-10 text-center" delay={0.3}>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-700 transition-colors"
            >
              Vezi toate planurile si functiile incluse <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-3 text-xs text-gray-400">
              14 zile gratuit pe orice plan. Fara card de credit.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <SectionHeading label="FAQ" title="Intrebari frecvente" />
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <FAQAccordion items={FAQ_ITEMS} />
          </AnimatedSection>
        </div>
      </section>

      {/* ── CTA Banner ─────────────────────────────────────────── */}
      <section className="relative bg-primary overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-24 text-center">
          <AnimatedSection>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Incepe in 5 minute. Rezultate din prima zi.
            </h2>
            <p className="mt-4 text-primary-100 text-lg max-w-lg mx-auto">
              Creezi contul, adaugi serviciile, si clientii se pot programa imediat. Fara
              configurari complicate.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-primary hover:bg-primary-50 transition-colors shadow-lg"
              >
                Activeaza contul gratuit <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                onClick={() => scrollTo('contact')}
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-medium text-white hover:bg-white/20 transition-colors"
              >
                Vreau o demonstratie
              </button>
            </div>
            <p className="mt-5 text-sm text-primary-200">
              14 zile gratuit · Fara card de credit · Anuleaza oricand
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* ── Contact ────────────────────────────────────────────── */}
      <section id="contact" className="py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">
            <AnimatedSection className="flex flex-col justify-center">
              <SectionHeading
                label="Vorbeste cu noi"
                title="Ai intrebari? Iti raspundem in ore, nu in zile."
                subtitle="Scrie-ne orice nelamurire. Sau daca preferi, activeaza direct contul si testeaza singur - ai 14 zile gratuit."
              />
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-700 transition-colors shadow-sm shadow-primary/25 self-start"
              >
                Incearca gratuit <ArrowRight className="h-4 w-4" />
              </Link>
            </AnimatedSection>
            <AnimatedSection delay={0.15}>
              <ContactForm />
            </AnimatedSection>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
