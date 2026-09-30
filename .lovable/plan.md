# Vientisas dizainas: admin skydelis ir kambarinių programėlė

Tikslas – kad admin skydelis ir kambarinių programėlė atrodytų kaip viešoji Mánahlíð svetainė: tie patys šriftai, spalvos, mygtukai ir linijos. Darbo sritis lieka šviesi (popierinė), o meniu – tamsus.

## Kas pasikeis

- **Šriftai:** antraštės – Cormorant Garamond (plonos, serifinės), tekstas ir lentelės – Inter. Smulkios etiketės – didžiosios raidės su plačiais tarpais, kaip svetainėje.
- **Spalvos:**
  - Darbo srities fonas – popierinis #F2EFE8, kortelės šiek tiek šviesesnės.
  - Šoninis meniu ir kambarinių viršutinė juosta – tamsi žalsvai juoda (#07100E / #0F1D1A).
  - Pagrindinis akcentas – pašvaistės žalia (#7FD3AE ant tamsaus, gilesnis žalias atspalvis ant šviesaus, kad tekstas būtų pakankamai kontrastingas).
  - Antrinis akcentas – žalvaris #C7A169 (ženkleliai, išskirtinės būsenos).
  - Diagramų spalvos – iš tos pačios paletės.
- **Mygtukai:** kapsulės formos (pilnai apvalūs), pagrindinis – tamsus arba žalias, antrinis – permatomas su plonu rėmeliu. Visur vienodi.
- **Kortelės, lentelės, formos:** plonos 1 px linijos vietoj šešėlių, mažesni apvalinimai (apie 4 px), vienodi laukų rėmeliai ir fokuso žiedas.
- **Meniu:** aktyvus punktas pažymimas žaliu akcentu ir plona linija; grupių pavadinimai – smulkios didžiosios raidės.
- **Kambarinių programėlė:** tas pats stilius, dideli (bent 44 px) paspaudžiami mygtukai telefone.
- **Prisijungimo ir slaptažodžio atkūrimo puslapiai:** suderinami su tuo pačiu stiliumi.

## Ko nekeičiame

Turinys, funkcijos, duomenys, teisės, skaičiavimai ir viešoji svetainė – lieka kaip yra. Keičiasi tik išvaizda.

## Patikra

- Peržiūra prisijungus: suvestinė, rezervacijos, kainodara, nustatymai, kambarinių ekranai – kompiuterio (1280 px) ir telefono (375 px) pločiuose.
- Tikrinamas teksto kontrastas, ar viešoji svetainė nepakito, ar nėra horizontalaus slinkimo.

## Techninės detalės

- Bendroje temoje perrašomi šviesios temos kintamieji (background, card, primary, accent, border, ring, chart-*, sidebar-*) pagal Mánahlíð paletę; `--radius` ~0.25rem. Viešosios dalies tema (atskira apimtis) nekeičiama.
- Bazinis mygtuko komponentas: `rounded-full`, naujas `outline` stilius su plona linija; kortelėms – be šešėlio, plona linija.
- Antraštės (h1–h3) admin/staff dalyje – `font-display`.
- Admin ir staff maketuose pakeičiamos kietai įrašytos spalvos (pvz. amber įspėjimo juosta) į semantines temos spalvas.
- Admin/staff kalendoriaus ir diagramų komponentuose suvienodinamos spalvos.
