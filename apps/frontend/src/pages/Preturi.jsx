import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Check, X as XIcon, Menu, X, ArrowRight } from 'lucide-react';
import { PLAN_TIERS, LIMIT_LABELS } from '../constants/plans';
import { fetchPricing } from '../services/organizationService';

const FAQ_ITEMS = [
  {
    q: 'Pot schimba planul oricand?',
    a: 'Da. Poti face upgrade sau downgrade oricand. La upgrade, diferenta se calculeaza pro-rata. La downgrade, noul pret se aplica la urmatoarea factura.',
  },
  {
    q: 'Ce se intampla dupa cele 14 zile gratuite?',
    a: 'Daca nu alegi un plan platit, contul revine automat la planul Gratuit. Nu pierzi datele doar accesul la functiile premium.',
  },
  {
    q: 'Exista contracte pe termen lung?',
    a: 'Nu. Toate planurile sunt fara angajament. Plata anuala ofera o reducere de 20%, dar poti anula oricand.',
  },
  {
    q: 'Ce metode de plata acceptati?',
    a: 'Card bancar (Visa, Mastercard), transfer bancar si factura fiscala pentru persoane juridice.',
  },
  {
    q: 'Datele mele sunt in siguranta?',
    a: 'Absolut. Comunicatii criptate (HTTPS), parole hashuite, backup-uri automate si conformitate GDPR.',
  },
];

function FAQItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-200">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="text-base font-medium text-gray-900">{question}</span>
        <svg
          className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-40 pb-5' : 'max-h-0'}`}>
        <p className="text-sm leading-relaxed text-gray-600">{answer}</p>
      </div>
    </div>
  );
}

export default function Preturi() {
  const [annual, setAnnual] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dynamicPrices, setDynamicPrices] = useState(null);

  useEffect(() => {
    fetchPricing()
      .then(setDynamicPrices)
      .catch(() => {/* keep fallback prices */});
  }, []);

  // Merge dynamic prices into PLAN_TIERS, falling back to hardcoded values
  const tiers = useMemo(() => {
    if (!dynamicPrices) return PLAN_TIERS;
    const keyMap = { STARTER: 'starter', PROFESSIONAL: 'professional', ENTERPRISE: 'enterprise' };
    return PLAN_TIERS.map((tier) => {
      const remote = dynamicPrices[keyMap[tier.key]];
      if (!remote) return tier;
      return {
        ...tier,
        price: {
          monthly: remote.monthly ?? tier.price.monthly,
          annual: remote.annual ?? tier.price.annual,
        },
      };
    });
  }, [dynamicPrices]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header — matches BusinessLanding */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/business" className="text-lg font-bold tracking-tight text-gray-900">
            ForjaIt
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-gray-600 md:flex">
            <Link to="/business" className="hover:text-gray-900 transition-colors">
              Acasa
            </Link>
            <span className="text-gray-900">Preturi</span>
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

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden rounded-lg p-2 text-gray-600 hover:bg-gray-100"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-gray-100 bg-white px-4 pb-4 pt-2 md:hidden">
            <nav className="flex flex-col gap-3 text-sm font-medium text-gray-600">
              <Link to="/business" className="py-2 hover:text-gray-900">
                Acasa
              </Link>
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

      {/* Hero */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            Preturi simple, fara surprize
          </h1>
          <p className="mt-4 text-lg text-gray-500">
            Incepe gratuit. Creste cand esti gata. Fara contract, fara angajament.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-full bg-gray-100 p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                !annual ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Lunar
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                annual ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Anual
              <span className="ml-1.5 inline-block rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                -20%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="pb-20">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-4">
          {tiers.map((tier) => {
            const price = annual ? tier.price.annual : tier.price.monthly;
            return (
              <div
                key={tier.key}
                className={`relative flex flex-col rounded-2xl border p-6 ${
                  tier.highlight
                    ? 'border-blue-600 shadow-lg ring-1 ring-blue-600'
                    : 'border-gray-200'
                }`}
              >
                {tier.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                    {tier.badge}
                  </span>
                )}

                <h3 className="text-lg font-bold text-gray-900">{tier.name}</h3>
                <p className="mt-1 text-sm text-gray-500 min-h-[40px]">{tier.description}</p>

                {/* Price */}
                <div className="mt-4 min-h-[72px]">
                  {price === 0 ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-gray-900">0</span>
                      <span className="text-sm text-gray-500">RON</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-gray-900">{price}</span>
                      <span className="text-sm text-gray-500">RON / luna</span>
                    </div>
                  )}
                  {annual && tier.price.monthly > 0 && (
                    <p className="mt-1 text-xs text-gray-400">
                      {tier.price.monthly * 12} RON / an facturat anual
                    </p>
                  )}
                  {!annual && tier.price.monthly > 0 && (
                    <p className="mt-1 text-xs text-gray-400">
                      sau {tier.price.annual} RON / luna la plata anuala
                    </p>
                  )}
                </div>

                {/* CTA */}
                <Link
                  to={
                    tier.key === 'ENTERPRISE'
                      ? '/business#contact'
                      : tier.key === 'FREE'
                        ? '/signup'
                        : `/signup?plan=${tier.key.toLowerCase()}`
                  }
                  className={`mt-6 block rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-colors ${tier.ctaStyle}`}
                >
                  {tier.cta}
                </Link>

                {/* Limits */}
                <div className="mt-6 space-y-2 border-t border-gray-100 pt-4">
                  {Object.entries(tier.limits).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-gray-500">{LIMIT_LABELS[key]}</span>
                      <span className="font-medium text-gray-900">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Features */}
                <div className="mt-6 flex-1 border-t border-gray-100 pt-4">
                  <ul className="space-y-2.5">
                    {tier.features.map((feat) => (
                      <li key={feat.text} className="flex items-start gap-2 text-sm">
                        {feat.bold ? (
                          <span className="font-semibold text-gray-900">{feat.text}</span>
                        ) : feat.included ? (
                          <>
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                            <span className="text-gray-700">{feat.text}</span>
                          </>
                        ) : (
                          <>
                            <XIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-300" />
                            <span className="text-gray-400">{feat.text}</span>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Comparison note */}
      <section className="border-t border-gray-100 bg-gray-50 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            Toate planurile includ
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { title: 'Securitate', text: 'Criptare HTTPS, parole hashuite, GDPR compliant' },
              { title: '14 zile trial', text: 'Testeaza orice plan platit gratuit, fara card bancar' },
              { title: 'Fara angajament', text: 'Anuleaza oricand, fara penalizari sau contracte' },
            ].map((item) => (
              <div key={item.title} className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">{item.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Intrebari frecvente</h2>
          <div className="mt-8">
            {FAQ_ITEMS.map((item) => (
              <FAQItem key={item.q} question={item.q} answer={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-gray-100 py-16">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Gata sa incepi?</h2>
          <p className="mt-3 text-sm text-gray-500">
            Creeaza contul in 30 de secunde. 14 zile gratuit pe orice plan.
          </p>
          <Link
            to="/signup"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            Incearca gratuit <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer — matches BusinessLanding */}
      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <span className="text-base font-bold text-gray-900">ForjaIt</span>
              <p className="mt-2 text-xs leading-relaxed text-gray-500">
                Platforma completa de management pentru afaceri de servicii. CRM, programari, facturare, website si comunicare totul intr-un singur loc.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Produs</h4>
              <ul className="mt-3 space-y-2 text-sm text-gray-600">
                <li>
                  <Link to="/business" className="hover:text-gray-900 transition-colors">
                    Acasa
                  </Link>
                </li>
                <li>
                  <span className="text-gray-900 font-medium">Preturi</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Legal</h4>
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
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-gray-200 pt-6 text-center text-xs text-gray-400">
            &copy; {new Date().getFullYear()} ForjaIt. Toate drepturile rezervate.
          </div>
        </div>
      </footer>
    </div>
  );
}
