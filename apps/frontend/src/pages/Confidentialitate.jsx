import PublicHeader from '../components/landing/PublicHeader';
import PublicFooter from '../components/landing/PublicFooter';
import SEOHead from '../components/landing/SEOHead';
import { runtimeConfig } from '../config/runtime';

const contactLink = `mailto:${runtimeConfig.platformContactEmail}`;

export default function PrivacyPolicy() {
  const platformName = runtimeConfig.platformName;

  return (
    <div className="min-h-screen bg-white">
      <SEOHead
        title={`Politica de Confidentialitate - ${platformName}`}
        description={`Informatii despre datele prelucrate prin instalarea ${platformName}, optiunile disponibile si responsabilitatile operatorului.`}
        canonical={`${runtimeConfig.platformUrl}/privacy`}
      />
      <PublicHeader />

      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Politica de Confidentialitate
        </h1>
        <p className="mt-2 text-sm text-gray-500">Ultima actualizare: 20 iulie 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="text-lg font-semibold text-gray-900">1. Operatorul instalarii</h2>
            <p className="mt-2">
              Aceasta instanta {platformName} este administrata de operatorul care v-a oferit
              accesul la serviciu. ServiceFlow este software open-source; instalarea, configurarea,
              temeiurile prelucrarii si relatia cu persoanele vizate sunt responsabilitatea
              operatorului respectivei instalari.
            </p>
            <p className="mt-3">
              Pentru identificarea operatorului, solicitarile privind datele sau intrebari despre
              aceasta instanta, folositi{' '}
              <a className="text-primary hover:underline" href={contactLink}>
                {runtimeConfig.platformContactEmail}
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">2. Categorii de date</h2>
            <p className="mt-2">
              In functie de modulele activate si de modul in care operatorul foloseste platforma,
              pot fi prelucrate:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>date de cont, profil si autentificare;</li>
              <li>date despre organizatii, angajati, clienti si persoane de contact;</li>
              <li>programari, servicii, facturi, plati, mesaje si fisiere incarcate;</li>
              <li>preferinte, notificari, jurnale de activitate si date tehnice;</li>
              <li>orice alte date introduse de utilizatori in campuri configurabile.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">3. Scop si temei legal</h2>
            <p className="mt-2">
              Operatorul instalarii stabileste scopurile si temeiurile legale aplicabile. Acestea
              pot include executarea unui contract, indeplinirea unei obligatii legale, interesul
              legitim sau consimtamantul, dupa caz. Prezenta pagina nu inlocuieste informarea
              specifica pe care operatorul trebuie sa o furnizeze persoanelor vizate.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">4. Stocare si destinatari</h2>
            <p className="mt-2">
              Locatia gazduirii, copiile de siguranta, furnizorii, transferurile internationale si
              perioadele de pastrare depind de configuratia operatorului. Platforma ofera controale
              pentru acces, export si stergere, dar operatorul trebuie sa configureze si sa
              documenteze o politica de retentie potrivita obligatiilor sale.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">5. Cookie-uri si stocare locala</h2>
            <p className="mt-2">
              Aplicatia foloseste mecanisme necesare autentificarii, protectiei formularelor si
              pastrarii preferintelor interfetei. Operatorul trebuie sa informeze utilizatorii si sa
              obtina consimtamantul inainte de a activa instrumente optionale de analiza sau
              publicitate care necesita acest lucru.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">6. Masuri disponibile</h2>
            <p className="mt-2">
              ServiceFlow include parole hashuite, autentificare cu doi factori optionala, control
              al accesului pe roluri, izolare organizationala, jurnale de activitate si suport
              pentru conexiuni HTTPS. Protectia efectiva depinde si de configuratia infrastructurii,
              actualizari, politici, backup-uri si administrarea accesului de catre operator.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">
              7. Drepturile persoanelor vizate
            </h2>
            <p className="mt-2">
              In conditiile legislatiei aplicabile, puteti avea drepturi de acces, rectificare,
              stergere, restrictionare, portabilitate si opozitie, precum si dreptul de a retrage
              consimtamantul. Trimiteti solicitarea operatorului la{' '}
              <a className="text-primary hover:underline" href={contactLink}>
                {runtimeConfig.platformContactEmail}
              </a>
              . Puteti de asemenea contacta autoritatea de supraveghere competenta.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">8. Actualizari</h2>
            <p className="mt-2">
              Operatorul poate actualiza aceasta politica pentru a reflecta configuratia, furnizorii
              sau practicile sale. Verificati data de mai sus si solicitarile de informare furnizate
              de operator.
            </p>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
