import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/business" className="text-lg font-bold tracking-tight text-gray-900">
            ForjaIt
          </Link>
          <Link
            to="/business"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Inapoi
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Termeni si Conditii</h1>
        <p className="mt-2 text-sm text-gray-500">Ultima actualizare: 8 martie 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-gray-700">
          {/* 1 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">1. Introducere</h2>
            <p className="mt-2">
              Acesti Termeni si Conditii (denumiti in continuare „Termenii") reglementeaza utilizarea platformei
              ForjaIt (denumita in continuare „Platforma"), operata de ForjaIt, cu sediul in Romania.
              Prin accesarea sau utilizarea Platformei, confirmati ca ati citit, inteles si acceptat acesti Termeni
              in integralitatea lor.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">2. Descrierea serviciului</h2>
            <p className="mt-2">
              ForjaIt este o platforma de management pentru afaceri de servicii care ofera urmatoarele
              functionalitati principale:
            </p>
            <ul className="mt-3 list-disc pl-5 space-y-1">
              <li>Gestionarea clientilor (CRM)</li>
              <li>Programari online si calendar</li>
              <li>Facturare si urmarirea platilor</li>
              <li>Website builder integrat</li>
              <li>Comunicare in timp real cu clientii</li>
              <li>Management echipa si angajati</li>
              <li>Portal dedicat pentru clienti</li>
              <li>Program de fidelitate si puncte de loialitate</li>
              <li>Management multi-locatie</li>
              <li>Notificari push si in-app</li>
              <li>Rapoarte si analize</li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">3. Inregistrarea si contul</h2>
            <p className="mt-2">
              Pentru a utiliza Platforma, trebuie sa creati un cont furnizand informatii corecte si complete.
              Sunteti responsabil pentru mentinerea confidentialitatii credentialelor contului si pentru toate
              activitatile desfasurate prin intermediul contului dumneavoastra. Trebuie sa ne notificati imediat
              cu privire la orice utilizare neautorizata a contului.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">4. Obligatiile utilizatorului</h2>
            <p className="mt-2">In calitate de utilizator al Platformei, va obligati sa:</p>
            <ul className="mt-3 list-disc pl-5 space-y-1">
              <li>Furnizati informatii reale si actualizate</li>
              <li>Nu utilizati Platforma in scopuri ilegale sau neautorizate</li>
              <li>Nu incercati sa accesati neautorizat sistemele sau datele altor utilizatori</li>
              <li>Respectati drepturile de proprietate intelectuala ale ForjaIt si ale tertilor</li>
              <li>Nu transmiteti continut daunator, ofensator sau care incalca legislatia in vigoare</li>
              <li>Respectati regulamentele aplicabile privind protectia datelor cu caracter personal</li>
            </ul>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">5. Proprietate intelectuala</h2>
            <p className="mt-2">
              Platforma, inclusiv dar fara a se limita la codul sursa, designul, logo-urile, textele si
              functionalitajile, sunt proprietatea exclusiva a ForjaIt si sunt protejate de legislatia
              privind drepturile de autor si proprietatea intelectuala. Nu aveti dreptul sa copiati, modificati,
              distribuiti sau sa creati opere derivate fara acordul scris prealabil.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">6. Datele utilizatorilor si retentia datelor</h2>
            <p className="mt-2">
              Datele pe care le introduceti in Platforma (informatii clienti, programari, facturi etc.) va
              apartin. ForjaIt actioneaza ca procesator de date in conformitate cu Regulamentul General
              privind Protectia Datelor (GDPR). Prelucrarea datelor cu caracter personal este descrisa in
              detaliu in{' '}
              <Link to="/privacy" className="text-blue-600 hover:underline">
                Politica de Confidentialitate
              </Link>
              .
            </p>
            <p className="mt-3">
              In conformitate cu legislatia romana, datele sunt pastrate conform urmatoarelor perioade:
            </p>
            <ul className="mt-3 list-disc pl-5 space-y-1">
              <li>
                <strong>Documente financiar-contabile</strong> (facturi, chitante): <strong>5 ani</strong> de la
                1 iulie al anului urmator exercitiului financiar (Legea nr. 82/1991, modificata prin Legea nr. 36/2023)
              </li>
              <li>
                <strong>Situatii financiare anuale:</strong> <strong>10 ani</strong> (Legea nr. 82/1991)
              </li>
              <li>
                <strong>Date de cont si profil:</strong> pe durata utilizarii + 30 de zile dupa stergerea contului
              </li>
              <li>
                <strong>Date clienti si programari:</strong> pe durata relatiei contractuale + 3 ani (termen de prescriptie)
              </li>
              <li>
                <strong>Jurnale de activitate:</strong> 12 luni
              </li>
            </ul>
            <p className="mt-3">
              La stergerea contului, datele vor fi eliminate conform perioadelor de retentie de mai sus.
              Datele fara obligatie legala de pastrare sunt sterse in termen de 30 de zile.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">7. Disponibilitate si intretinere</h2>
            <p className="mt-2">
              Depunem eforturi rezonabile pentru a asigura disponibilitatea continua a Platformei. Cu toate
              acestea, nu garantam functionarea neintrerupta. Pot exista perioade de intretinere planificata
              sau incidente tehnice care pot afecta temporar accesul. Vom depune eforturi sa notificam
              utilizatorii in avans cu privire la intreruperile planificate.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">8. Limitarea raspunderii</h2>
            <p className="mt-2">
              In masura maxima permisa de lege, ForjaIt nu va fi raspunzator pentru:
            </p>
            <ul className="mt-3 list-disc pl-5 space-y-1">
              <li>Pierderi indirecte, incidentale sau consecvente rezultate din utilizarea Platformei</li>
              <li>Pierderea de date cauzata de factori in afara controlului nostru</li>
              <li>Intreruperi ale serviciului datorate unor cauze de forta majora</li>
              <li>Actiunile sau omisiunile tertilor</li>
            </ul>
            <p className="mt-3">
              Raspunderea totala a ForjaIt nu va depasi suma platita de utilizator pentru servicii in
              ultimele 12 luni.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">9. Rezilierea</h2>
            <p className="mt-2">
              Puteti inceta utilizarea Platformei si sterge contul in orice moment. ForjaIt isi rezerva
              dreptul de a suspenda sau inchide contul dumneavoastra in cazul incalcarii acestor Termeni,
              dupa o notificare prealabila de 30 de zile, cu exceptia cazurilor de incalcare grava care pot
              duce la suspendarea imediata. La stergerea contului, datele dumneavoastra vor fi eliminate in
              conformitate cu Politica de Confidentialitate.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">10. Modificari ale Termenilor</h2>
            <p className="mt-2">
              Ne rezervam dreptul de a modifica acesti Termeni in orice moment. Modificarile vor fi publicate
              pe aceasta pagina, cu actualizarea datei de la inceput. Continuarea utilizarii Platformei dupa
              publicarea modificarilor constituie acceptarea noilor Termeni. Pentru modificari semnificative,
              vom notifica utilizatorii prin email.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">11. Legea aplicabila si jurisdictia</h2>
            <p className="mt-2">
              Acesti Termeni sunt guvernati de legislatia din Romania. Orice disputa rezultata din sau in
              legatura cu acesti Termeni va fi solutionata de instantele competente din Romania. Partile vor
              incerca sa rezolve orice disputa pe cale amiabila inainte de a recurge la instanta.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">12. Contact</h2>
            <p className="mt-2">
              Pentru intrebari sau clarificari privind acesti Termeni, ne puteti contacta la:
            </p>
            <ul className="mt-3 space-y-1">
              <li>
                <strong>Email:</strong> contact@forja.it.com
              </li>
              <li>
                <strong>Platforma:</strong> ForjaIt
              </li>
            </ul>
          </section>
        </div>
      </main>

      {/* ANPC */}
      <section className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
            Solutionarea alternativa a litigiilor
          </p>
          <div className="flex flex-wrap gap-6 text-sm text-gray-600">
            <a
              href="https://anpc.ro/ce-este-sal/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-900 transition-colors"
            >
              ANPC - SAL
            </a>
            <a
              href="https://ec.europa.eu/consumers/odr"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-900 transition-colors"
            >
              Platformă SOL (Online Dispute Resolution)
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
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
                  <Link to="/pricing" className="hover:text-gray-900 transition-colors">
                    Preturi
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Legal</h4>
              <ul className="mt-3 space-y-2 text-sm text-gray-600">
                <li>
                  <span className="text-gray-900 font-medium">Termeni si Conditii</span>
                </li>
                <li>
                  <Link to="/privacy" className="hover:text-gray-900 transition-colors">
                    Confidentialitate
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-gray-200 pt-6">
            <div className="flex flex-wrap items-center justify-center gap-3 mb-4 text-xs text-gray-500">
              <a href="https://anpc.ro/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded border border-gray-300 px-2.5 py-1.5 font-medium transition hover:bg-gray-100 hover:text-gray-700">
                ANPC
              </a>
              <a href="https://anpc.ro/ce-este-sal/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded border border-gray-300 px-2.5 py-1.5 font-medium transition hover:bg-gray-100 hover:text-gray-700">
                SAL
              </a>
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded border border-gray-300 px-2.5 py-1.5 font-medium transition hover:bg-gray-100 hover:text-gray-700">
                SOL
              </a>
            </div>
            <p className="text-center text-xs text-gray-400">
              &copy; {new Date().getFullYear()} ForjaIt. Toate drepturile rezervate.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
