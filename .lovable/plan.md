# Smėlinių atspalvių pakeitimas visame admin ir kambarinių dalyje

Smėlinė spalva matosi skirtukų juostose (pvz. „Operations / Properties / Business“), pilkuose ženkleliuose, lentelių antraštėse, antriniuose mygtukuose ir užvedimo (hover) būsenose. Ji kyla iš vieno bendro „antrinio fono“ atspalvio (#E6E1D6), kuris su popieriniu fonu ir žaliu meniu nedera.

## Kas pasikeis

- **Antrinis fonas** (skirtukų juostos, ženkleliai, lentelių antraštės, antriniai mygtukai): vietoj smėlinio – švelnus šaltas žalsvai pilkas atspalvis, suderintas su pašvaistės žalia (apie #E3E8E4).
- **Aktyvus skirtukas:** tamsus (kaip meniu) su šviesiu tekstu, o ne šviesi dėžutė ant smėlinio fono – aiškiau matosi, kuris pasirinktas.
- **Užvedimo būsena** (hover) meniu sąrašuose ir lentelėse: tas pats švelnus žalsvas atspalvis.
- **Rėmeliai ir linijos:** išlieka ploni, šiek tiek šaltesnio atspalvio, kad nesiliestų su smėliu.
- Pagrindinis popierinis darbo srities fonas lieka toks pats.

## Ko nekeičiame

Viešoji svetainė, prisijungimo puslapis, meniu su pašvaiste, funkcijos ir turinys.

## Patikra

Prisijungus peržiūrima: suvestinė (skirtukai), rezervacijos, kainodara, nustatymai, kambarinių ekranai – ar neliko smėlinių plotų ir ar tekstas gerai įskaitomas.

## Techninės detalės

- Bendroje temoje keičiami `--secondary`, `--muted`, `--accent`, `--border`, `--input` į šaltesnius žalsvai pilkus atspalvius.
- Skirtukų komponente aktyvi būsena: `bg-primary text-primary-foreground`.
- Paieška kode rankiniu būdu įrašytų smėlinių/amber/stone spalvų admin ir staff failuose ir pakeitimas temos spalvomis.
