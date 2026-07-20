import SEOHead from '@/components/landing/SEOHead';
import { runtimeConfig } from '@/config/runtime';

export default function Privacy() {
  const contactEmail = runtimeConfig.platformContactEmail;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <SEOHead
        title={`Politica de Confidentialitate - ${runtimeConfig.platformName}`}
        description={`Informatii despre datele prelucrate prin portalul ${runtimeConfig.platformName} si responsabilitatile operatorului instalarii.`}
        canonical={`${runtimeConfig.portalUrl}/privacy`}
      />
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Legal</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
          Politica de Confidentialitate
        </h1>
        <p className="mt-3 text-sm text-gray-400">Ultima actualizare: 20 iulie 2026</p>
      </div>

      <div className="prose prose-gray max-w-none space-y-6 text-gray-600 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">
            1. Operatorul instalarii
          </h2>
          <p>
            Portalul este administrat de organizatia sau operatorul care v-a oferit accesul.
            ServiceFlow este software open-source si nu stabileste automat scopurile, temeiurile sau
            perioadele de pastrare pentru fiecare instalare.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">2. Date prelucrate</h2>
          <p>In functie de functiile utilizate, portalul poate prelucra:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>date de identificare, contact, cont si autentificare;</li>
            <li>programari, servicii, facturi, mesaje si fisiere;</li>
            <li>puncte de fidelitate si preferinte de notificare;</li>
            <li>jurnale de activitate, adresa IP si informatii despre dispozitiv.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">
            3. Scop, temei si retentie
          </h2>
          <p>
            Operatorul foloseste datele pentru furnizarea contului, programari, comunicare,
            facturare si celelalte functii activate. Operatorul trebuie sa stabileasca temeiurile
            legale, furnizorii, transferurile, copiile de siguranta si perioadele de retentie
            aplicabile si sa vi le comunice separat.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">
            4. Cookie-uri si masuri disponibile
          </h2>
          <p>
            Aplicatia foloseste mecanisme necesare autentificarii, protectiei formularelor si
            preferintelor. Software-ul include parole hashuite, 2FA optionala, control al accesului
            si suport HTTPS. Protectia efectiva depinde si de configuratia si practicile
            operatorului.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">5. Drepturi si contact</h2>
          <p>
            Puteti avea drepturi de acces, rectificare, stergere, restrictionare, portabilitate si
            opozitie, in conditiile legislatiei aplicabile. Trimiteti solicitarile operatorului la{' '}
            <a href={`mailto:${contactEmail}`} className="text-primary hover:underline">
              {contactEmail}
            </a>
            . Puteti contacta si autoritatea de supraveghere competenta.
          </p>
        </section>
      </div>

      <div className="mt-12 border-t border-gray-200 pt-8">
        <a
          href="https://anpc.ro/ce-este-sal/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:bg-white hover:text-gray-700 hover:border-gray-300"
        >
          ANPC - SAL
        </a>
      </div>
    </div>
  );
}
