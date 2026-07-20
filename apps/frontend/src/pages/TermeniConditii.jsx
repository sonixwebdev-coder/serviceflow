import { Link } from 'react-router-dom';
import PublicHeader from '../components/landing/PublicHeader';
import PublicFooter from '../components/landing/PublicFooter';
import SEOHead from '../components/landing/SEOHead';
import { runtimeConfig } from '../config/runtime';

export default function TermsAndConditions() {
  const platformName = runtimeConfig.platformName;

  return (
    <div className="min-h-screen bg-white">
      <SEOHead
        title={`Termeni si Conditii - ${platformName}`}
        description={`Conditiile generale pentru utilizarea instalarii ${platformName}.`}
        canonical={`${runtimeConfig.platformUrl}/terms`}
      />
      <PublicHeader />

      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Termeni si Conditii</h1>
        <p className="mt-2 text-sm text-gray-500">Ultima actualizare: 20 iulie 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="text-lg font-semibold text-gray-900">1. Domeniu de aplicare</h2>
            <p className="mt-2">
              Acesti termeni descriu regulile generale de utilizare a acestei instante{' '}
              {platformName}. Instanta este administrata de operatorul care v-a furnizat contul sau
              accesul. Operatorul trebuie sa completeze acesti termeni cu identitatea sa legala,
              conditiile comerciale si regulile aplicabile serviciului oferit.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">2. Serviciul</h2>
            <p className="mt-2">
              Platforma poate include gestionarea clientilor, programari, facturare, website-uri,
              comunicare, administrarea echipei, rapoarte si alte module configurate de operator.
              Functionalitatile disponibile pot varia intre instalari, organizatii si planuri.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">3. Conturi si acces</h2>
            <p className="mt-2">
              Furnizati informatii corecte, protejati credentialele si folositi numai conturile si
              organizatiile pentru care aveti autorizare. Informati operatorul fara intarziere daca
              suspectati acces neautorizat. Operatorul poate suspenda accesul pentru protejarea
              serviciului sau in cazul incalcarii regulilor comunicate.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">4. Utilizare acceptabila</h2>
            <p className="mt-2">Nu folositi platforma pentru a:</p>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>incalca legea, drepturile tertilor sau obligatiile de confidentialitate;</li>
              <li>accesa date, conturi ori sisteme fara autorizare;</li>
              <li>transmite continut daunator sau perturba functionarea serviciului;</li>
              <li>introduce date personale fara un temei si masuri adecvate;</li>
              <li>eluda limitele tehnice sau controalele de acces configurate.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">5. Date si confidentialitate</h2>
            <p className="mt-2">
              Organizatia dumneavoastra ramane responsabila pentru datele introduse si pentru
              acordarea accesului utilizatorilor sai. Modul de prelucrare, retentie, export si
              stergere este descris in{' '}
              <Link to="/privacy" className="text-primary hover:underline">
                Politica de Confidentialitate
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">6. Disponibilitate si backup</h2>
            <p className="mt-2">
              Disponibilitatea, mentenanta, copiile de siguranta, recuperarea datelor si orice nivel
              de serviciu sunt stabilite de operatorul instalarii. Software-ul open-source este
              furnizat conform licentei sale, fara ca proiectul upstream sa ofere implicit servicii
              de gazduire sau suport.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">7. Licenta software</h2>
            <p className="mt-2">
              ServiceFlow este disponibil sub GNU Affero General Public License v3.0 only. Licenta
              codului nu acorda drepturi asupra marcilor, domeniilor sau serviciilor comerciale ale
              unui operator si nu limiteaza drepturile pe care le aveti asupra propriilor date.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">8. Contact si litigii</h2>
            <p className="mt-2">
              Pentru suport, exercitarea drepturilor sau clarificarea termenilor aplicabili acestei
              instalari, contactati operatorul la{' '}
              <a
                className="text-primary hover:underline"
                href={`mailto:${runtimeConfig.platformContactEmail}`}
              >
                {runtimeConfig.platformContactEmail}
              </a>
              . Legea aplicabila si mecanismele de solutionare a litigiilor sunt cele comunicate de
              operator si impuse de jurisdictia relevanta.
            </p>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
