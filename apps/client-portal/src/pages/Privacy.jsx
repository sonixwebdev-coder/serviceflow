export default function Privacy() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Politica de Confidentialitate</h1>

      <div className="prose prose-gray max-w-none space-y-6 text-gray-600 text-sm leading-relaxed">
        <p>Ultima actualizare: 8 Martie 2026</p>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">1. Date Colectate</h2>
          <p>In cadrul utilizarii platformei ForjaIt, colectam urmatoarele categorii de date personale:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Date de identificare: nume, prenume, adresa de email, numar de telefon</li>
            <li>Date de cont: adresa de email, parola (stocata criptat)</li>
            <li>Date de utilizare: programari, mesaje, interactiuni cu platforma</li>
            <li>Date de fidelitate: puncte acumulate, tranzactii in programul de loialitate</li>
            <li>Date tehnice: adresa IP, tipul dispozitivului, browser-ul utilizat</li>
            <li>Date de notificari: token-uri push, preferinte de notificari</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">2. Scopul Prelucrarii</h2>
          <p>Datele personale sunt prelucrate in urmatoarele scopuri:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Crearea si gestionarea contului de utilizator</li>
            <li>Facilitarea programarilor si comunicarii cu furnizorii de servicii</li>
            <li>Generarea si gestionarea facturilor</li>
            <li>Trimiterea de notificari relevante (programari, mesaje, facturi)</li>
            <li>Administrarea programului de fidelitate si a punctelor de loialitate</li>
            <li>Imbunatatirea platformei si a experientei utilizatorului</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">3. Temeiul Legal</h2>
          <p>Prelucrarea datelor personale se bazeaza pe:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Executarea contractului — pentru furnizarea serviciilor platformei</li>
            <li>Consimtamant — pentru comunicari de marketing (optional)</li>
            <li>Interes legitim — pentru imbunatatirea si securizarea platformei</li>
            <li>Obligatie legala — pentru conformitate fiscala si contabila</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">4. Durata Stocarii</h2>
          <p>
            Datele personale sunt stocate pe durata existentei contului si pentru o perioada de
            maxim 3 ani dupa stergerea contului, conform obligatiilor legale. Datele de facturare
            sunt pastrate conform legislatiei fiscale in vigoare (minim 10 ani).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">5. Drepturile Dumneavoastra</h2>
          <p>Conform Regulamentului GDPR, aveti urmatoarele drepturi:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Dreptul de acces</strong> — puteti solicita o copie a datelor personale prelucrate</li>
            <li><strong>Dreptul la rectificare</strong> — puteti solicita corectarea datelor inexacte</li>
            <li><strong>Dreptul la stergere</strong> — puteti solicita stergerea datelor personale</li>
            <li><strong>Dreptul la portabilitate</strong> — puteti solicita transferul datelor catre alt operator</li>
            <li><strong>Dreptul la opozitie</strong> — va puteti opune prelucrarii in anumite situatii</li>
            <li><strong>Dreptul la restrictionarea prelucrarii</strong> — puteti solicita limitarea prelucrarii</li>
          </ul>
          <p className="mt-3">
            Pentru exercitarea acestor drepturi, va rugam sa ne contactati la adresa: contact@forja.it.com
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">6. Cookie-uri</h2>
          <p>
            Platforma utilizeaza cookie-uri esentiale pentru functionarea corecta a aplicatiei
            (autentificare, sesiune). Nu utilizam cookie-uri de tracking sau publicitate
            fara consimtamantul dumneavoastra explicit.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">7. Securitatea Datelor</h2>
          <p>
            Implementam masuri tehnice si organizatorice adecvate pentru protectia datelor personale,
            inclusiv criptarea parolelor, comunicatii securizate (HTTPS) si acces restrictionat
            la bazele de date.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">8. Contact</h2>
          <p>
            Pentru intrebari legate de prelucrarea datelor personale sau pentru exercitarea drepturilor
            dumneavoastra, ne puteti contacta la:
          </p>
          <p className="mt-2">
            Email: contact@forja.it.com
          </p>
          <p>
            De asemenea, aveti dreptul de a depune o plangere la Autoritatea Nationala de Supraveghere
            a Prelucrarii Datelor cu Caracter Personal (ANSPDCP).
          </p>
        </section>
      </div>

      {/* ANPC */}
      <div className="mt-12 border-t border-gray-200 pt-8">
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
            Platforma SOL (Online Dispute Resolution)
          </a>
        </div>
      </div>
    </div>
  );
}
