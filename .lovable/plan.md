# Objektų nuotraukų placeholderiai ir logotipo pašalinimas

## Apimtis

Pakeitimai taikomi tik viešajai klientinei svetainei. Administravimo skydelis, objektų duomenys ir įkeltos nuotraukos duomenų bazėje nekeičiami.

## Pakeitimai

1. Sukurti vientiso dizaino objektų nuotraukų placeholderį, išlaikantį dabartinius vaizdų formatus ir kortelių aukščius.
2. Apartamentų bei kambarių nuotraukas pakeisti placeholderiais:
   - apartamentų ir kategorijų kortelėse;
   - „Laisvi kambariai“ rezultatuose;
   - konkretaus apartamento viršuje, nuotraukų tinklelyje ir aprašymo bloke;
   - kitų siūlomų apartamentų kortelėse.
3. Kol nuotraukos paslėptos, išjungti nebereikalingas galerijų rodykles, taškus, skaitiklius ir išdidinimo langus.
4. Pašalinti objekto nuotraukų nuorodas ir iš viešo puslapio peržiūros metaduomenų, kad paslėptos nuotraukos nebūtų naudojamos socialinių tinklų peržiūrose ar objekto struktūriniuose duomenyse.
5. Pašalinti grafinį logotipą iš klientinės svetainės antraštės ir poraštės, išlaikant veikiančią nuorodą į pradžią bei tvarkingą navigacijos lygiavimą.
6. Patikrinti lietuvišką ir anglišką svetainę kompiuteryje bei telefone: placeholderių proporcijas, kortelių stabilumą ir meniu išdėstymą.

## Neliečiama

- Pagrindinio puslapio, lokacijos, restorano, pirties ir kitų ne objektų sekcijų atmosferinės nuotraukos.
- Administravimo skydelyje rodomos ir saugomos objektų nuotraukos.
- Rezervacijų, kainų ir prieinamumo logika.

## Techninės detalės

Bus naudojamas vienas bendras placeholderio komponentas su esamos viešos temos spalvomis, subtilia linijine tekstūra ir vaizdo vietą žyminčia ikona. Jis nekeis esamų `aspect-ratio` matmenų, todėl puslapiai nešokinės ir vėliau nuotraukas bus galima grąžinti nepakeitus maketo.
