import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Check, X as XIcon, ArrowRight } from 'lucide-react';
import { PLAN_TIERS, LIMIT_LABELS } from '../constants/plans';
import { fetchPricing } from '../services/organizationService';
import PublicHeader from '../components/landing/PublicHeader';
import PublicFooter from '../components/landing/PublicFooter';
import SectionHeading from '../components/landing/SectionHeading';
import AnimatedSection, {
  StaggerContainer,
  StaggerItem,
} from '../components/landing/AnimatedSection';
import FAQAccordion from '../components/landing/FAQAccordion';
import SEOHead from '../components/landing/SEOHead';
import { runtimeConfig } from '../config/runtime';

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
    a: 'Folosim HTTPS, parole hashuite si optiuni de backup. Operatorul fiecarei instalari ramane responsabil pentru configurare, politici si obligatiile sale privind protectia datelor.',
  },
];

export default function Preturi() {
  const [annual, setAnnual] = useState(false);
  const [dynamicPrices, setDynamicPrices] = useState(null);

  useEffect(() => {
    fetchPricing()
      .then(setDynamicPrices)
      .catch(() => {});
  }, []);

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

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return (
    <div className="min-h-screen bg-white">
      <SEOHead
        title={`Preturi ${runtimeConfig.platformName} - Planuri de la 0 RON/luna | Fara contract`}
        description="Planuri flexibile pentru orice afacere de servicii. Starter 99 RON/luna, Professional 249 RON/luna. 14 zile gratuit, fara card de credit."
        canonical={`${runtimeConfig.platformUrl}/pricing`}
        og={{
          title: `Preturi ${runtimeConfig.platformName} - Costa mai putin decat un client pierdut`,
          description:
            'Planuri de la 0 RON/luna. 14 zile gratuit pe orice plan. Fara contract, fara penalizari.',
          url: `${runtimeConfig.platformUrl}/pricing`,
        }}
        schema={faqSchema}
      />
      <PublicHeader />

      {/* Hero */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <AnimatedSection>
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
              Costa mai putin decat un client pierdut.
            </h1>
            <p className="mt-4 text-lg text-gray-500">
              Alege planul care ti se potriveste. 14 zile gratuit pe orice plan. Schimba sau
              anuleaza oricand.
            </p>

            {/* Billing toggle */}
            <div className="mt-8 inline-flex items-center gap-1 rounded-full bg-gray-100 p-1">
              <button
                onClick={() => setAnnual(false)}
                className={`rounded-full px-5 py-2.5 text-sm font-medium transition-all ${!annual ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Lunar
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`rounded-full px-5 py-2.5 text-sm font-medium transition-all ${annual ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Anual
                <span className="ml-1.5 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  -20%
                </span>
              </button>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="pb-24">
        <StaggerContainer
          className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-4"
          stagger={0.08}
        >
          {tiers.map((tier) => {
            const price = annual ? tier.price.annual : tier.price.monthly;
            return (
              <StaggerItem key={tier.key}>
                <div
                  className={`relative flex flex-col rounded-2xl border p-7 h-full ${tier.highlight ? 'border-primary shadow-xl shadow-primary/10 ring-1 ring-primary' : 'border-gray-200 hover:shadow-lg transition-shadow'}`}
                >
                  {tier.badge && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-white shadow-xs">
                      {tier.badge}
                    </span>
                  )}

                  <h3 className="text-lg font-bold text-gray-900">{tier.name}</h3>
                  <p className="mt-1 text-sm text-gray-500 min-h-[40px]">{tier.description}</p>

                  <div className="mt-5 min-h-[72px]">
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

                  <Link
                    to={
                      tier.key === 'ENTERPRISE'
                        ? '/#contact'
                        : tier.key === 'FREE'
                          ? '/signup'
                          : `/signup?plan=${tier.key.toLowerCase()}`
                    }
                    className={`mt-6 block rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition-colors ${tier.ctaStyle}`}
                  >
                    {tier.cta}
                  </Link>

                  <div className="mt-6 space-y-2 border-t border-gray-100 pt-4">
                    {Object.entries(tier.limits).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-gray-500">{LIMIT_LABELS[key]}</span>
                        <span className="font-medium text-gray-900">{value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex-1 border-t border-gray-100 pt-4">
                    <ul className="space-y-2.5">
                      {tier.features.map((feat) => (
                        <li key={feat.text} className="flex items-start gap-2 text-sm">
                          {feat.bold ? (
                            <span className="font-semibold text-gray-900">{feat.text}</span>
                          ) : feat.included ? (
                            <>
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
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
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </section>

      {/* All plans include */}
      <section className="border-t border-gray-100 bg-gray-50/80 py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <AnimatedSection>
            <SectionHeading center title="Toate planurile includ" />
          </AnimatedSection>
          <StaggerContainer className="grid gap-5 sm:grid-cols-3" stagger={0.08}>
            {[
              {
                title: 'Protectia datelor',
                text: 'HTTPS, parole hashuite si controale de acces configurabile',
              },
              {
                title: '14 zile trial',
                text: 'Testeaza orice plan platit gratuit, fara card bancar',
              },
              { title: 'Fara angajament', text: 'Anuleaza oricand, fara penalizari sau contracte' },
            ].map((item) => (
              <StaggerItem key={item.title}>
                <div className="rounded-2xl bg-white p-6 shadow-xs border border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900">{item.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-gray-500">{item.text}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <AnimatedSection>
            <SectionHeading title="Intrebari frecvente" />
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <FAQAccordion items={FAQ_ITEMS} />
          </AnimatedSection>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-gray-100 py-20">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <AnimatedSection>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
              Incepe acum. Platesti doar daca ramai.
            </h2>
            <p className="mt-3 text-sm text-gray-500">
              14 zile gratuit pe orice plan. Fara card de credit. Fara obligatii.
            </p>
            <Link
              to="/signup"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3 text-sm font-semibold text-white shadow-xs shadow-primary/25 hover:bg-primary-700 transition-colors"
            >
              Activeaza contul gratuit <ArrowRight className="h-4 w-4" />
            </Link>
          </AnimatedSection>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
