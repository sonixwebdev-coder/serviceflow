import { generateBlockId } from '@/hooks/useWebsiteBuilder';

// Helper to create block with unique ID
const block = (type, data = {}, settings = {}) => ({
  id: generateBlockId(type),
  type,
  data,
  settings: {
    padding: { top: 40, bottom: 40 },
    maxWidth: 'lg',
    alignment: 'center',
    ...settings,
  },
});

// Reusable legal pages added to all templates
const legalPages = () => [
  {
    slug: 'termeni-si-conditii',
    title: 'Termeni si conditii',
    pageType: 'CUSTOM',
    isPublished: true,
    content: [
      block('text', {
        content: `<h1>Termeni si conditii</h1>
<p><em>Ultima actualizare: ${new Date().toLocaleDateString('ro-RO')}</em></p>

<h2>1. Informatii generale</h2>
<p>Prezentul document stabileste termenii si conditiile de utilizare a site-ului web operat de compania noastra. Prin accesarea si utilizarea acestui site, sunteti de acord cu acesti termeni.</p>

<h2>2. Servicii</h2>
<p>Serviciile oferite prin intermediul acestui site sunt descrise in sectiunile dedicate. Ne rezervam dreptul de a modifica, suspenda sau intrerupe orice serviciu fara notificare prealabila.</p>

<h2>3. Programari</h2>
<p>Programarile efectuate prin site sunt supuse disponibilitatii. Confirmarea programarii va fi trimisa prin email sau telefon. Anularea sau reprogramarea trebuie facuta cu cel putin 24 de ore inainte.</p>

<h2>4. Preturi si plati</h2>
<p>Preturile afisate pe site sunt informative si pot fi modificate fara notificare prealabila. Pretul final va fi comunicat la momentul prestarii serviciului.</p>

<h2>5. Proprietate intelectuala</h2>
<p>Continutul acestui site (texte, imagini, logo-uri, design) este protejat de drepturile de autor si nu poate fi reprodus fara acordul scris al companiei.</p>

<h2>6. Limitarea raspunderii</h2>
<p>Compania nu isi asuma raspunderea pentru eventualele erori sau omisiuni in continutul site-ului. Informatiile sunt furnizate "ca atare", fara garantii de niciun fel.</p>

<h2>7. Modificari</h2>
<p>Ne rezervam dreptul de a modifica acesti termeni in orice moment. Modificarile intra in vigoare la data publicarii pe site.</p>

<h2>8. Contact</h2>
<p>Pentru intrebari legate de acesti termeni, ne puteti contacta folosind datele de contact disponibile pe site.</p>`,
        format: 'prose',
      }, { maxWidth: 'md', padding: { top: 60, bottom: 60 } }),
    ],
  },
  {
    slug: 'politica-de-confidentialitate',
    title: 'Politica de confidentialitate',
    pageType: 'CUSTOM',
    isPublished: true,
    content: [
      block('text', {
        content: `<h1>Politica de confidentialitate</h1>
<p><em>Ultima actualizare: ${new Date().toLocaleDateString('ro-RO')}</em></p>

<h2>1. Introducere</h2>
<p>Protectia datelor dumneavoastra personale este importanta pentru noi. Aceasta politica descrie modul in care colectam, utilizam si protejam informatiile personale in conformitate cu Regulamentul General privind Protectia Datelor (GDPR).</p>

<h2>2. Date colectate</h2>
<p>Colectam urmatoarele tipuri de date personale:</p>
<ul>
<li>Nume si prenume</li>
<li>Adresa de email</li>
<li>Numar de telefon</li>
<li>Date despre programari si servicii solicitate</li>
<li>Date tehnice (adresa IP, tip browser) prin cookie-uri</li>
</ul>

<h2>3. Scopul prelucrarii</h2>
<p>Datele personale sunt prelucrate in urmatoarele scopuri:</p>
<ul>
<li>Furnizarea serviciilor solicitate</li>
<li>Gestionarea programarilor</li>
<li>Comunicarea cu clientii</li>
<li>Imbunatatirea serviciilor noastre</li>
<li>Respectarea obligatiilor legale</li>
</ul>

<h2>4. Temeiul legal</h2>
<p>Prelucrarea datelor se bazeaza pe: consimtamantul dumneavoastra, executarea unui contract, obligatii legale sau interesul nostru legitim.</p>

<h2>5. Durata stocarii</h2>
<p>Datele personale sunt stocate pe durata necesara indeplinirii scopurilor pentru care au fost colectate, dar nu mai mult de 5 ani de la ultima interactiune, cu exceptia cazurilor in care legea impune o perioada mai lunga.</p>

<h2>6. Drepturile dumneavoastra</h2>
<p>Aveti urmatoarele drepturi conform GDPR:</p>
<ul>
<li>Dreptul de acces la datele personale</li>
<li>Dreptul la rectificarea datelor inexacte</li>
<li>Dreptul la stergerea datelor ("dreptul de a fi uitat")</li>
<li>Dreptul la restrictionarea prelucrarii</li>
<li>Dreptul la portabilitatea datelor</li>
<li>Dreptul de opozitie</li>
</ul>

<h2>7. Securitatea datelor</h2>
<p>Implementam masuri tehnice si organizatorice adecvate pentru a proteja datele personale impotriva accesului neautorizat, pierderii sau distrugerii.</p>

<h2>8. Cookie-uri</h2>
<p>Acest site utilizeaza cookie-uri pentru a imbunatati experienta de navigare. Puteti gestiona preferintele legate de cookie-uri din setarile browserului.</p>

<h2>9. Contact</h2>
<p>Pentru exercitarea drepturilor sau intrebari privind prelucrarea datelor personale, ne puteti contacta folosind datele de contact disponibile pe site.</p>`,
        format: 'prose',
      }, { maxWidth: 'md', padding: { top: 60, bottom: 60 } }),
    ],
  },
];

// ─────────────────────────────────────────────
// AUTO DETAILING
// ─────────────────────────────────────────────
export const autoDetailingTemplate = {
  id: 'auto-detailing',
  name: 'Auto Detailing',
  description: 'Ideal pentru spalatorii auto si detailing profesional',
  thumbnail: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?w=640&h=360&fit=crop&q=80',
  sector: 'AUTOMOTIVE',
  pages: [
    {
      slug: 'home',
      title: 'Acasa',
      pageType: 'HOME',
      isPublished: true,
      content: [
        block('hero', {
          title: 'Detailing Auto Profesional',
          subtitle: 'Servicii de curatare si ingrijire auto la cele mai inalte standarde',
          backgroundImage: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?w=1920',
          backgroundOverlay: 0.5,
          ctaText: 'Programeaza acum',
          ctaLink: '/booking',
          secondaryCtaText: 'Vezi serviciile',
          secondaryCtaLink: '/servicii',
          layout: 'centered',
          height: 'large',
        }, { padding: { top: 0, bottom: 0 } }),
        block('text', {
          content: '<h2 style="text-align:center">De ce sa ne alegi pe noi?</h2><p style="text-align:center">Cu o experienta de peste 10 ani in domeniul detailing-ului auto, echipa noastra transforma fiecare masina intr-o opera de arta. Folosim exclusiv produse profesionale si tehnici de ultima generatie.</p>',
          format: 'prose',
        }, { maxWidth: 'md', padding: { top: 60, bottom: 60 }, backgroundColor: '#f9fafb' }),
        block('stats', {
          title: '',
          subtitle: '',
          stats: [
            { value: '500+', label: 'Clienti multumiti' },
            { value: '10+', label: 'Ani experienta' },
            { value: '15000+', label: 'Masini ingrijite' },
            { value: '4.9', label: 'Rating mediu' },
          ],
          columns: 4,
        }, { padding: { top: 60, bottom: 60 }, backgroundColor: '#f9fafb' }),
        block('services-grid', {
          title: 'Serviciile noastre',
          subtitle: 'Alege pachetul potrivit pentru masina ta',
          autoSync: true,
          columns: 3,
          showPrices: true,
          showBookButton: true,
        }, { padding: { top: 60, bottom: 60 } }),
        block('faq', {
          title: 'Intrebari frecvente',
          subtitle: 'Raspunsuri la cele mai frecvente intrebari',
          items: [
            { question: 'Cat dureaza un detailing complet?', answer: 'Un detailing complet dureaza intre 4-8 ore, in functie de starea masinii si pachetul ales.' },
            { question: 'Oferiti garantie pentru servicii?', answer: 'Da, oferim garantie pentru toate serviciile noastre. Protectia ceramica are garantie de pana la 5 ani.' },
            { question: 'Trebuie sa fac programare?', answer: 'Da, recomandam programarea in avans pentru a va asigura un loc. Puteti programa online sau telefonic.' },
            { question: 'Ce produse folositi?', answer: 'Folosim exclusiv produse profesionale de la branduri renumite precum Gyeon, Koch Chemie si CarPro.' },
          ],
        }, { padding: { top: 60, bottom: 60 } }),
        block('divider', {}, { padding: { top: 10, bottom: 10 } }),
        block('testimonials', {
          title: 'Ce spun clientii nostri',
          subtitle: 'Peste 500 de clienti multumiti',
          testimonials: [
            { name: 'Andrei Popescu', content: 'Servicii de top! Masina arata ca noua dupa detailing-ul complet. Recomand cu incredere!', rating: 5, role: 'Client fidel' },
            { name: 'Maria Ionescu', content: 'Profesionalism si atentie la detalii. Cel mai bun detailing din oras, fara discutie.', rating: 5, role: 'Client' },
            { name: 'Ion Dumitrescu', content: 'Am fost placut surprins de calitatea serviciilor. Masina straluceste si dupa 2 saptamani.', rating: 5, role: 'Client fidel' },
          ],
          layout: 'carousel',
          showRating: true,
        }, { padding: { top: 60, bottom: 60 }, backgroundColor: '#f9fafb' }),
        block('button', {
          text: 'Programeaza o sedinta',
          link: '/booking',
          variant: 'primary',
          size: 'lg',
          align: 'center',
        }, { padding: { top: 20, bottom: 60 } }),
      ],
    },
    {
      slug: 'galerie',
      title: 'Galerie',
      pageType: 'GALLERY',
      isPublished: true,
      content: [
        block('hero', {
          title: 'Galeria noastra',
          subtitle: 'Rezultate care vorbesc de la sine',
          backgroundImage: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=1920',
          backgroundOverlay: 0.6,
          layout: 'centered',
          height: 'small',
        }, { padding: { top: 0, bottom: 0 } }),
        block('gallery', {
          title: 'Lucrarile noastre recente',
          subtitle: 'Inainte si dupa - diferenta se vede',
          images: [
            { src: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800&h=600&fit=crop&q=80', alt: 'Detailing exterior BMW' },
            { src: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&h=600&fit=crop&q=80', alt: 'Polish profesional' },
            { src: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=600&fit=crop&q=80', alt: 'Curatare interioara premium' },
            { src: 'https://images.unsplash.com/photo-1542362567-b07e54358753?w=800&h=600&fit=crop&q=80', alt: 'Protectie ceramica aplicata' },
            { src: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&h=600&fit=crop&q=80', alt: 'Rezultat final stralucitor' },
            { src: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&h=600&fit=crop&q=80', alt: 'Detailing complet finalizat' },
          ],
          columns: 3,
          layout: 'grid',
          showLightbox: true,
        }),
      ],
    },
    {
      slug: 'echipa',
      title: 'Echipa',
      pageType: 'TEAM',
      isPublished: true,
      content: [
        block('hero', {
          title: 'Echipa noastra',
          subtitle: 'Profesionisti pasionati de detailing auto',
          backgroundImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1920',
          backgroundOverlay: 0.6,
          layout: 'centered',
          height: 'small',
        }, { padding: { top: 0, bottom: 0 } }),
        block('team-grid', {
          title: 'Cine suntem',
          subtitle: 'Fiecare membru al echipei este certificat si cu experienta',
          autoSync: true,
          columns: 3,
          showBio: true,
        }),
      ],
    },
    {
      slug: 'contact',
      title: 'Contact',
      pageType: 'CONTACT',
      isPublished: true,
      content: [
        block('hero', {
          title: 'Contacteaza-ne',
          subtitle: 'Suntem aici sa te ajutam',
          backgroundImage: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=1920',
          backgroundOverlay: 0.6,
          layout: 'centered',
          height: 'small',
        }, { padding: { top: 0, bottom: 0 } }),
        block('contact-form', {
          title: 'Trimite-ne un mesaj',
          subtitle: 'Raspundem in maxim 24 de ore',
          showPhone: true,
          showAddress: true,
          contactInfo: {
            phone: '0712 345 678',
            address: 'Str. Exemplu nr. 10, Bucuresti',
          },
        }),
        block('locations-map', {
          title: 'Unde ne gasesti',
          autoSync: true,
          showHours: true,
          showContact: true,
        }),
      ],
    },
    ...legalPages(),
  ],
  branding: {
    primaryColor: '#1e3a5f',
    secondaryColor: '#2563eb',
  },
  seoDefaults: {
    title: 'Detailing Auto Profesional',
    description: 'Servicii de detailing auto, curatare interioara si exterioara, polish, ceramica si protectie vopsea.',
  },
};

// ─────────────────────────────────────────────
// SERVICE AUTO
// ─────────────────────────────────────────────
export const autoServiceTemplate = {
  id: 'auto-service',
  name: 'Service Auto',
  description: 'Pentru service-uri auto, mecanica, tinichigerie si vopsitorie',
  thumbnail: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=640&h=360&fit=crop&q=80',
  sector: 'AUTOMOTIVE',
  pages: [
    {
      slug: 'home',
      title: 'Acasa',
      pageType: 'HOME',
      isPublished: true,
      content: [
        block('hero', {
          title: 'Service Auto de Incredere',
          subtitle: 'Reparatii, revizii si diagnosticare pentru toate marcile auto',
          backgroundImage: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=1920',
          backgroundOverlay: 0.5,
          ctaText: 'Programeaza o revizie',
          ctaLink: '/booking',
          secondaryCtaText: 'Lista servicii',
          secondaryCtaLink: '/servicii',
          layout: 'centered',
          height: 'large',
        }, { padding: { top: 0, bottom: 0 } }),
        block('text', {
          content: '<h2 style="text-align:center">Servicii auto complete</h2><p style="text-align:center">De la revizii periodice la reparatii complexe, echipa noastra de mecanici cu experienta se ocupa de tot. Folosim echipamente de ultima generatie si piese de calitate pentru fiecare interventie.</p>',
          format: 'prose',
        }, { maxWidth: 'md', padding: { top: 60, bottom: 20 }, backgroundColor: '#f9fafb' }),
        block('stats', {
          title: '',
          subtitle: '',
          stats: [
            { value: '3000+', label: 'Masini reparate' },
            { value: '15+', label: 'Ani experienta' },
            { value: '98%', label: 'Clienti multumiti' },
            { value: '24h', label: 'Timp mediu reparatie' },
          ],
          columns: 4,
        }, { padding: { top: 60, bottom: 60 }, backgroundColor: '#f9fafb' }),
        block('services-grid', {
          title: 'Ce putem face pentru masina ta',
          autoSync: true,
          columns: 3,
          showPrices: true,
          showBookButton: true,
        }, { padding: { top: 60, bottom: 60 } }),
        block('faq', {
          title: 'Intrebari frecvente',
          subtitle: 'Raspunsuri la cele mai comune intrebari',
          items: [
            { question: 'Cat dureaza o revizie completa?', answer: 'O revizie completa dureaza intre 2-4 ore, in functie de marca si modelul masinii.' },
            { question: 'Oferiti masina de inlocuire?', answer: 'Da, pentru reparatii care dureaza mai mult de o zi, oferim masina de inlocuire gratuit.' },
            { question: 'Ce garantie oferiti?', answer: 'Oferim garantie de 12-24 luni pentru manopera si piese, in functie de tipul interventiei.' },
            { question: 'Lucrati cu toate marcile auto?', answer: 'Da, avem experienta cu toate marcile auto, inclusiv masini premium si de lux.' },
          ],
        }, { padding: { top: 60, bottom: 60 } }),
        block('divider', {}, { padding: { top: 10, bottom: 10 } }),
        block('testimonials', {
          title: 'Parerea clientilor',
          subtitle: 'Sute de clienti multumiti an de an',
          testimonials: [
            { name: 'Cristian Gheorghe', content: 'Service serios si de incredere. Au gasit problema rapid si au reparat-o la un pret corect.', rating: 5, role: 'Client' },
            { name: 'Elena Stanescu', content: 'Mecanici foarte priceputi. Vin aici de 3 ani si nu am fost dezamagita niciodata.', rating: 5, role: 'Client fidel' },
            { name: 'Mihai Radu', content: 'Transparenta totala in ceea ce priveste costurile si timpul de reparatie. Bravo!', rating: 5, role: 'Client' },
          ],
          layout: 'carousel',
          showRating: true,
        }, { padding: { top: 60, bottom: 60 }, backgroundColor: '#f9fafb' }),
        block('button', {
          text: 'Programeaza online',
          link: '/booking',
          variant: 'primary',
          size: 'lg',
          align: 'center',
        }, { padding: { top: 20, bottom: 60 } }),
      ],
    },
    {
      slug: 'servicii',
      title: 'Servicii',
      pageType: 'SERVICES',
      isPublished: true,
      content: [
        block('hero', {
          title: 'Serviciile noastre',
          subtitle: 'De la revizie la reparatii complexe, acoperim tot',
          backgroundImage: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=1920',
          backgroundOverlay: 0.6,
          layout: 'centered',
          height: 'small',
        }, { padding: { top: 0, bottom: 0 } }),
        block('services-grid', {
          title: 'Lista completa de servicii',
          subtitle: 'Selecteaza un serviciu pentru detalii si preturi',
          autoSync: true,
          columns: 3,
          showPrices: true,
          showDuration: true,
          showBookButton: true,
        }),
        block('text', {
          content: '<h3>De ce sa alegi service-ul nostru?</h3><ul><li><strong>Echipamente moderne</strong> - Diagnosticare computerizata de ultima generatie</li><li><strong>Piese de calitate</strong> - Folosim piese OEM si aftermarket premium</li><li><strong>Garantie</strong> - Oferim garantie pentru manopera si piese</li><li><strong>Transparenta</strong> - Esti informat la fiecare pas al reparatiei</li></ul>',
          format: 'prose',
        }, { maxWidth: 'md', padding: { top: 40, bottom: 60 }, backgroundColor: '#f9fafb' }),
      ],
    },
    {
      slug: 'echipa',
      title: 'Echipa',
      pageType: 'TEAM',
      isPublished: true,
      content: [
        block('hero', {
          title: 'Echipa noastra',
          subtitle: 'Mecanici cu experienta si certificari internationale',
          backgroundImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1920',
          backgroundOverlay: 0.6,
          layout: 'centered',
          height: 'small',
        }, { padding: { top: 0, bottom: 0 } }),
        block('team-grid', {
          title: 'Profesionistii nostri',
          subtitle: 'Fiecare mecanic are minim 5 ani de experienta in domeniu',
          autoSync: true,
          columns: 3,
          showBio: true,
        }),
      ],
    },
    {
      slug: 'contact',
      title: 'Contact',
      pageType: 'CONTACT',
      isPublished: true,
      content: [
        block('hero', {
          title: 'Contacteaza-ne',
          subtitle: 'Programeaza o vizita sau solicita o oferta',
          backgroundImage: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=1920',
          backgroundOverlay: 0.6,
          layout: 'centered',
          height: 'small',
        }, { padding: { top: 0, bottom: 0 } }),
        block('contact-form', {
          title: 'Solicita o programare',
          subtitle: 'Descrie-ne problema si te contactam rapid',
          showPhone: true,
          showAddress: true,
          contactInfo: {
            phone: '0712 345 678',
            address: 'Str. Exemplu nr. 20, Bucuresti',
          },
        }),
        block('locations-map', {
          title: 'Locatia noastra',
          autoSync: true,
          showHours: true,
          showContact: true,
        }),
      ],
    },
    ...legalPages(),
  ],
  branding: {
    primaryColor: '#b91c1c',
    secondaryColor: '#dc2626',
  },
  seoDefaults: {
    title: 'Service Auto Profesional',
    description: 'Reparatii auto, revizii, diagnosticare computerizata, tinichigerie si vopsitorie. Toate marcile auto.',
  },
};

// ─────────────────────────────────────────────
// MAGAZIN PIESE AUTO
// ─────────────────────────────────────────────
export const autoPartsTemplate = {
  id: 'auto-parts',
  name: 'Magazin piese auto',
  description: 'Pentru magazine de piese auto, accesorii si consumabile',
  thumbnail: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=640&h=360&fit=crop&q=80',
  sector: 'AUTOMOTIVE',
  pages: [
    {
      slug: 'home',
      title: 'Acasa',
      pageType: 'HOME',
      isPublished: true,
      content: [
        block('hero', {
          title: 'Piese Auto pentru Toate Marcile',
          subtitle: 'Piese originale si aftermarket, livrare rapida in toata tara',
          backgroundImage: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1920',
          backgroundOverlay: 0.5,
          ctaText: 'Solicita o oferta',
          ctaLink: '/contact',
          secondaryCtaText: 'Vezi catalogul',
          secondaryCtaLink: '/produse',
          layout: 'centered',
          height: 'large',
        }, { padding: { top: 0, bottom: 0 } }),
        block('text', {
          content: '<h2 style="text-align:center">Totul pentru masina ta, intr-un singur loc</h2><p style="text-align:center">Cu un stoc de peste 50.000 de piese si accesorii, gasesti rapid si usor tot ce ai nevoie. Oferim consiliere gratuita pentru a te ajuta sa alegi piesa potrivita.</p>',
          format: 'prose',
        }, { maxWidth: 'md', padding: { top: 60, bottom: 20 }, backgroundColor: '#f9fafb' }),
        block('stats', {
          title: '',
          subtitle: '',
          stats: [
            { value: '50000+', label: 'Piese in stoc' },
            { value: '10000+', label: 'Clienti multumiti' },
            { value: '24h', label: 'Livrare rapida' },
            { value: '100%', label: 'Piese originale' },
          ],
          columns: 4,
        }, { padding: { top: 60, bottom: 60 }, backgroundColor: '#f9fafb' }),
        block('services-grid', {
          title: 'Categorii de produse',
          subtitle: 'Gaseste piesa potrivita',
          autoSync: true,
          columns: 4,
          showPrices: true,
        }, { padding: { top: 60, bottom: 60 } }),
        block('faq', {
          title: 'Intrebari frecvente',
          subtitle: '',
          items: [
            { question: 'Cum pot sti daca piesa este compatibila cu masina mea?', answer: 'Trimite-ne marca, modelul, anul de fabricatie si seria VIN, iar noi iti confirmam compatibilitatea.' },
            { question: 'Care este timpul de livrare?', answer: 'Comenzile plasate pana la ora 14:00 sunt expediate in aceeasi zi. Livrarea dureaza 1-2 zile lucratoare.' },
            { question: 'Oferiti garantie pentru piese?', answer: 'Da, toate piesele vin cu garantie de la producator, intre 6 si 24 de luni in functie de produs.' },
            { question: 'Pot returna o piesa?', answer: 'Da, acceptam retururi in termen de 30 de zile daca piesa nu a fost montata si este in ambalajul original.' },
          ],
        }, { padding: { top: 60, bottom: 60 } }),
        block('divider', {}, { padding: { top: 10, bottom: 10 } }),
        block('testimonials', {
          title: 'Parerea clientilor',
          subtitle: 'Peste 10.000 de clienti multumiti',
          testimonials: [
            { name: 'Vlad Marinescu', content: 'Piese de calitate la preturi excelente. Comand de fiecare data de aici si sunt mereu multumit.', rating: 5, role: 'Client fidel' },
            { name: 'Ana Popa', content: 'Livrare rapida si consiliere profesionala. Mi-au gasit exact piesa de care aveam nevoie.', rating: 5, role: 'Client' },
            { name: 'Stefan Nistor', content: 'Stoc bogat si personal amabil. Cel mai bun magazin de piese auto din zona.', rating: 5, role: 'Client' },
          ],
          layout: 'grid',
          showRating: true,
        }, { padding: { top: 60, bottom: 60 }, backgroundColor: '#f9fafb' }),
      ],
    },
    {
      slug: 'produse',
      title: 'Produse',
      pageType: 'SERVICES',
      isPublished: true,
      content: [
        block('hero', {
          title: 'Catalogul nostru',
          subtitle: 'Piese si accesorii pentru toate marcile auto',
          backgroundImage: 'https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?w=1920',
          backgroundOverlay: 0.6,
          layout: 'centered',
          height: 'small',
        }, { padding: { top: 0, bottom: 0 } }),
        block('services-grid', {
          title: 'Toate categoriile',
          autoSync: true,
          columns: 3,
          showPrices: true,
        }),
        block('text', {
          content: '<h3>De ce sa cumperi de la noi?</h3><ul><li><strong>Stoc larg</strong> - Peste 50.000 de piese in stoc permanent</li><li><strong>Preturi competitive</strong> - Cele mai bune preturi de pe piata</li><li><strong>Livrare rapida</strong> - Expediem in aceeasi zi pentru comenzile pana la ora 14:00</li><li><strong>Consiliere gratuita</strong> - Te ajutam sa gasesti piesa potrivita</li></ul>',
          format: 'prose',
        }, { maxWidth: 'md', padding: { top: 40, bottom: 60 }, backgroundColor: '#f9fafb' }),
      ],
    },
    {
      slug: 'contact',
      title: 'Contact',
      pageType: 'CONTACT',
      isPublished: true,
      content: [
        block('hero', {
          title: 'Solicita o oferta',
          subtitle: 'Spune-ne ce cauti si revenim cu cel mai bun pret',
          backgroundImage: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=1920',
          backgroundOverlay: 0.6,
          layout: 'centered',
          height: 'small',
        }, { padding: { top: 0, bottom: 0 } }),
        block('contact-form', {
          title: 'Trimite o cerere de oferta',
          subtitle: 'Raspundem in maxim 2 ore in timpul programului',
          fields: [
            { key: 'firstName', label: 'Prenume', type: 'text', required: true },
            { key: 'lastName', label: 'Nume', type: 'text', required: true },
            { key: 'phone', label: 'Telefon', type: 'phone', required: true },
            { key: 'email', label: 'Email', type: 'email', required: true },
            { key: 'carModel', label: 'Marca si model auto', type: 'text', required: true },
            { key: 'year', label: 'An fabricatie', type: 'text', required: false },
            { key: 'message', label: 'Ce piesa cauti?', type: 'textarea', required: true },
          ],
          submitText: 'Trimite cererea',
          showPhone: true,
          contactInfo: {
            phone: '0712 345 678',
          },
        }),
        block('locations-map', {
          title: 'Punctele noastre de lucru',
          autoSync: true,
          showHours: true,
          showContact: true,
        }),
      ],
    },
    ...legalPages(),
  ],
  branding: {
    primaryColor: '#0369a1',
    secondaryColor: '#0ea5e9',
  },
  seoDefaults: {
    title: 'Magazin Piese Auto',
    description: 'Piese auto originale si aftermarket pentru toate marcile. Livrare rapida, preturi competitive, consiliere gratuita.',
  },
};

// ─────────────────────────────────────────────
// SALON DE INFRUMUSETARE
// ─────────────────────────────────────────────
export const beautySalonTemplate = {
  id: 'beauty-salon',
  name: 'Salon de infrumusetare',
  description: 'Perfect pentru saloane de coafura, cosmetica si spa',
  thumbnail: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=640&h=360&fit=crop&q=80',
  sector: 'BEAUTY',
  pages: [
    {
      slug: 'home',
      title: 'Acasa',
      pageType: 'HOME',
      isPublished: true,
      content: [
        block('hero', {
          title: 'Frumusetea ta, prioritatea noastra',
          subtitle: 'Rasfata-te cu servicii premium de infrumusetare',
          backgroundImage: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1920',
          backgroundOverlay: 0.4,
          ctaText: 'Fa o programare',
          ctaLink: '/booking',
          secondaryCtaText: 'Descopera serviciile',
          secondaryCtaLink: '/servicii',
          layout: 'centered',
          height: 'large',
        }, { padding: { top: 0, bottom: 0 } }),
        block('text', {
          content: '<h2 style="text-align:center">Bine ai venit la Salonul nostru</h2><p style="text-align:center">Cu o experienta de peste 10 ani in domeniu, echipa noastra de stilisti va ofera servicii de cea mai inalta calitate. Folosim exclusiv produse profesionale pentru rezultate impecabile.</p>',
          format: 'prose',
        }, { maxWidth: 'md', padding: { top: 60, bottom: 20 }, backgroundColor: '#f9fafb' }),
        block('stats', {
          title: '',
          subtitle: '',
          stats: [
            { value: '2000+', label: 'Clienti fideli' },
            { value: '10+', label: 'Ani experienta' },
            { value: '4.9', label: 'Rating Google' },
            { value: '15+', label: 'Stilisti experti' },
          ],
          columns: 4,
        }, { padding: { top: 60, bottom: 60 }, backgroundColor: '#f9fafb' }),
        block('services-grid', {
          title: 'Serviciile noastre populare',
          subtitle: 'De la coafura la tratamente spa complete',
          autoSync: true,
          columns: 3,
          showPrices: true,
          showDuration: true,
          showBookButton: true,
        }, { padding: { top: 60, bottom: 60 } }),
        block('pricing-table', {
          title: 'Pachete populare',
          subtitle: 'Alege pachetul potrivit pentru tine',
          plans: [
            {
              name: 'Basic',
              description: 'Servicii esentiale de ingrijire',
              price: '99',
              currency: 'RON',
              period: 'sedinta',
              featured: false,
              features: ['Tuns si coafat', 'Spalat si uscat', 'Styling simplu'],
              ctaText: 'Programeaza',
              ctaLink: '/booking',
            },
            {
              name: 'Premium',
              description: 'Experienta completa de infrumusetare',
              price: '199',
              currency: 'RON',
              period: 'sedinta',
              featured: true,
              features: ['Tuns si coafat', 'Tratament par', 'Manichiura', 'Styling avansat'],
              ctaText: 'Programeaza',
              ctaLink: '/booking',
            },
            {
              name: 'VIP',
              description: 'Rasfat complet de la A la Z',
              price: '349',
              currency: 'RON',
              period: 'sedinta',
              featured: false,
              features: ['Tuns si coafat', 'Tratament par premium', 'Manichiura + pedichiura', 'Tratament facial', 'Styling complet'],
              ctaText: 'Programeaza',
              ctaLink: '/booking',
            },
          ],
          showCta: true,
        }, { padding: { top: 60, bottom: 60 }, backgroundColor: '#f9fafb' }),
        block('divider', {}, { padding: { top: 10, bottom: 10 } }),
        block('testimonials', {
          title: 'Ce spun clientele noastre',
          testimonials: [
            { name: 'Ioana Vasilescu', content: 'Cel mai bun salon din oras! Stilistii sunt foarte talentati si atenti la cerintele mele.', rating: 5, role: 'Clienta fidela' },
            { name: 'Raluca Marin', content: 'Servicii impecabile si atmosfera relaxanta. Vin aici de 2 ani si sunt mereu incantata.', rating: 5, role: 'Clienta' },
            { name: 'Diana Costache', content: 'Tratamentul facial a fost extraordinar. Tenul meu arata fantastic! Recomand cu caldura.', rating: 5, role: 'Clienta' },
          ],
          layout: 'carousel',
          showRating: true,
        }, { padding: { top: 60, bottom: 60 }, backgroundColor: '#f9fafb' }),
        block('button', {
          text: 'Programeaza-te acum',
          link: '/booking',
          variant: 'primary',
          size: 'lg',
          align: 'center',
        }, { padding: { top: 20, bottom: 60 } }),
      ],
    },
    {
      slug: 'servicii',
      title: 'Servicii',
      pageType: 'SERVICES',
      isPublished: true,
      content: [
        block('hero', {
          title: 'Servicii de infrumusetare',
          subtitle: 'Descopera gama completa de tratamente',
          backgroundImage: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1920',
          backgroundOverlay: 0.5,
          layout: 'centered',
          height: 'small',
        }, { padding: { top: 0, bottom: 0 } }),
        block('services-grid', {
          title: 'Toate serviciile noastre',
          subtitle: 'Selecteaza un serviciu pentru a te programa',
          autoSync: true,
          columns: 3,
          showPrices: true,
          showDuration: true,
          showBookButton: true,
        }),
      ],
    },
    {
      slug: 'echipa',
      title: 'Echipa',
      pageType: 'TEAM',
      isPublished: true,
      content: [
        block('hero', {
          title: 'Echipa de stilisti',
          subtitle: 'Profesionisti certificati cu ani de experienta',
          backgroundImage: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1920',
          backgroundOverlay: 0.5,
          layout: 'centered',
          height: 'small',
        }, { padding: { top: 0, bottom: 0 } }),
        block('team-grid', {
          title: 'Cunoaste-ne echipa',
          subtitle: 'Fiecare stilist este specializat si certificat',
          autoSync: true,
          columns: 3,
          showBio: true,
          showSocial: true,
        }),
      ],
    },
    {
      slug: 'galerie',
      title: 'Galerie',
      pageType: 'GALLERY',
      isPublished: true,
      content: [
        block('hero', {
          title: 'Portfolio',
          subtitle: 'Creatiile si transformarile echipei noastre',
          backgroundImage: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1920',
          backgroundOverlay: 0.5,
          layout: 'centered',
          height: 'small',
        }, { padding: { top: 0, bottom: 0 } }),
        block('gallery', {
          title: 'Lucrarile noastre',
          subtitle: 'Inspira-te din transformarile realizate de echipa noastra',
          images: [
            { src: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=600&fit=crop&q=80', alt: 'Coafura eleganta' },
            { src: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&h=600&fit=crop&q=80', alt: 'Manichiura profesionala' },
            { src: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800&h=600&fit=crop&q=80', alt: 'Tratament facial' },
            { src: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800&h=600&fit=crop&q=80', alt: 'Colorare par' },
            { src: 'https://images.unsplash.com/photo-1457972729786-0411a3b2b626?w=800&h=600&fit=crop&q=80', alt: 'Styling par' },
            { src: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800&h=600&fit=crop&q=80', alt: 'Rezultat final' },
          ],
          columns: 3,
          layout: 'masonry',
          showLightbox: true,
        }),
      ],
    },
    {
      slug: 'programare',
      title: 'Programare',
      pageType: 'BOOKING',
      isPublished: true,
      content: [
        block('hero', {
          title: 'Programeaza online',
          subtitle: 'Rapid si simplu, in doar cateva click-uri',
          backgroundImage: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1920',
          backgroundOverlay: 0.5,
          layout: 'centered',
          height: 'small',
        }, { padding: { top: 0, bottom: 0 } }),
        block('booking-widget', {
          title: 'Alege serviciul si ora dorita',
          showServices: true,
          showEmployee: true,
        }),
        block('contact-form', {
          title: 'Sau contacteaza-ne direct',
          subtitle: 'Daca preferi, te putem suna noi',
          showPhone: true,
          showAddress: true,
          contactInfo: {
            phone: '0712 345 678',
            address: 'Str. Exemplu nr. 15, Bucuresti',
          },
        }),
      ],
    },
    ...legalPages(),
  ],
  branding: {
    primaryColor: '#be185d',
    secondaryColor: '#ec4899',
    fontFamily: 'Playfair Display, serif',
  },
  seoDefaults: {
    title: 'Salon de Infrumusetare Premium',
    description: 'Servicii de coafura, cosmetica, manichiura si pedichiura. Programeaza-te online!',
  },
};

// ─────────────────────────────────────────────
// REPARATII TELEFOANE / GSM
// ─────────────────────────────────────────────
export const gsmRepairTemplate = {
  id: 'gsm-repair',
  name: 'Reparatii telefoane',
  description: 'Pentru magazine de reparatii telefoane, laptopuri si electronice',
  thumbnail: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=640&h=360&fit=crop&q=80',
  sector: 'IT_ELECTRONICS',
  pages: [
    {
      slug: 'home',
      title: 'Acasa',
      pageType: 'HOME',
      isPublished: true,
      content: [
        block('hero', {
          title: 'Reparatii rapide pentru dispozitivele tale',
          subtitle: 'iPhone, Samsung, Huawei, laptopuri - toate marcile, toate problemele',
          backgroundImage: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=1920',
          backgroundOverlay: 0.6,
          ctaText: 'Cere o oferta',
          ctaLink: '/contact',
          secondaryCtaText: 'Vezi preturile',
          secondaryCtaLink: '/servicii',
          layout: 'centered',
          height: 'large',
        }, { padding: { top: 0, bottom: 0 } }),
        block('text', {
          content: '<h2 style="text-align:center">Reparam orice dispozitiv</h2><p style="text-align:center">De la inlocuirea display-ului pana la reparatii de placa de baza, echipa noastra rezolva orice problema. Cele mai multe reparatii sunt gata in aceeasi zi, cu piese de calitate si garantie inclusa.</p>',
          format: 'prose',
        }, { maxWidth: 'md', padding: { top: 60, bottom: 20 }, backgroundColor: '#f9fafb' }),
        block('stats', {
          title: '',
          subtitle: '',
          stats: [
            { value: '10000+', label: 'Dispozitive reparate' },
            { value: '30min', label: 'Reparatie rapida' },
            { value: '12', label: 'Luni garantie' },
            { value: '99%', label: 'Rata de succes' },
          ],
          columns: 4,
        }, { padding: { top: 60, bottom: 60 }, backgroundColor: '#f9fafb' }),
        block('services-grid', {
          title: 'Servicii de reparatii',
          subtitle: 'Selecteaza un serviciu pentru detalii',
          autoSync: true,
          columns: 3,
          showPrices: true,
          showDuration: true,
        }, { padding: { top: 60, bottom: 60 } }),
        block('pricing-table', {
          title: 'Preturi orientative',
          subtitle: 'Preturile pot varia in functie de model',
          plans: [
            {
              name: 'Display',
              description: 'Inlocuire ecran/display',
              price: '149',
              currency: 'RON',
              period: 'de la',
              featured: false,
              features: ['Display original/compatibil', 'Montaj inclus', 'Testare completa', 'Garantie 12 luni'],
              ctaText: 'Cere oferta',
              ctaLink: '/contact',
            },
            {
              name: 'Baterie',
              description: 'Inlocuire baterie',
              price: '99',
              currency: 'RON',
              period: 'de la',
              featured: true,
              features: ['Baterie originala', 'Montaj in 30 min', 'Calibrare inclusa', 'Garantie 12 luni'],
              ctaText: 'Cere oferta',
              ctaLink: '/contact',
            },
            {
              name: 'Software',
              description: 'Reparatii software',
              price: '79',
              currency: 'RON',
              period: 'de la',
              featured: false,
              features: ['Resetare/reinstalare', 'Recuperare date', 'Eliminare virusi', 'Optimizare sistem'],
              ctaText: 'Cere oferta',
              ctaLink: '/contact',
            },
          ],
          showCta: true,
        }, { padding: { top: 60, bottom: 60 }, backgroundColor: '#f9fafb' }),
        block('faq', {
          title: 'Intrebari frecvente',
          subtitle: '',
          items: [
            { question: 'Cat dureaza o reparatie de display?', answer: 'Inlocuirea display-ului dureaza intre 30-60 minute, in functie de modelul telefonului.' },
            { question: 'Pierd datele de pe telefon?', answer: 'In majoritatea cazurilor, datele sunt in siguranta. Recomandam totusi un backup inainte de reparatie.' },
            { question: 'Folositi piese originale?', answer: 'Da, oferim atat piese originale cat si compatibile de calitate premium, la alegerea clientului.' },
            { question: 'Reparati si laptopuri?', answer: 'Da, reparam laptopuri de toate marcile - inlocuire display, tastatura, baterie, curatare si upgrade-uri.' },
          ],
        }, { padding: { top: 60, bottom: 60 } }),
        block('divider', {}, { padding: { top: 10, bottom: 10 } }),
        block('testimonials', {
          title: 'Ce spun clientii nostri',
          testimonials: [
            { name: 'Alexandra Dinu', content: 'Mi-au reparat telefonul in doar 30 de minute! Display-ul arata ca nou. Super multumita!', rating: 5, role: 'Clienta' },
            { name: 'Bogdan Florea', content: 'Preturi corecte si reparatie rapida. Laptopul merge perfect acum. Recomand!', rating: 5, role: 'Client' },
            { name: 'Catalina Enescu', content: 'Am fost la ei cu un Samsung cu ecranul spart. Reparatie rapida si garantie 12 luni.', rating: 5, role: 'Clienta' },
          ],
          layout: 'carousel',
          showRating: true,
        }, { padding: { top: 60, bottom: 60 }, backgroundColor: '#f9fafb' }),
        block('button', {
          text: 'Solicita o oferta gratuita',
          link: '/contact',
          variant: 'primary',
          size: 'lg',
          align: 'center',
        }, { padding: { top: 20, bottom: 60 } }),
      ],
    },
    {
      slug: 'servicii',
      title: 'Servicii & Preturi',
      pageType: 'SERVICES',
      isPublished: true,
      content: [
        block('hero', {
          title: 'Servicii si Preturi',
          subtitle: 'Transparenta totala - stii exact cat costa inainte sa incepi',
          backgroundImage: 'https://images.unsplash.com/photo-1530319067432-f2a729c03db5?w=1920',
          backgroundOverlay: 0.6,
          layout: 'centered',
          height: 'small',
        }, { padding: { top: 0, bottom: 0 } }),
        block('services-grid', {
          title: 'Lista completa de servicii',
          autoSync: true,
          columns: 3,
          showPrices: true,
          showDuration: true,
        }),
        block('text', {
          content: '<h3>De ce sa ne alegi pe noi?</h3><ul><li><strong>Experienta</strong> - Peste 5 ani si mii de dispozitive reparate</li><li><strong>Piese de calitate</strong> - Folosim doar piese originale sau premium</li><li><strong>Garantie</strong> - Oferim garantie pentru toate reparatiile</li><li><strong>Rapiditate</strong> - Cele mai multe reparatii in aceeasi zi</li></ul>',
          format: 'prose',
        }, { maxWidth: 'md', padding: { top: 40, bottom: 60 }, backgroundColor: '#f9fafb' }),
      ],
    },
    {
      slug: 'locatii',
      title: 'Locatii',
      pageType: 'LOCATIONS',
      isPublished: true,
      content: [
        block('hero', {
          title: 'Locatiile noastre',
          subtitle: 'Viziteaza-ne la una dintre locatii',
          backgroundImage: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=1920',
          backgroundOverlay: 0.6,
          layout: 'centered',
          height: 'small',
        }, { padding: { top: 0, bottom: 0 } }),
        block('locations-map', {
          title: 'Unde ne gasesti',
          subtitle: 'Program si adrese pentru fiecare punct de lucru',
          autoSync: true,
          showHours: true,
          showContact: true,
        }),
      ],
    },
    {
      slug: 'contact',
      title: 'Contact',
      pageType: 'CONTACT',
      isPublished: true,
      content: [
        block('hero', {
          title: 'Solicita o oferta',
          subtitle: 'Descrie-ne problema si te contactam rapid',
          backgroundImage: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=1920',
          backgroundOverlay: 0.6,
          layout: 'centered',
          height: 'small',
        }, { padding: { top: 0, bottom: 0 } }),
        block('contact-form', {
          title: 'Formular de contact',
          subtitle: 'Raspundem in maxim 1 ora in timpul programului',
          fields: [
            { key: 'firstName', label: 'Prenume', type: 'text', required: true },
            { key: 'lastName', label: 'Nume', type: 'text', required: true },
            { key: 'phone', label: 'Telefon', type: 'phone', required: true },
            { key: 'email', label: 'Email', type: 'email', required: true },
            { key: 'deviceType', label: 'Tip dispozitiv', type: 'select', required: true, options: ['iPhone', 'Samsung', 'Huawei', 'Xiaomi', 'Laptop', 'Altele'] },
            { key: 'message', label: 'Descriere problema', type: 'textarea', required: true },
          ],
          submitText: 'Trimite cererea',
          showPhone: true,
          contactInfo: {
            phone: '0712 345 678',
          },
        }),
      ],
    },
    ...legalPages(),
  ],
  branding: {
    primaryColor: '#059669',
    secondaryColor: '#10b981',
  },
  seoDefaults: {
    title: 'Reparatii telefoane si laptopuri',
    description: 'Service autorizat pentru reparatii iPhone, Samsung, Huawei. Inlocuire display, baterie, placa de baza. Garantie inclusa.',
  },
};

// ─────────────────────────────────────────────
// SERVICII LA DOMICILIU
// ─────────────────────────────────────────────
export const homeServicesTemplate = {
  id: 'home-services',
  name: 'Servicii la domiciliu',
  description: 'Pentru firme de instalatii, curatenie, mentenanta',
  thumbnail: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=640&h=360&fit=crop&q=80',
  sector: 'HOME_SERVICES',
  pages: [
    {
      slug: 'home',
      title: 'Acasa',
      pageType: 'HOME',
      isPublished: true,
      content: [
        block('hero', {
          title: 'Servicii profesionale la domiciliu',
          subtitle: 'Instalatii, reparatii, mentenanta - venim la tine acasa',
          backgroundImage: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1920',
          backgroundOverlay: 0.5,
          ctaText: 'Cheama un specialist',
          ctaLink: '/booking',
          secondaryCtaText: 'Vezi serviciile',
          secondaryCtaLink: '/servicii',
          layout: 'centered',
          height: 'large',
        }, { padding: { top: 0, bottom: 0 } }),
        block('text', {
          content: '<h2 style="text-align:center">Rezolvam orice problema din casa ta</h2><p style="text-align:center">Echipa noastra de tehnicieni autorizati intervine rapid si eficient. De la instalatii sanitare si electrice la zugraveli si reparatii diverse, suntem disponibili 7 zile din 7.</p>',
          format: 'prose',
        }, { maxWidth: 'md', padding: { top: 60, bottom: 20 }, backgroundColor: '#f9fafb' }),
        block('stats', {
          title: '',
          subtitle: '',
          stats: [
            { value: '5000+', label: 'Interventii realizate' },
            { value: '7/7', label: 'Zile pe saptamana' },
            { value: '2h', label: 'Timp mediu raspuns' },
            { value: '4.8', label: 'Rating mediu' },
          ],
          columns: 4,
        }, { padding: { top: 60, bottom: 60 }, backgroundColor: '#f9fafb' }),
        block('services-grid', {
          title: 'Ce putem face pentru tine',
          subtitle: 'Servicii complete pentru casa ta',
          autoSync: true,
          columns: 3,
          showPrices: true,
          showBookButton: true,
        }, { padding: { top: 60, bottom: 60 } }),
        block('faq', {
          title: 'Intrebari frecvente',
          subtitle: '',
          items: [
            { question: 'Cat de repede puteti veni?', answer: 'In functie de zona, putem ajunge in 1-3 ore pentru urgente. Pentru programari, va confirmam ora exacta.' },
            { question: 'Lucrati si in weekend?', answer: 'Da, suntem disponibili 7 zile din 7, inclusiv in zilele de sarbatoare pentru situatii de urgenta.' },
            { question: 'Oferiti garantie pentru lucrari?', answer: 'Da, oferim garantie de 12-24 luni pentru toate lucrarile efectuate, atat pentru manopera cat si pentru materiale.' },
            { question: 'Care este zona de acoperire?', answer: 'Acoperim intreg orasul si zonele limitrofe in raza de 30 km. Contacteaza-ne pentru detalii.' },
          ],
        }, { padding: { top: 60, bottom: 60 } }),
        block('divider', {}, { padding: { top: 10, bottom: 10 } }),
        block('testimonials', {
          title: 'Ce spun clientii nostri',
          testimonials: [
            { name: 'George Preda', content: 'Au venit in aceeasi zi si au rezolvat problema cu instalatia sanitara rapid si profesional.', rating: 5, role: 'Client' },
            { name: 'Daniela Barbu', content: 'Foarte multumita de serviciile de curatenie. Casa straluceste de fiecare data!', rating: 5, role: 'Clienta fidela' },
            { name: 'Adrian Moldovan', content: 'Instalatia electrica a fost refacuta impecabil. Preturi corecte si munca de calitate.', rating: 5, role: 'Client' },
          ],
          layout: 'carousel',
          showRating: true,
        }, { padding: { top: 60, bottom: 60 }, backgroundColor: '#f9fafb' }),
        block('button', {
          text: 'Solicita o interventie',
          link: '/contact',
          variant: 'primary',
          size: 'lg',
          align: 'center',
        }, { padding: { top: 20, bottom: 60 } }),
      ],
    },
    {
      slug: 'servicii',
      title: 'Servicii',
      pageType: 'SERVICES',
      isPublished: true,
      content: [
        block('hero', {
          title: 'Serviciile noastre',
          subtitle: 'Gama completa de servicii la domiciliu',
          backgroundImage: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1920',
          backgroundOverlay: 0.6,
          layout: 'centered',
          height: 'small',
        }, { padding: { top: 0, bottom: 0 } }),
        block('services-grid', {
          title: 'Toate serviciile',
          subtitle: 'Selecteaza un serviciu pentru a solicita o interventie',
          autoSync: true,
          columns: 3,
          showPrices: true,
          showDuration: true,
          showBookButton: true,
        }),
      ],
    },
    {
      slug: 'echipa',
      title: 'Echipa',
      pageType: 'TEAM',
      isPublished: true,
      content: [
        block('hero', {
          title: 'Echipa noastra',
          subtitle: 'Tehnicieni autorizati si cu experienta',
          backgroundImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1920',
          backgroundOverlay: 0.6,
          layout: 'centered',
          height: 'small',
        }, { padding: { top: 0, bottom: 0 } }),
        block('team-grid', {
          title: 'Profesionistii nostri',
          subtitle: 'Fiecare tehnician este autorizat si asigurat',
          autoSync: true,
          columns: 3,
          showBio: true,
        }),
      ],
    },
    {
      slug: 'contact',
      title: 'Contact',
      pageType: 'CONTACT',
      isPublished: true,
      content: [
        block('hero', {
          title: 'Solicita o interventie',
          subtitle: 'Descrie-ne problema si te sunam inapoi',
          backgroundImage: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=1920',
          backgroundOverlay: 0.6,
          layout: 'centered',
          height: 'small',
        }, { padding: { top: 0, bottom: 0 } }),
        block('contact-form', {
          title: 'Formular de contact',
          subtitle: 'Raspundem in cel mai scurt timp',
          showPhone: true,
          showAddress: true,
          contactInfo: {
            phone: '0712 345 678',
            address: 'Str. Exemplu nr. 30, Bucuresti',
          },
        }),
        block('locations-map', {
          title: 'Zona de acoperire',
          autoSync: true,
          showHours: true,
          showContact: true,
        }),
      ],
    },
    ...legalPages(),
  ],
  branding: {
    primaryColor: '#ea580c',
    secondaryColor: '#f97316',
  },
  seoDefaults: {
    title: 'Servicii Instalatii si Reparatii la Domiciliu',
    description: 'Instalatii sanitare, electrice, HVAC. Echipa de profesionisti disponibila 7 zile din 7.',
  },
};

// ─────────────────────────────────────────────
// SALA DE FITNESS
// ─────────────────────────────────────────────
export const fitnessStudioTemplate = {
  id: 'fitness-studio',
  name: 'Sala de fitness',
  description: 'Pentru sali de fitness, yoga, pilates',
  thumbnail: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=640&h=360&fit=crop&q=80',
  sector: 'BEAUTY',
  pages: [
    {
      slug: 'home',
      title: 'Acasa',
      pageType: 'HOME',
      isPublished: true,
      content: [
        block('hero', {
          title: 'Transforma-te cu noi',
          subtitle: 'Clase de fitness, antrenori personali, echipamente de ultima generatie',
          backgroundImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920',
          backgroundOverlay: 0.4,
          ctaText: 'Inscrie-te acum',
          ctaLink: '/booking',
          secondaryCtaText: 'Vezi clasele',
          secondaryCtaLink: '/clase',
          layout: 'centered',
          height: 'large',
        }, { padding: { top: 0, bottom: 0 } }),
        block('text', {
          content: '<h2 style="text-align:center">Mai mult decat o sala de fitness</h2><p style="text-align:center">Suntem o comunitate dedicata unui stil de viata sanatos. Cu echipamente de ultima generatie, clase variate si antrenori certificati international, te ajutam sa iti atingi obiectivele.</p>',
          format: 'prose',
        }, { maxWidth: 'md', padding: { top: 60, bottom: 20 }, backgroundColor: '#f9fafb' }),
        block('stats', {
          title: '',
          subtitle: '',
          stats: [
            { value: '1500+', label: 'Membri activi' },
            { value: '50+', label: 'Clase pe saptamana' },
            { value: '20+', label: 'Antrenori certificati' },
            { value: '2000m²', label: 'Suprafata sala' },
          ],
          columns: 4,
        }, { padding: { top: 60, bottom: 60 }, backgroundColor: '#f9fafb' }),
        block('services-grid', {
          title: 'Clasele noastre',
          subtitle: 'De la yoga la HIIT, avem ceva pentru fiecare',
          autoSync: true,
          columns: 3,
          showDuration: true,
          showBookButton: true,
        }, { padding: { top: 60, bottom: 60 } }),
        block('pricing-table', {
          title: 'Abonamente',
          subtitle: 'Alege abonamentul potrivit pentru tine',
          plans: [
            {
              name: 'Start',
              description: 'Ideal pentru incepatori',
              price: '149',
              currency: 'RON',
              period: 'luna',
              featured: false,
              features: ['Acces sala fitness', 'Dus si vestiar', 'Program flexibil', '1 evaluare gratuita'],
              ctaText: 'Inscrie-te',
              ctaLink: '/booking',
            },
            {
              name: 'Premium',
              description: 'Cel mai popular abonament',
              price: '249',
              currency: 'RON',
              period: 'luna',
              featured: true,
              features: ['Acces sala fitness', 'Toate clasele de grup', 'Sauna si jacuzzi', '2 sedinte antrenor personal', 'Plan nutritional'],
              ctaText: 'Inscrie-te',
              ctaLink: '/booking',
            },
            {
              name: 'Elite',
              description: 'Experienta completa',
              price: '399',
              currency: 'RON',
              period: 'luna',
              featured: false,
              features: ['Acces sala fitness nelimitat', 'Toate clasele de grup', 'Sauna, jacuzzi, piscina', 'Antrenor personal dedicat', 'Plan nutritional personalizat', 'Acces zona VIP'],
              ctaText: 'Inscrie-te',
              ctaLink: '/booking',
            },
          ],
          showCta: true,
        }, { padding: { top: 60, bottom: 60 }, backgroundColor: '#f9fafb' }),
        block('divider', {}, { padding: { top: 10, bottom: 10 } }),
        block('team-grid', {
          title: 'Antrenorii nostri',
          subtitle: 'Certificati international, pasionati de fitness',
          autoSync: true,
          columns: 4,
          showBio: true,
        }, { padding: { top: 60, bottom: 60 }, backgroundColor: '#f9fafb' }),
        block('button', {
          text: 'Rezerva o clasa gratuita',
          link: '/booking',
          variant: 'primary',
          size: 'lg',
          align: 'center',
        }, { padding: { top: 20, bottom: 60 } }),
      ],
    },
    {
      slug: 'clase',
      title: 'Clase',
      pageType: 'SERVICES',
      isPublished: true,
      content: [
        block('hero', {
          title: 'Clasele noastre',
          subtitle: 'Gaseste clasa potrivita pentru tine',
          backgroundImage: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1920',
          backgroundOverlay: 0.5,
          layout: 'centered',
          height: 'small',
        }, { padding: { top: 0, bottom: 0 } }),
        block('services-grid', {
          title: 'Toate clasele disponibile',
          subtitle: 'Selecteaza o clasa pentru a te inscrie',
          autoSync: true,
          columns: 3,
          showPrices: true,
          showDuration: true,
          showBookButton: true,
        }),
      ],
    },
    {
      slug: 'antrenori',
      title: 'Antrenori',
      pageType: 'TEAM',
      isPublished: true,
      content: [
        block('hero', {
          title: 'Antrenorii nostri',
          subtitle: 'Experti in fitness care te ghideaza spre rezultate',
          backgroundImage: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1920',
          backgroundOverlay: 0.5,
          layout: 'centered',
          height: 'small',
        }, { padding: { top: 0, bottom: 0 } }),
        block('team-grid', {
          title: 'Cunoaste echipa',
          subtitle: 'Fiecare antrenor are certificari internationale si ani de experienta',
          autoSync: true,
          columns: 3,
          showBio: true,
          showSocial: true,
        }),
      ],
    },
    {
      slug: 'galerie',
      title: 'Galerie',
      pageType: 'GALLERY',
      isPublished: true,
      content: [
        block('hero', {
          title: 'Facilitatile noastre',
          subtitle: 'Un tur virtual al studioului',
          backgroundImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920',
          backgroundOverlay: 0.5,
          layout: 'centered',
          height: 'small',
        }, { padding: { top: 0, bottom: 0 } }),
        block('gallery', {
          title: 'Sala si echipamentele',
          subtitle: 'Echipamente moderne intr-un spatiu generos',
          images: [
            { src: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=600&fit=crop&q=80', alt: 'Sala de fitness principala' },
            { src: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&h=600&fit=crop&q=80', alt: 'Zona de greutati' },
            { src: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&h=600&fit=crop&q=80', alt: 'Clasa de group fitness' },
            { src: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=600&fit=crop&q=80', alt: 'Zona de cardio' },
            { src: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&h=600&fit=crop&q=80', alt: 'Studio de yoga' },
            { src: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=600&fit=crop&q=80', alt: 'Echipamente moderne' },
          ],
          columns: 3,
          layout: 'grid',
          showLightbox: true,
        }),
      ],
    },
    {
      slug: 'contact',
      title: 'Contact',
      pageType: 'CONTACT',
      isPublished: true,
      content: [
        block('hero', {
          title: 'Contact si programari',
          subtitle: 'Rezerva o clasa sau viziteaza-ne',
          backgroundImage: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=1920',
          backgroundOverlay: 0.6,
          layout: 'centered',
          height: 'small',
        }, { padding: { top: 0, bottom: 0 } }),
        block('booking-widget', {
          title: 'Rezerva o clasa',
          showServices: true,
          showEmployee: true,
        }),
        block('locations-map', {
          title: 'Unde ne gasesti',
          autoSync: true,
          showHours: true,
          showContact: true,
        }),
      ],
    },
    ...legalPages(),
  ],
  branding: {
    primaryColor: '#dc2626',
    secondaryColor: '#ef4444',
  },
  seoDefaults: {
    title: 'Studio Fitness Premium',
    description: 'Clase de fitness, yoga, pilates. Antrenori personali certificati. Prima sedinta gratuita!',
  },
};

// Export all templates
// ─────────────────────────────────────────────
// SERVICII DIGITALE
// ─────────────────────────────────────────────
export const digitalServicesTemplate = {
  id: 'digital-services',
  name: 'Servicii Digitale',
  description: 'Pentru agentii digitale, freelanceri IT, web development si marketing',
  thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=640&h=360&fit=crop&q=80',
  sector: 'IT_ELECTRONICS',
  pages: [
    {
      slug: 'home',
      title: 'Acasa',
      pageType: 'HOME',
      isPublished: true,
      content: [
        block('hero', {
          title: 'Solutii digitale pentru afacerea ta',
          subtitle: 'Web development, design, marketing digital si consultanta IT - totul sub un singur acoperis',
          backgroundImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1920',
          backgroundOverlay: 0.55,
          ctaText: 'Solicita oferta',
          ctaLink: '/contact',
          secondaryCtaText: 'Descopera serviciile',
          secondaryCtaLink: '/servicii',
          layout: 'centered',
          height: 'large',
        }, { padding: { top: 0, bottom: 0 } }),
        block('services-grid', {
          title: 'Ce putem face pentru tine',
          subtitle: 'Servicii profesionale de la A la Z',
          autoSync: true,
          columns: 3,
          showPrices: true,
          showBookButton: true,
        }, { padding: { top: 60, bottom: 60 } }),
        block('stats', {
          title: '',
          subtitle: '',
          stats: [
            { value: '200+', label: 'Proiecte livrate' },
            { value: '8+', label: 'Ani experienta' },
            { value: '50+', label: 'Clienti activi' },
            { value: '99%', label: 'Satisfactie clienti' },
          ],
          columns: 4,
        }, { padding: { top: 60, bottom: 60 }, backgroundColor: '#f5f3ff' }),
        block('testimonials', {
          title: 'Ce spun clientii nostri',
          subtitle: 'Parteneriate de durata bazate pe rezultate',
          testimonials: [
            { name: 'Andrei Marinescu', content: 'Au creat un site modern si performant pentru afacerea noastra. Traficul a crescut cu 300% in primele 3 luni!', rating: 5, role: 'CEO, TechStart SRL' },
            { name: 'Maria Stanescu', content: 'Echipa profesionista, comunicare excelenta si rezultate concrete. Recomand cu incredere!', rating: 5, role: 'Marketing Manager' },
            { name: 'Cristian Popescu', content: 'Colaboram de peste 2 ani pentru mentenanta si dezvoltare continua. Mereu livreaza la timp.', rating: 5, role: 'Fondator, Digital Hub' },
          ],
          layout: 'carousel',
          showRating: true,
        }, { padding: { top: 60, bottom: 60 } }),
        block('faq', {
          title: 'Intrebari frecvente',
          subtitle: '',
          items: [
            { question: 'Cat dureaza realizarea unui website?', answer: 'Un website de prezentare se realizeaza in 2-4 saptamani. Proiectele mai complexe (e-commerce, platforme) pot dura 1-3 luni.' },
            { question: 'Oferiti si mentenanta dupa lansare?', answer: 'Da, oferim pachete de mentenanta lunara care includ update-uri, monitorizare, backup-uri si suport tehnic.' },
            { question: 'Care sunt costurile?', answer: 'Preturile variaza in functie de complexitate. Oferim o consultatie gratuita pentru a estima bugetul proiectului tau.' },
            { question: 'Lucrati si cu clienti din afara Romaniei?', answer: 'Da, colaboram cu clienti din toata Europa. Comunicam in romana si engleza.' },
          ],
        }, { padding: { top: 60, bottom: 60 }, backgroundColor: '#f9fafb' }),
        block('button', {
          text: 'Hai sa discutam despre proiectul tau',
          link: '/contact',
          variant: 'primary',
          size: 'lg',
          align: 'center',
        }, { padding: { top: 20, bottom: 60 } }),
      ],
    },
    {
      slug: 'servicii',
      title: 'Servicii',
      pageType: 'SERVICES',
      isPublished: true,
      content: [
        block('hero', {
          title: 'Serviciile noastre',
          subtitle: 'Solutii complete pentru prezenta ta digitala',
          backgroundImage: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1920',
          backgroundOverlay: 0.6,
          layout: 'centered',
          height: 'small',
        }, { padding: { top: 0, bottom: 0 } }),
        block('pricing-table', {
          title: 'Pachete si preturi',
          subtitle: 'Alege pachetul potrivit pentru nevoile tale',
          plans: [
            {
              name: 'Start',
              description: 'Ideal pentru freelanceri si start-up-uri',
              price: '1500',
              currency: 'RON',
              period: 'de la',
              featured: false,
              features: ['Website one-page', 'Design responsive', 'Optimizare SEO de baza', 'Formular de contact', 'Hosting 1 an inclus'],
              ctaText: 'Solicita oferta',
              ctaLink: '/contact',
            },
            {
              name: 'Business',
              description: 'Pentru companii in crestere',
              price: '3500',
              currency: 'RON',
              period: 'de la',
              featured: true,
              features: ['Website multi-pagina', 'Design personalizat', 'SEO complet', 'Blog integrat', 'Integrari CRM', 'Suport 12 luni'],
              ctaText: 'Solicita oferta',
              ctaLink: '/contact',
            },
            {
              name: 'Enterprise',
              description: 'Solutii complexe la cheie',
              price: '8000',
              currency: 'RON',
              period: 'de la',
              featured: false,
              features: ['Platforma personalizata', 'E-commerce / Booking', 'API integrations', 'Dashboard admin', 'SLA & suport prioritar', 'Mentenanta inclusa'],
              ctaText: 'Solicita oferta',
              ctaLink: '/contact',
            },
          ],
          showCta: true,
        }, { padding: { top: 60, bottom: 60 } }),
        block('services-grid', {
          title: 'Toate serviciile',
          autoSync: true,
          columns: 3,
          showPrices: true,
          showDuration: true,
        }, { padding: { top: 40, bottom: 60 }, backgroundColor: '#f9fafb' }),
      ],
    },
    {
      slug: 'despre',
      title: 'Despre noi',
      pageType: 'ABOUT',
      isPublished: true,
      content: [
        block('hero', {
          title: 'Despre echipa noastra',
          subtitle: 'Pasionati de tehnologie, dedicati rezultatelor',
          backgroundImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1920',
          backgroundOverlay: 0.6,
          layout: 'centered',
          height: 'small',
        }, { padding: { top: 0, bottom: 0 } }),
        block('text', {
          content: '<h2 style="text-align:center">Cine suntem</h2><p style="text-align:center">Suntem o echipa de profesionisti IT cu experienta in dezvoltare web, design, marketing digital si consultanta. Credem ca fiecare afacere merita o prezenta digitala puternica si lucram alaturi de clientii nostri pentru a le transforma viziunea in realitate.</p>',
          format: 'prose',
        }, { maxWidth: 'md', padding: { top: 60, bottom: 40 } }),
        block('team-grid', {
          title: 'Echipa',
          subtitle: 'Oamenii din spatele proiectelor',
          members: [
            { name: 'Alex Ionescu', role: 'Full-Stack Developer', image: '' },
            { name: 'Diana Radu', role: 'UI/UX Designer', image: '' },
            { name: 'Mihai Gheorghe', role: 'Marketing Specialist', image: '' },
          ],
          columns: 3,
        }, { padding: { top: 40, bottom: 60 }, backgroundColor: '#f5f3ff' }),
      ],
    },
    {
      slug: 'contact',
      title: 'Contact',
      pageType: 'CONTACT',
      isPublished: true,
      content: [
        block('hero', {
          title: 'Contacteaza-ne',
          subtitle: 'Spune-ne despre proiectul tau si te contactam in cel mai scurt timp',
          backgroundImage: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1920',
          backgroundOverlay: 0.6,
          layout: 'centered',
          height: 'small',
        }, { padding: { top: 0, bottom: 0 } }),
        block('contact-form', {
          title: 'Trimite-ne un mesaj',
          subtitle: 'Raspundem in maxim 24 de ore',
          fields: [
            { key: 'firstName', label: 'Prenume', type: 'text', required: true },
            { key: 'lastName', label: 'Nume', type: 'text', required: true },
            { key: 'email', label: 'Email', type: 'email', required: true },
            { key: 'phone', label: 'Telefon', type: 'phone', required: false },
            { key: 'projectType', label: 'Tip proiect', type: 'select', required: true, options: ['Website', 'Aplicatie web', 'E-commerce', 'Marketing digital', 'Consultanta IT', 'Altele'] },
            { key: 'budget', label: 'Buget estimat', type: 'select', required: false, options: ['Sub 2000 RON', '2000-5000 RON', '5000-15000 RON', 'Peste 15000 RON'] },
            { key: 'message', label: 'Descrierea proiectului', type: 'textarea', required: true },
          ],
          submitText: 'Trimite cererea',
          showPhone: true,
          contactInfo: {
            phone: '0712 345 678',
            email: 'contact@agentie.ro',
          },
        }),
      ],
    },
    ...legalPages(),
  ],
  branding: {
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
  },
  seoDefaults: {
    title: 'Servicii digitale - Web Development & Marketing',
    description: 'Agentie de servicii digitale: web development, design, marketing digital si consultanta IT. Solutii personalizate pentru afacerea ta.',
  },
};

export const templates = [
  autoDetailingTemplate,
  autoServiceTemplate,
  autoPartsTemplate,
  beautySalonTemplate,
  gsmRepairTemplate,
  digitalServicesTemplate,
  homeServicesTemplate,
  fitnessStudioTemplate,
];

// Get templates by sector
export const getTemplatesBySector = (sector) => {
  return templates.filter((t) => t.sector === sector);
};

// Get template by ID
export const getTemplateById = (id) => {
  return templates.find((t) => t.id === id);
};

export default templates;
