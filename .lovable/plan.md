# Naujas klientinės dalies dizainas („Mánahlíð" stilius)

Įkeltas maketas yra tamsi, redakcinio stiliaus svetainė: gili žalsvai juoda spalva, šviesus popierinis atspalvis šviesioms sekcijoms, „šiaurės pašvaistės" žalias akcentas ir žalvarinis antrinis akcentas. Šriftai (Cormorant Garamond + Inter) jau naudojami dabartinėje svetainėje, todėl tipografija tik perderinama.

Pritaikoma **tik viešajai svetainei**. Administravimo skydelis, personalo ekranai, prisijungimas, duomenų bazė ir visa logika nekeičiami.

## Spalvos ir stilius

- Pagrindinis fonas: gili tamsiai žalia-juoda (#07100E / #0B1715), sekcijų paviršiai #0F1D1A.
- Šviesios („popierinės") sekcijos: #F2EFE8.
- Akcentas: pašvaistės žalia #7FD3AE; antrinis akcentas — žalvaris #C7A169.
- Plonos 1 px linijos vietoj šešėlių, apvalinimai beveik nuliniai (2–4 px), mygtukai — pilnai apvalūs kapsulės formos.
- Antraštės — didelės, plonos, serifinės; smulkios etiketės — didžiosios raidės su plačiais tarpais.

## Darbų eiga

**1. Pagrindas**
- Naujos spalvų reikšmės ir tipografijos taisyklės viešosios dalies temoje; naujos pagalbinės klasės (etiketės, plonos linijos, kapsuliniai mygtukai, sekcijų tarpai).
- Mygtukų variantai: šviesus akcentinis, permatomas su rėmeliu, tamsus.

**2. Karkasas**
- Antraštė: permatoma virš hero, pasislinkus – tamsi su blur ir plona apatine linija; nuoroda su pabraukimo animacija; mobilus pilno ekrano meniu.
- Poraštė: tamsi, trijų stulpelių, plonos linijos.
- Hero: viso ekrano nuotrauka su tamsiu gradientu, laipsniškas turinio pasirodymas, slinkimo užuomina šone.

**3. Paieška ir rezervacija**
- Paieškos juosta: tamsus stiklo efektas, laukai atskirti plonomis linijomis, akcentinis mygtukas.
- Kalendorius ir svečių pasirinkimas: tamsūs iškylantys langai, akcentinis pasirinktų dienų ruožas.
- Rezervacijos dialogas ir suvestinė — tamsi versija.

**4. Sekcijos ir kortelės**
- Statistikos juosta po hero.
- Apartamentų / kambarių sąrašas: eilučių tinklelis su kaina, laisvumo ženkleliu ir mygtuku.
- Šviesios „popierinės" sekcijos su citata, kortelėmis ir faktų sąrašu.
- Nuotraukų juosta su kvietimu rezervuoti.

**5. Likę puslapiai**
- Apartamentai (sąrašas, kategorija, konkretus objektas), laisvi kambariai, restobaras, sauna, banketinė salė, dovanų kuponai, apie, taisyklės, kontaktai, teisiniai puslapiai, rezervacijos patvirtinimas — visi pritaikomi tai pačiai temai.

**6. Patikra**
- Tipų patikra ir build.
- Peržiūra 1280 px ir 375 px pločiuose: kad nebūtų horizontalaus slinkimo, kontrastas pakankamas, admin skydelis nepakitęs.

## Ką paliekame

Visas turinys (tekstai, nuotraukos, kainos, LT/EN vertimai), maršrutai, rezervacijų logika, API ir admin dalis lieka kaip yra — keičiasi tik išvaizda.
