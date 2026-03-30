import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  MessageCircle,
  FileText,
  Search,
  CalendarCheck,
  CheckCircle,
  ArrowRight,
  Users,
  BarChart3,
  Globe,
  MapPin,
  Zap,
  Clock,
  Shield,
  Sparkles,
  Check,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useMarketplaceStats } from '@/hooks/useMarketplace';
import { FRONTEND_URL } from '@/config/urls';
import Logo from '@/components/landing/Logo';
import GridBackground from '@/components/landing/GridBackground';
import SectionHeading from '@/components/landing/SectionHeading';
import AnimatedSection, { StaggerContainer, StaggerItem } from '@/components/landing/AnimatedSection';
import SEOHead from '@/components/landing/SEOHead';

// ---------------------------------------------------------------------------
// Animated counter (scroll-triggered)
// ---------------------------------------------------------------------------
function AnimatedCounter({ target, duration = 2000 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!target || hasAnimated.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const start = performance.now();
          const animate = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{count}</span>;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const benefits = [
  {
    icon: Calendar,
    title: 'Programeaza-te oricand, de oriunde',
    description: 'E ora 11 noaptea si vrei programare maine? Deschizi portalul, alegi ora libera, gata. Fara sa suni pe nimeni.',
  },
  {
    icon: MessageCircle,
    title: 'Vorbeste direct cu furnizorul',
    description: 'Ai o intrebare despre pret sau durata? Scrii in chat, primesti raspuns. Totul salvat intr-un singur loc.',
  },
  {
    icon: FileText,
    title: 'Facturile tale, mereu la indemana',
    description: 'Nu mai cauti prin email. Toate facturile si platile tale sunt organizate cronologic. Stii exact ce ai platit si ce ai de plata.',
  },
  {
    icon: Search,
    title: 'Gaseste servicii noi in zona ta',
    description: 'Cauti un service auto sau un electrician? Marketplace-ul iti arata furnizori verificati, cu recenzii si preturi.',
  },
];

const steps = [
  {
    icon: Search,
    title: 'Cauta',
    description: 'Deschizi marketplace-ul, filtrezi dupa categorie si oras. In 10 secunde ai lista de furnizori.',
  },
  {
    icon: CalendarCheck,
    title: 'Programeaza',
    description: 'Vezi orele libere, alegi ce ti se potriveste, confirmi. Primesti confirmare instant pe email.',
  },
  {
    icon: CheckCircle,
    title: 'Gata. Totul e organizat.',
    description: 'Programarea, factura, comunicarea - totul apare automat in portalul tau. Zero efort din partea ta.',
  },
];

const businessFeatures = [
  { icon: Users, text: 'CRM cu profil complet per client' },
  { icon: Calendar, text: 'Programari online 24/7' },
  { icon: FileText, text: 'Facturi generate automat' },
  { icon: BarChart3, text: 'Dashboard cu statistici live' },
  { icon: Globe, text: 'Website builder drag & drop' },
  { icon: MessageCircle, text: 'Chat direct cu clientii' },
];

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function Landing() {
  const { data: statsData } = useMarketplaceStats();
  const stats = statsData?.data || {};
  const hasStats = stats.organizationCount > 0 || stats.serviceCount > 0 || stats.cityCount > 0;

  const seoSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'ForjaIt Portal',
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Web',
    description: 'Portal de programari online - gaseste furnizori de servicii, programeaza in 30 de secunde si gestioneaza totul dintr-un singur loc.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'RON', description: 'Gratuit pentru clienti' },
  };

  return (
    <div className="min-h-screen bg-white">
      <SEOHead
        title="ForjaIt - Programeaza-te online in 30 de secunde | Fara telefon"
        description="Gaseste furnizori de servicii, programeaza online si tine evidenta programarilor si facturilor intr-un singur loc. 100% gratuit."
        canonical="https://portal.forja.it.com/"
        og={{
          title: 'ForjaIt - Programeaza-te in 30 de secunde, fara telefon',
          description: 'Alegi serviciul, alegi ora, confirmi. Programari, facturi si comunicare - totul intr-un singur portal gratuit.',
          url: 'https://portal.forja.it.com/',
        }}
        schema={seoSchema}
      />

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="shrink-0">
              <Logo className="text-xl text-gray-900" />
            </Link>
            <div className="flex items-center gap-3">
              <Link to="/marketplace" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                Marketplace
              </Link>
              <Link to="/login" className="text-sm font-semibold text-white bg-primary hover:bg-primary-700 px-5 py-2.5 rounded-xl transition-colors shadow-sm shadow-primary/25">
                Autentificare
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ── Section 1: Hero ─────────────────────────────────────── */}
      <section className="bg-slate-950 text-white relative overflow-hidden">
        <GridBackground />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-32 sm:pt-32 sm:pb-40 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.08] border border-white/10 text-xs font-medium text-slate-300 mb-8">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Fara telefon, fara asteptare, fara hartii
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05]">
              Programeaza-te
              <br />
              <span className="bg-gradient-to-r from-primary-400 to-accent bg-clip-text text-transparent">in 30 de secunde.</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Alegi serviciul, alegi ora, confirmi. Fara sa suni, fara sa astepti. Totul programari, facturi, mesaje intr-un singur loc.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/marketplace"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-500 transition-all text-sm shadow-lg shadow-primary/30"
              >
                Gaseste si programeaza
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-medium text-slate-300 bg-white/[0.06] hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
              >
                Ai deja cont? Autentifica-te
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" />100% gratuit pentru tine</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" />Fara cont obligatoriu</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" />Confirmare instant pe email</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Section 2: Stats ────────────────────────────────────── */}
      {hasStats && (
        <section className="border-b border-gray-100 py-12 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
              {stats.organizationCount > 0 && (
                <div>
                  <p className="text-4xl font-extrabold text-gray-900">
                    <AnimatedCounter target={stats.organizationCount} />+
                  </p>
                  <p className="mt-1 text-sm text-gray-500 font-medium">Companii verificate</p>
                </div>
              )}
              {stats.serviceCount > 0 && (
                <div>
                  <p className="text-4xl font-extrabold text-gray-900">
                    <AnimatedCounter target={stats.serviceCount} />+
                  </p>
                  <p className="mt-1 text-sm text-gray-500 font-medium">Servicii disponibile</p>
                </div>
              )}
              {stats.cityCount > 0 && (
                <div>
                  <p className="text-4xl font-extrabold text-gray-900">
                    <AnimatedCounter target={stats.cityCount} />+
                  </p>
                  <p className="mt-1 text-sm text-gray-500 font-medium">Orase acoperite</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Section 3: Benefits ─────────────────────────────────── */}
      <section className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <SectionHeading
              label="De ce ForjaIt"
              title="Fara telefon. Fara hartii. Fara nervi."
              subtitle="Totul intr-un singur portal: programezi, comunici, platesti. Simplu."
            />
          </AnimatedSection>
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" stagger={0.08}>
            {benefits.map((b) => (
              <StaggerItem key={b.title}>
                <div className="group p-7 rounded-2xl border border-gray-200 bg-white hover:border-primary-200 hover:shadow-lg hover:shadow-primary-50 transition-all h-full">
                  <div className="h-11 w-11 rounded-xl bg-primary-50 flex items-center justify-center mb-5 group-hover:bg-primary group-hover:scale-105 transition-all">
                    <b.icon className="h-5 w-5 text-primary group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{b.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{b.description}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ── Section 4: How It Works ─────────────────────────────── */}
      <section className="py-24 lg:py-32 bg-gray-50/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <SectionHeading
              center
              label="Cum functioneaza"
              title="De la cautare la programare in sub 1 minut"
              subtitle="Trei pasi. Zero complicatii. Functioneaza si la 2 noaptea."
            />
          </AnimatedSection>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8 relative" stagger={0.12}>
            {/* Connector line */}
            <div className="hidden md:block absolute top-12 left-[calc(33.33%+1rem)] right-[calc(33.33%+1rem)] h-px bg-gray-200" />
            {steps.map((step, i) => (
              <StaggerItem key={step.title}>
                <div className="flex flex-col items-center text-center relative">
                  <div className="relative mb-6">
                    <div className="h-20 w-20 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center relative z-10 group-hover:shadow-md transition-shadow">
                      <step.icon className="h-8 w-8 text-primary" />
                    </div>
                    <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center z-20 shadow-sm shadow-primary/30">
                      {i + 1}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed max-w-xs">{step.description}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
          <AnimatedSection className="mt-14 text-center" delay={0.3}>
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors shadow-sm shadow-primary/25 text-sm"
            >
              Incepe acum
              <ArrowRight className="h-4 w-4" />
            </Link>
          </AnimatedSection>
        </div>
      </section>

      {/* ── Section 5: For Businesses ───────────────────────────── */}
      <section className="py-24 lg:py-32 bg-slate-950 text-white relative overflow-hidden">
        <GridBackground />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <AnimatedSection>
              <SectionHeading
                label="Pentru companii"
                title={<>Ai o afacere de servicii?<br />Clientii tai te cauta aici.</>}
                subtitle="Inregistreaza-ti compania si primesti: programari online, CRM, facturare, website builder si portal dedicat pentru clienti. Totul intr-o singura platforma."
                className="[&_p]:text-slate-400 [&_h2]:text-white"
              />
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 -mt-6 mb-10">
                {businessFeatures.map((f) => (
                  <li key={f.text} className="flex items-center gap-2.5 text-slate-300 text-sm">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary-400 flex-shrink-0" />
                    {f.text}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3">
                <a
                  href={`${FRONTEND_URL}/signup`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-500 transition-colors text-sm shadow-lg shadow-primary/30"
                >
                  Inregistreaza compania
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href={FRONTEND_URL}
                  className="inline-flex items-center gap-2 px-6 py-3 border border-white/15 text-slate-300 font-medium rounded-xl hover:bg-white/[0.06] transition-colors text-sm"
                >
                  Afla mai multe
                </a>
              </div>
            </AnimatedSection>

            <StaggerContainer className="grid grid-cols-2 gap-4" stagger={0.08}>
              {[
                { icon: Users, title: 'CRM Clienti', desc: 'Baza de date completa cu istoricul fiecarui client' },
                { icon: Calendar, title: 'Programari', desc: 'Calendar inteligent cu confirmare automata' },
                { icon: FileText, title: 'Facturare', desc: 'Facturi generate dintr-un click, trimise automat' },
                { icon: BarChart3, title: 'Rapoarte', desc: 'Statistici clare despre venituri si activitate' },
              ].map((item) => (
                <StaggerItem key={item.title}>
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-6 hover:bg-white/[0.06] transition-colors">
                    <item.icon className="h-6 w-6 text-primary-400 mb-3" />
                    <p className="text-sm font-semibold text-white mb-1">{item.title}</p>
                    <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </div>
      </section>

      {/* ── Section 6: Final CTA ────────────────────────────────── */}
      <section className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Nu mai suna. Programeaza-te online.
            </h2>
            <p className="mt-4 text-gray-500 text-base max-w-lg mx-auto leading-relaxed">
              Contul e gratuit, se creeaza in 30 de secunde si ai acces instant la programari, facturi si comunicare directa.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors text-sm shadow-sm shadow-primary/25"
              >
                Creeaza cont gratuit
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/marketplace"
                className="inline-flex items-center gap-2 px-6 py-3.5 text-gray-700 border border-gray-200 font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm"
              >
                Exploreaza marketplace
              </Link>
            </div>
            <p className="mt-4 text-xs text-gray-400">
              Nu este nevoie de card. Contul se creeaza in 30 de secunde.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 bg-gray-50/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            <div className="sm:col-span-2 lg:col-span-1">
              <Logo className="text-lg text-gray-900" />
              <p className="mt-3 text-sm text-gray-500 leading-relaxed max-w-xs">
                Programeaza-te online in 30 de secunde. Gaseste furnizori, comunica direct, tine evidenta facturilor - totul gratuit.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Platforma</p>
              <ul className="space-y-2.5">
                {[
                  { to: '/marketplace', label: 'Marketplace' },
                  { to: '/login', label: 'Portal Client' },
                ].map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Pentru companii</p>
              <ul className="space-y-2.5">
                <li><a href={FRONTEND_URL} className="text-sm text-gray-600 hover:text-gray-900 transition-colors" target="_blank" rel="noopener noreferrer">Platforma business</a></li>
                <li><a href={`${FRONTEND_URL}/pricing`} className="text-sm text-gray-600 hover:text-gray-900 transition-colors" target="_blank" rel="noopener noreferrer">Preturi</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Legal</p>
              <ul className="space-y-2.5">
                {[
                  { to: '/terms', label: 'Termeni si Conditii' },
                  { to: '/privacy', label: 'Politica de Confidentialitate' },
                  { to: '/contact', label: 'Contact' },
                ].map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-gray-200 pt-6">
            <div className="flex flex-wrap items-center justify-center gap-3 mb-5 text-xs text-gray-500">
              <a href="https://anpc.ro/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 font-medium transition hover:bg-white hover:text-gray-700 hover:border-gray-300">ANPC</a>
              <a href="https://anpc.ro/ce-este-sal/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 font-medium transition hover:bg-white hover:text-gray-700 hover:border-gray-300">SAL</a>
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 font-medium transition hover:bg-white hover:text-gray-700 hover:border-gray-300">SOL</a>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-sm text-gray-400">&copy; {new Date().getFullYear()} ForjaIt. Toate drepturile rezervate.</p>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Clock className="h-3.5 w-3.5" />
                Suport Luni – Vineri, 09:00 – 18:00
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
