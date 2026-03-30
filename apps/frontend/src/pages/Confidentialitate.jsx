import { Link } from 'react-router-dom';
import PublicHeader from '../components/landing/PublicHeader';
import PublicFooter from '../components/landing/PublicFooter';
import SEOHead from '../components/landing/SEOHead';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white">
      <SEOHead
        title="Politica de Confidentialitate — ForjaIt"
        description="Politica de confidentialitate ForjaIt. Cum colectam, stocam si protejam datele tale personale. Conform GDPR si Legii nr. 190/2018."
        canonical="https://app.forja.it.com/privacy"
      />
      <PublicHeader />

      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Politica de Confidentialitate</h1>
        <p className="mt-2 text-sm text-gray-500">Ultima actualizare: 8 martie 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-gray-700">
          {/* 1 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900">1. Operatorul de date</h2>
            <p className="mt-2">
              Operatorul de date cu caracter personal este ForjaIt, cu sediul in Romania. Aceasta
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
              Pastram datele dumneavoastra cu caracter personal conform principiului minimizarii datelor (GDPR) si
              in conformitate cu legislatia nationala aplicabila. Perioadele de retentie sunt urmatoarele:
            </p>
            <ul className="mt-3 list-disc pl-5 space-y-1">
              <li>
                <strong>Date de cont si profil:</strong> pe durata utilizarii Platformei si pentru 30 de zile
                dupa stergerea contului, pentru a permite recuperarea accidentala
              </li>
              <li>
                <strong>Documente financiar-contabile (facturi, chitante, documente justificative):</strong> 5 ani,
                calculati de la 1 iulie al anului urmator incheierii exercitiului financiar in care au fost intocmite
                (Legea contabilitatii nr. 82/1991, modificata prin Legea nr. 36/2023)
              </li>
              <li>
                <strong>Situatii financiare anuale si rapoarte:</strong> 10 ani (Legea nr. 82/1991)
              </li>
              <li>
                <strong>Date despre clienti si programari:</strong> pe durata relatiei contractuale cu organizatia
                care le-a introdus, plus 3 ani dupa incetarea relatiei (termenul general de prescriptie conform
                Codului Civil)
              </li>
              <li>
                <strong>Jurnale de activitate si date tehnice:</strong> 12 luni, apoi se sterg automat
              </li>
              <li>
                <strong>Date de marketing (consimtamant):</strong> pana la retragerea consimtamantului
              </li>
            </ul>
            <p className="mt-3">
              La expirarea perioadelor de retentie, datele sunt sterse definitiv sau anonimizate ireversibil.
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
            <h2 className="text-lg font-semibold text-gray-900">7. Cookie-uri si date stocate local</h2>
            <p className="mt-2">
              In conformitate cu Legea nr. 506/2004 si Directiva ePrivacy, Platforma utilizeaza urmatoarele
              tipuri de cookie-uri si mecanisme de stocare locala:
            </p>
            <ul className="mt-3 list-disc pl-5 space-y-1">
              <li>
                <strong>Cookie-uri strict necesare (fara consimtamant):</strong> cookie de sesiune pentru
                autentificare (httpOnly, securizat), token CSRF pentru protectia formularelor, preferinte de
                interfata. Acestea sunt esentiale pentru functionarea Platformei si nu pot fi dezactivate.
              </li>
              <li>
                <strong>Stocare locala (localStorage):</strong> preferintele utilizatorului (tema, sidebar,
                filtre salvate), date de sesiune pentru experienta de utilizare. Nu contin date cu caracter
                personal sensibile.
              </li>
              <li>
                <strong>Cookie-uri de analiza (cu consimtamant):</strong> pot fi activate optional pentru a
                intelege cum este utilizata Platforma si a imbunatati experienta. Acestea sunt activate doar
                cu consimtamantul dumneavoastra explicit.
              </li>
            </ul>
            <p className="mt-3">
              Puteti gestiona preferintele privind cookie-urile din bannerul afisat la prima vizita sau din
              setarile browserului. Dezactivarea cookie-urilor strict necesare poate afecta functionarea Platformei.
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
                <strong>Operator:</strong> ForjaIt
              </li>
            </ul>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
