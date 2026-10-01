# Užimtumo kalendorius renkantis datas pagrindiniame puslapyje

## Ką gaus svečias
Pagrindiniame puslapyje paspaudus datų lauką (ir laisvų apartamentų paieškos puslapyje), kalendorius iškart rodo užimtumą, kaip Rentivo:

- **Žalia diena + skaičius** (pvz. „2“) – tiek apartamentų laisva tą naktį.
- **Gintarinė diena + „1“** – liko mažai (laisvas tik vienas apartamentas).
- **Pilka, perbraukta diena** – viskas užimta, pasirinkti negalima.
- Praėjusios dienos – blankios, nepasirenkamos.
- Po kalendoriumi – legenda: „Available“, „Few left“, „Fully booked“ (anglų k., nes svetainė tik EN).
- Negalima pasirinkti laikotarpio, kuris kerta pilnai užimtą naktį – check-out ant užimtos dienos leidžiamas (išvykimo diena).

Dizainas lieka svetainės stiliaus (tamsus, žalia pašvaistės spalva), ne Rentivo šviesus – perimama tik logika ir žymėjimai.

## Logika
- Diena = naktis [data, kita diena). Laisvų skaičius = aktyvūs apartamentai, neturintys neatšauktos rezervacijos tą naktį.
- „Mažai laisvų“ = laisvas 1, kai iš viso yra 2+ apartamentai.
- Duomenys kraunami vieną kartą atidarius kalendorių ir rodomi 12 mėn. į priekį; krovimo metu dienos rodomos be skaičių (ne blokuojamos).

## Technical details
- Naujas viešas server fn `getPublicAvailabilityCalendar` (src/lib/availability-calendar.functions.ts): naudoja esamą `get_active_booked_dates()` + aktyvių objektų skaičių, grąžina tik `{ date, free, total }` (be asmens duomenų).
- `DateRangeField.tsx`: `useQuery` → modifiers `free`, `few`, `full`; `disabled` = praeitis + pilnai užimtos dienos; custom `DayButton` su mažu skaičiumi po data; range validacija `nextRange` atmeta intervalus per užimtas naktis; legenda apačioje.
- Spalvos per esamus `.site-theme` tokenus (aurora, brass, muted). Be DB pakeitimų.
- Patikra: Playwright atidaryti kalendorių pagrindiniame puslapyje, patvirtinti skaičius ir pilkas dienas pagal esamas rezervacijas (spalis–lapkritis beveik užimti).
