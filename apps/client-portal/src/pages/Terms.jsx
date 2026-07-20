import SEOHead from '@/components/landing/SEOHead';
import { runtimeConfig } from '@/config/runtime';

export default function Terms() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <SEOHead
        title={`Termeni si Conditii - ${runtimeConfig.platformName}`}
        description={`Conditiile generale pentru utilizarea portalului ${runtimeConfig.platformName}.`}
        canonical={`${runtimeConfig.portalUrl}/terms`}
      />
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Legal</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
          Termeni si Conditii
        </h1>
        <p className="mt-3 text-sm text-gray-400">Ultima actualizare: 20 iulie 2026</p>
      </div>

      <div className="prose prose-gray max-w-none space-y-6 text-gray-600 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">
            1. Utilizarea portalului
          </h2>
          <p>
            Acest portal este administrat de operatorul sau furnizorul de servicii care v-a oferit
            accesul. Regulile comerciale, identitatea legala si conditiile specifice programarilor
            trebuie comunicate de acel operator.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">2. Cont si acces</h2>
          <p>
            Furnizati date corecte, pastrati credentialele confidentiale si notificati operatorul
            daca suspectati acces neautorizat. Nu accesati date, conturi sau organizatii pentru care
            nu aveti autorizare.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">
            3. Programari, servicii si plati
          </h2>
          <p>
            Disponibilitatea, preturile, anularea, reprogramarea, platile si programele de
            fidelitate sunt stabilite de fiecare furnizor. Verificati conditiile furnizorului
            inainte de a face o programare sau o plata.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">
            4. Utilizare acceptabila
          </h2>
          <p>
            Nu folositi portalul pentru activitati ilegale, acces neautorizat, continut daunator sau
            incalcarea drepturilor tertilor. Operatorul poate limita accesul pentru protejarea
            serviciului si a celorlalti utilizatori.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">
            5. Disponibilitate si date
          </h2>
          <p>
            Gazduirea, mentenanta, copiile de siguranta, suportul si orice nivel de serviciu sunt
            responsabilitatea operatorului instalarii. Informatiile despre prelucrarea datelor sunt
            disponibile in politica de confidentialitate a portalului.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">6. Contact</h2>
          <p>
            Pentru intrebari sau clarificari privind conditiile acestei instalari, contactati
            operatorul la{' '}
            <a
              href={`mailto:${runtimeConfig.platformContactEmail}`}
              className="text-primary hover:underline"
            >
              {runtimeConfig.platformContactEmail}
            </a>
            .
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
