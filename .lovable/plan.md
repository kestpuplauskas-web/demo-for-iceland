# Visų klientinės dalies nuotraukų placeholderiai ir logotipo pašalinimas

## Apimtis

Pakeitimai taikomi visai viešajai klientinei svetainei, kuri formuojama Islandijos rinkai pagal pateiktą „Mánahlíð“ HTML dizaino etaloną. Administravimo skydelis, duomenys ir įkeltos nuotraukos duomenų bazėje nekeičiami.

## Pakeitimai

1. Sukurti vientiso „Mánahlíð“ dizaino nuotraukų placeholderį, išlaikantį dabartinius vaizdų formatus, blokų aukščius ir tamsią šiaurietišką estetiką.
2. Visas viešoje svetainėje matomas nuotraukas pakeisti placeholderiais:
   - pagrindinio puslapio didžiajame vaizde;
   - lokacijos, restorano, pirties, banketinės salės ir kitų paslaugų puslapiuose bei sekcijose;
   - apartamentų ir kategorijų kortelėse;
   - „Laisvi kambariai“ rezultatuose;
   - konkretaus apartamento viršuje, nuotraukų tinklelyje ir aprašymo bloke;
   - kitų siūlomų apartamentų kortelėse.
3. Kol nuotraukos paslėptos, išjungti nebereikalingas galerijų rodykles, taškus, skaitiklius ir išdidinimo langus.
4. Pašalinti objekto nuotraukų nuorodas ir iš viešo puslapio peržiūros metaduomenų, kad paslėptos nuotraukos nebūtų naudojamos socialinių tinklų peržiūrose ar objekto struktūriniuose duomenyse.
5. Pašalinti dabartinį grafinį logotipą iš klientinės svetainės antraštės ir poraštės. Antraštėje naudoti HTML etalonui būdingą tekstinį „MÁNAHLÍÐ“ ženklą su „Tröllaskagi · Iceland“ paantrašte ir išlaikyti veikiančią nuorodą į pradžią.
6. Pašalinti viešoje dalyje likusias „Dharma Stay“ vizualines nuorodas ten, kur jas pakeičia „Mánahlíð“ tapatybė; administravimo dalies tekstų nekeisti.
7. Patikrinti lietuvišką ir anglišką svetainę kompiuteryje bei telefone: placeholderių proporcijas, kortelių stabilumą ir meniu išdėstymą.

## Neliečiama

- Administravimo skydelyje rodomos ir saugomos nuotraukos.
- Interaktyvus lokacijos žemėlapis; pašalinama šalia jo esanti nuotrauka, ne pats žemėlapis.
- Rezervacijų, kainų ir prieinamumo logika.

## Techninės detalės

Bus naudojamas vienas bendras placeholderio komponentas su „Mánahlíð“ temos spalvomis, subtilia linijine tekstūra ir vaizdo vietą žyminčia ikona. Jis nekeis esamų `aspect-ratio` matmenų, todėl puslapiai nešokinės ir vėliau nuotraukas bus galima grąžinti nepakeitus maketo. Nuotraukų failai ir duomenys nebus trinami — tik neberodomi klientinėje dalyje.
