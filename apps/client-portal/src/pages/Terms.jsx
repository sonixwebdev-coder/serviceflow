export default function Terms() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Legal</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Termeni si Conditii</h1>
        <p className="mt-3 text-sm text-gray-400">Ultima actualizare: 8 Martie 2026</p>
      </div>

      <div className="prose prose-gray max-w-none space-y-6 text-gray-600 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">1. Utilizarea Platformei</h2>
          <p>
            ForjaIt este o platforma digitala care faciliteaza conexiunea intre furnizori de servicii si clienti.
            Prin accesarea si utilizarea platformei, acceptati sa respectati acesti termeni si conditii.
          </p>
          <p>
            Platforma poate fi utilizata de persoane cu varsta de minim 18 ani sau de minori cu acordul parintilor/tutorilor legali.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">2. Contul de Utilizator</h2>
          <p>
            Pentru a accesa anumite functionalitati ale platformei, este necesar sa va creati un cont.
            Sunteti responsabil pentru mentinerea confidentialitatii datelor de autentificare si pentru toate
            activitatile desfasurate prin intermediul contului dumneavoastra.
          </p>
          <p>
            Va obligati sa furnizati informatii exacte, complete si actualizate la crearea contului si
            sa le actualizati prompt in cazul oricaror modificari.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">3. Programari si Servicii</h2>
          <p>
            Programarile efectuate prin platforma sunt supuse politicilor individuale ale fiecarui furnizor de servicii.
            ForjaIt actioneaza exclusiv ca intermediar si nu este responsabil pentru calitatea,
            disponibilitatea sau pretul serviciilor oferite de furnizori.
          </p>
          <p>
            Anularea sau reprogramarea este posibila conform politicilor furnizorului. Va recomandam sa
            verificati termenii specifici ai fiecarui furnizor inainte de efectuarea unei programari.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">4. Program de Fidelitate</h2>
          <p>
            Furnizorii de servicii pot oferi programe de fidelitate prin platforma. Punctele de loialitate
            sunt acordate conform regulilor stabilite de fiecare furnizor si pot fi folosite pentru
            reduceri sau beneficii suplimentare.
          </p>
          <p>
            Punctele de loialitate nu au valoare monetara si nu pot fi transferate catre alti utilizatori.
            Furnizorul de servicii isi rezerva dreptul de a modifica regulile programului de fidelitate.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">5. Notificari</h2>
          <p>
            Platforma poate trimite notificari push, notificari in aplicatie si emailuri legate de
            programari, mesaje, facturi si alte activitati relevante. Puteti gestiona preferintele
            de notificari din setarile contului.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">6. Plati si Facturare</h2>
          <p>
            Platile pentru servicii se efectueaza direct catre furnizorul de servicii. ForjaIt poate facilita
            procesul de facturare, insa nu proceseaza plati in numele furnizorilor, cu exceptia cazului
            in care se specifica altfel.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">7. Proprietate Intelectuala</h2>
          <p>
            Toate drepturile de proprietate intelectuala asupra platformei ForjaIt, inclusiv dar fara
            a se limita la design, cod sursa, texte si grafice, apartin ForjaIt sau licentiatorilor sai.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">8. Limitarea Raspunderii</h2>
          <p>
            ForjaIt nu garanteaza disponibilitatea neintrerupta a platformei si nu este responsabil
            pentru pierderi directe sau indirecte cauzate de utilizarea sau imposibilitatea utilizarii platformei.
          </p>
          <p>
            In nicio situatie raspunderea ForjaIt nu va depasi valoarea serviciilor platite
            in ultimele 12 luni.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">9. Modificari ale Termenilor</h2>
          <p>
            Ne rezervam dreptul de a modifica acesti termeni in orice moment. Modificarile vor fi
            publicate pe aceasta pagina, iar continuarea utilizarii platformei dupa publicare
            constituie acceptarea noilor termeni.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">10. Contact</h2>
          <p>
            Pentru intrebari legate de acesti termeni, ne puteti contacta la adresa de email:{' '}
            <a href="mailto:contact@forja.it.com" className="text-primary hover:underline">contact@forja.it.com</a>
          </p>
        </section>
      </div>

      <div className="mt-12 border-t border-gray-200 pt-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
          Solutionarea alternativa a litigiilor
        </p>
        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
          <a href="https://anpc.ro/ce-este-sal/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 font-medium transition hover:bg-white hover:text-gray-700 hover:border-gray-300">ANPC - SAL</a>
          <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 font-medium transition hover:bg-white hover:text-gray-700 hover:border-gray-300">Platforma SOL</a>
        </div>
      </div>
    </div>
  );
}
