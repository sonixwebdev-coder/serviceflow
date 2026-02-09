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
  Sparkles,
  Building2,
  MapPin,
  Zap,
} from 'lucide-react';
import { useMarketplaceStats } from '@/hooks/useMarketplace';

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

const benefits = [
  {
    icon: Calendar,
    title: 'Programari Online',
    description:
      'Nu mai pierde timp cu apeluri telefonice. Alege data si ora care ti se potrivesc, direct din portal.',
  },
  {
    icon: MessageCircle,
    title: 'Comunicare Directa',
    description:
      'Trimite mesaje, poze sau documente direct furnizorului tau. Fara email-uri pierdute.',
  },
  {
    icon: FileText,
    title: 'Facturi Organizate',
    description:
      'Toate facturile tale intr-un singur loc. Stii mereu ce ai de plata si cand.',
  },
  {
    icon: Search,
    title: 'Descopera Servicii Noi',
    description:
      'Gaseste noi furnizori de servicii din zona ta, compara si programeaza instant.',
  },
];

const steps = [
  {
    icon: Search,
    title: 'Cauta',
    description: 'Gaseste serviciul de care ai nevoie in marketplace',
  },
  {
    icon: CalendarCheck,
    title: 'Programeaza',
    description: 'Alege data si ora care ti se potrivesc',
  },
  {
    icon: CheckCircle,
    title: 'Gestioneaza',
    description: 'Urmareste programarile si facturile din contul tau',
  },
];

export default function Landing() {
  const { data: statsData } = useMarketplaceStats();
  const stats = statsData?.data || {};

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="relative bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 relative z-10">
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-white tracking-tight">ServiceFlow</span>
            <div className="flex items-center gap-4">
              <Link
                to="/marketplace"
                className="text-sm font-medium text-primary-100 hover:text-white transition-colors"
              >
                Marketplace
              </Link>
              <Link
                to="/login"
                className="text-sm font-medium text-white bg-white/15 hover:bg-white/25 backdrop-blur-sm px-4 py-2 rounded-lg transition-all border border-white/20"
              >
                Autentificare
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Section 1: Hero */}
      <section className="relative bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 text-white overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -left-32 w-80 h-80 bg-primary-400/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 right-1/3 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-24 sm:pb-32">
          {/* Badge */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 text-sm text-primary-100">
              <Sparkles className="h-4 w-4" />
              Platforma nr. 1 pentru programari in Romania
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.1]">
              Serviciile tale,
              <br />
              <span className="bg-gradient-to-r from-white via-primary-100 to-white bg-clip-text text-transparent">
                la un click distanta
              </span>
            </h1>
            <p className="mt-6 sm:mt-8 text-lg sm:text-xl text-primary-100/90 max-w-2xl mx-auto leading-relaxed">
              Programeaza online, comunica direct cu furnizorul tau si gestioneaza totul dintr-un singur loc.
            </p>
            <div className="mt-10 sm:mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/marketplace"
                className="group inline-flex items-center gap-2.5 px-8 py-4 bg-white text-primary-700 font-semibold rounded-xl hover:bg-primary-50 transition-all text-lg shadow-xl shadow-primary-900/20 hover:shadow-2xl hover:shadow-primary-900/30 hover:-translate-y-0.5"
              >
                Descopera Servicii
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl transition-all border border-white/20"
              >
                Ai deja cont? Autentifica-te
              </Link>
            </div>
          </div>

          {/* Floating stat mini-cards inside hero */}
          {statsData && (
            <div className="mt-16 sm:mt-20 flex justify-center gap-4 flex-wrap max-w-lg mx-auto">
              {stats.organizationCount > 0 && (
                <div className="flex flex-col items-center gap-1 px-6 py-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 flex-1 min-w-[120px]">
                  <Building2 className="h-5 w-5 text-primary-200 mb-1" />
                  <span className="text-2xl sm:text-3xl font-bold">
                    <AnimatedCounter target={stats.organizationCount} />+
                  </span>
                  <span className="text-xs text-primary-200 font-medium">Companii</span>
                </div>
              )}
              {stats.serviceCount > 0 && (
                <div className="flex flex-col items-center gap-1 px-6 py-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 flex-1 min-w-[120px]">
                  <Zap className="h-5 w-5 text-primary-200 mb-1" />
                  <span className="text-2xl sm:text-3xl font-bold">
                    <AnimatedCounter target={stats.serviceCount} />+
                  </span>
                  <span className="text-xs text-primary-200 font-medium">Servicii</span>
                </div>
              )}
              {stats.cityCount > 0 && (
                <div className="flex flex-col items-center gap-1 px-6 py-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 flex-1 min-w-[120px]">
                  <MapPin className="h-5 w-5 text-primary-200 mb-1" />
                  <span className="text-2xl sm:text-3xl font-bold">
                    <AnimatedCounter target={stats.cityCount} />+
                  </span>
                  <span className="text-xs text-primary-200 font-medium">Orase</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Curved bottom divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
            <path d="M0 80V40C240 0 480 0 720 40C960 80 1200 80 1440 40V80H0Z" fill="#f9fafb" />
          </svg>
        </div>
      </section>

      {/* Section 3: Benefits */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">
              Tot ce ai nevoie, intr-un singur loc
            </h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">
              Gestioneaza programarile, comunicarea si facturile cu toti furnizorii tai de servicii.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="h-12 w-12 rounded-xl bg-primary-100 flex items-center justify-center mb-4">
                  <benefit.icon className="h-6 w-6 text-primary-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{benefit.title}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Cum functioneaza</h2>
            <p className="mt-3 text-gray-500">Trei pasi simpli pentru a incepe</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={step.title} className="text-center relative">
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] border-t-2 border-dashed border-gray-200" />
                )}
                <div className="h-20 w-20 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4 relative z-10">
                  <step.icon className="h-8 w-8 text-primary-600" />
                </div>
                <div className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-600 text-white text-xs font-bold mb-3">
                  {index + 1}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-2 text-sm text-gray-500">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5: Final CTA */}
      <section className="py-20 bg-primary-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            Incepe acum — e simplu si gratuit
          </h2>
          <p className="mt-4 text-gray-600 text-lg">
            Alatura-te companiilor care isi gestioneaza clientii prin platforma noastra.
          </p>
          <Link
            to="/login"
            className="mt-8 inline-flex items-center gap-2 px-8 py-4 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors text-lg shadow-lg"
          >
            Creeaza cont gratuit
            <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="mt-4 text-sm text-gray-400">
            Nu este nevoie de card. Contul se creeaza in 30 de secunde.
          </p>
        </div>
      </section>

      {/* Section 6: Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <Link to="/terms" className="hover:text-gray-700 transition-colors">
                Termeni si Conditii
              </Link>
              <Link to="/privacy" className="hover:text-gray-700 transition-colors">
                Politica de Confidentialitate
              </Link>
              <Link to="/contact" className="hover:text-gray-700 transition-colors">
                Contact
              </Link>
              <Link to="/marketplace" className="hover:text-gray-700 transition-colors">
                Marketplace
              </Link>
            </div>
            <p className="text-sm text-gray-400">
              &copy; 2026 ServiceFlow. Toate drepturile rezervate.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
