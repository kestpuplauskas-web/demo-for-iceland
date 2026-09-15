# Vienodas skaičių formatavimas

## Tikslas
Visoje klientinėje svetainėje ir administravimo skydelyje dinaminiai skaičiai nuo 1 000 bus rodomi su tūkstančių tarpais pagal `lt-LT` standartą.

## Pakeitimai
- Sukurti vieną bendrą `formatNumber` funkciją su `Intl.NumberFormat('lt-LT')` ir pasirenkamu trupmeninių skaitmenų kiekiu.
- Esamas kainų ir administravimo valiutos funkcijas perjungti į bendrą formatavimą.
- Pritaikyti funkciją visoms matomoms dinaminėms sumoms, kainoms, pajamoms, išlaidoms, kiekiams ir analitikos skaičiams.
- Nekeisti datų, metų, telefonų, pašto kodų, identifikatorių ir procentų reikšmės.
- Patikrinti pagrindinį skydelį, rezervacijas, objektus, išlaidas, analitiką ir klientinės dalies kainas.

## Techninė detalė
`formatNumber(value, options)` naudos `Intl.NumberFormat('lt-LT')`; valiutos pagalbinės funkcijos prie rezultato pridės esamą objekto arba skydelio valiutos ženklą.
