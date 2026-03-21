import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
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
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Politica de Confidentialitate</h1>
        <p className="mt-2 text-sm text-gray-500">Ultima actualizare: 8 martie 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-gray-700">
          {/* 1 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">1. Operatorul de date</h2>
            <p className="mt-2">
              Operatorul de date cu caracter personal este ForjaIt SRL, cu sediul in Romania. Aceasta
              Politica de Confidentialitate descrie modul in care colectam, utilizam, stocam si protejam
              datele dumneavoastra cu caracter personal, in conformitate cu Regulamentul (UE) 2016/679
              (GDPR) si legislatia nationala aplicabila.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">2. Datele pe care le colectam</h2>
            <p className="mt-2">Colectam urmatoarele categorii de date cu caracter personal:</p>
            <ul className="mt-3 list-disc pl-5 space-y-1">
              <li>
                <strong>Date de identificare:</strong> nume, prenume, adresa de email, numar de telefon
              </li>
              <li>
                <strong>Date ale organizatiei:</strong> denumirea companiei, domeniul de activitate, slug-ul organizatiei
              </li>
              <li>
                <strong>Date de autentificare:</strong> adresa de email, parola (stocata criptat)
              </li>
              <li>
                <strong>Date de utilizare:</strong> informatii despre modul in care interactionati cu Platforma,
                jurnale de activitate, preferinte
              </li>
              <li>
                <strong>Date tehnice:</strong> adresa IP, tipul browserului, sistemul de operare, ora accesului
              </li>
              <li>
                <strong>Date introduse de utilizator:</strong> informatii despre clienti, programari, facturi,
                mesaje si alte date de business pe care le introduceti in Platforma
              </li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">3. Temeiul legal al prelucrarii</h2>
            <p className="mt-2">Prelucram datele dumneavoastra pe baza urmatoarelor temeiuri legale:</p>
            <ul className="mt-3 list-disc pl-5 space-y-1">
              <li>
                <strong>Executarea contractului:</strong> prelucrarea este necesara pentru furnizarea serviciilor
                Platformei (art. 6 alin. 1 lit. b GDPR)
              </li>
              <li>
                <strong>Consimtamantul:</strong> pentru comunicari de marketing si module optionale de analiza
                (art. 6 alin. 1 lit. a GDPR)
              </li>
              <li>
                <strong>Interesul legitim:</strong> pentru imbunatatirea serviciilor, securitate si prevenirea
                fraudei (art. 6 alin. 1 lit. f GDPR)
              </li>
              <li>
                <strong>Obligatii legale:</strong> pentru conformitatea cu legislatia fiscala si contabila
                (art. 6 alin. 1 lit. c GDPR)
              </li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">4. Scopurile prelucrarii</h2>
            <p className="mt-2">Utilizam datele dumneavoastra pentru:</p>
            <ul className="mt-3 list-disc pl-5 space-y-1">
              <li>Crearea si administrarea contului dumneavoastra</li>
              <li>Furnizarea functionalitatilor Platformei (CRM, programari, facturare etc.)</li>
              <li>Comunicarea cu dumneavoastra privind serviciul (notificari, alerte, suport)</li>
              <li>Imbunatatirea si personalizarea experientei de utilizare</li>
              <li>Asigurarea securitatii Platformei</li>
              <li>Conformitatea cu obligatiile legale</li>
            </ul>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">5. Durata stocarii datelor</h2>
            <p className="mt-2">
              Pastram datele dumneavoastra cu caracter personal pe durata utilizarii Platformei si pentru o
              perioada de 30 de zile dupa stergerea contului, pentru a permite recuperarea accidentala. Datele
              necesare conformarii cu obligatiile legale (de ex. date fiscale) pot fi pastrate pentru perioade
              mai lungi, conform legislatiei aplicabile. Jurnalele de activitate sunt sterse automat dupa 12 luni.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">6. Drepturile dumneavoastra</h2>
            <p className="mt-2">
              In conformitate cu GDPR, aveti urmatoarele drepturi cu privire la datele dumneavoastra cu
              caracter personal:
            </p>
            <ul className="mt-3 list-disc pl-5 space-y-1">
              <li>
                <strong>Dreptul de acces:</strong> puteti solicita informatii despre datele pe care le detinem
                despre dumneavoastra
              </li>
              <li>
                <strong>Dreptul la rectificare:</strong> puteti solicita corectarea datelor inexacte sau
                incomplete
              </li>
              <li>
                <strong>Dreptul la stergere:</strong> puteti solicita stergerea datelor dumneavoastra
                („dreptul de a fi uitat")
              </li>
              <li>
                <strong>Dreptul la restrictionarea prelucrarii:</strong> puteti solicita limitarea prelucrarii
                datelor in anumite circumstante
              </li>
              <li>
                <strong>Dreptul la portabilitatea datelor:</strong> puteti solicita datele dumneavoastra
                intr-un format structurat, utilizat frecvent si care poate fi citit automat
              </li>
              <li>
                <strong>Dreptul de opozitie:</strong> puteti va opune prelucrarii datelor in anumite situatii
              </li>
              <li>
                <strong>Dreptul de a retrage consimtamantul:</strong> puteti retrage consimtamantul in orice
                moment, fara a afecta legalitatea prelucrarii anterioare
              </li>
            </ul>
            <p className="mt-3">
              Pentru exercitarea acestor drepturi, contactati-ne la{' '}
              <strong>contact@forja.it.com</strong>. Vom raspunde in termen de 30 de zile.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">7. Module de analiza si preferinte</h2>
            <p className="mt-2">
              Platforma utilizeaza module de analiza tehnice esentiale pentru functionarea corecta a serviciului
              (de ex. sesiune de autentificare, preferinte de limba). Aceste module sunt necesare si nu pot fi
              dezactivate. Module optionale de analiza sunt activate doar cu consimtamantul dumneavoastra
              explicit, pe care il puteti gestiona din bara de preferinte afisata la prima vizita.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">8. Partajarea datelor</h2>
            <p className="mt-2">
              Nu vindem datele dumneavoastra cu caracter personal catre terti. Putem partaja datele cu:
            </p>
            <ul className="mt-3 list-disc pl-5 space-y-1">
              <li>
                <strong>Furnizori de servicii:</strong> companii care ne ajuta sa operam Platforma (hosting,
                email, procesare plati), pe baza unor acorduri de prelucrare a datelor
              </li>
              <li>
                <strong>Autoritati:</strong> cand suntem obligati prin lege sa furnizam datele
              </li>
            </ul>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">9. Securitatea datelor</h2>
            <p className="mt-2">
              Implementam masuri tehnice si organizatorice adecvate pentru protejarea datelor dumneavoastra,
              inclusiv:
            </p>
            <ul className="mt-3 list-disc pl-5 space-y-1">
              <li>Criptarea datelor in tranzit (HTTPS/TLS)</li>
              <li>Stocarea criptata a parolelor</li>
              <li>Autentificare securizata</li>
              <li>Backup-uri regulate</li>
              <li>Acces restrans pe baza de rol</li>
            </ul>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">10. Transferuri internationale</h2>
            <p className="mt-2">
              Datele dumneavoastra sunt stocate pe servere situate in Uniunea Europeana. In cazul in care
              transferul datelor in afara UE/SEE ar fi necesar, vom asigura un nivel adecvat de protectie
              prin clauze contractuale standard sau alte mecanisme aprobate de GDPR.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">11. Plangeri</h2>
            <p className="mt-2">
              Daca considerati ca drepturile dumneavoastra privind protectia datelor au fost incalcate, aveti
              dreptul de a depune o plangere la Autoritatea Nationala de Supraveghere a Prelucrarii Datelor
              cu Caracter Personal (ANSPDCP) <strong>www.dataprotection.ro</strong>.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">12. Modificari</h2>
            <p className="mt-2">
              Aceasta Politica de Confidentialitate poate fi actualizata periodic. Modificarile vor fi
              publicate pe aceasta pagina cu data actualizarii. Pentru modificari semnificative, vom
              notifica utilizatorii prin email.
            </p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">13. Contact</h2>
            <p className="mt-2">
              Pentru intrebari privind aceasta Politica de Confidentialitate sau pentru exercitarea
              drepturilor dumneavoastra, contactati-ne la:
            </p>
            <ul className="mt-3 space-y-1">
              <li>
                <strong>Email:</strong> contact@forja.it.com
              </li>
              <li>
                <strong>Operator:</strong> ForjaIt SRL
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
                  <Link to="/terms" className="hover:text-gray-900 transition-colors">
                    Termeni si Conditii
                  </Link>
                </li>
                <li>
                  <span className="text-gray-900 font-medium">Confidentialitate</span>
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
