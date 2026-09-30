# Prisijungimo puslapis tamsiu svetainės stiliumi

Prisijungimo (ir slaptažodžio atkūrimo) puslapis perdaromas, kad atrodytų kaip viešoji svetainė.

## Kaip atrodys

- **Visas puslapis tamsus** (žalsvai juoda #07100E), jokių pilkų ar popierinių plotų.
- **Dešinė pusė (kompiuteryje):** svetainės pašvaistės nuotrauka su tamsiu gradientu, virš jos – šviesus Mánahlíð logotipas (tas, kurį įkėlėte tamsiam fonui) ir smulkus užrašas didžiosiomis raidėmis, pvz. „Staff & admin access“.
- **Kairė pusė:** tamsus fonas, viršuje mažas šviesus logotipas (matysis ir telefone, kur nuotraukos nėra), didelė plona serifinė antraštė „Sign in“, trumpas paaiškinimas.
- **Laukai:** tamsūs, su plonu šviesiu rėmeliu, etiketės smulkiomis didžiosiomis raidėmis; paspaudus – žalias fokuso žiedas.
- **Mygtukas:** žalias (pašvaistės), kapsulės formos, tamsus tekstas – kaip „Search“ mygtukas svetainėje.
- **Nuorodos** „Forgot your password?“ ir „← Home“ – blankios šviesios, užvedus pašviesėja.
- Jei šviesus logotipas neįkeltas – rodomas tamsusis logotipas, o jei ir jo nėra – pavadinimas tekstu.

## Ko nekeičiame

Prisijungimo, slaptažodžio atkūrimo logika, tekstai ir admin skydelio stilius lieka tokie patys.

## Patikra

Peržiūra 1280 px ir 375 px pločiuose: kontrastas, logotipas, nėra horizontalaus slinkimo.

## Techninės detalės

- Puslapio apvalkalui pridedama esama viešosios dalies tema (`site-theme`), todėl laukai, mygtukai ir šriftai automatiškai gauna tamsias reikšmes.
- Mygtukui – svetainės akcentinis stilius (`bg-aurora text-ink rounded-full`).
- Nuotrauka – esamas pašvaistės vaizdas iš projekto (hero-aurora), su `aspect`/`object-cover` ir tamsiu gradientu.
- Logotipas: `logoLightUrl` → `logoUrl` → tekstas.
- Tas pats taikoma slaptažodžio nustatymo puslapiui, jei jis naudoja tą patį maketą.
