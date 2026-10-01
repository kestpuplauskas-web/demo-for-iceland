# 12 naujų islandiškų namelių

## Kas bus padaryta
Prie esamų „Aurora Cabin" ir „Odin Lodge" pridedama 12 naujų objektų tuo pačiu pavadinimų stiliumi („Vardas Tipas – Aprašomasis subtitras"), visi Ólafsfjörður / Tröllaskagi, Iceland, aktyvūs, USD.

| # | Pavadinimas | Kaina/naktį | Svečiai |
|---|---|---|---|
| 1 | Freyja Cabin – Fjord View Hideaway | $429 | 2 |
| 2 | Thor Lodge – Mountain Ridge Chalet | $579 | 6 |
| 3 | Hekla Cabin – Volcanic Stone Retreat | $469 | 4 |
| 4 | Fjord House – Seaside Turf Cottage | $519 | 4 |
| 5 | Geysir Lodge – Hot Tub Wilderness Villa | $599 | 6 |
| 6 | Glacier Cabin – Snowfield Panorama | $489 | 2 |
| 7 | Saga House – Nordic Family Retreat | $559 | 6 |
| 8 | Vatna Cabin – Lakeside Sauna Hut | $449 | 2 |
| 9 | Midnight Sun Lodge – Arctic Summer Villa | $589 | 5 |
| 10 | Lava Cabin – Black Sand Hideaway | $419 | 2 |
| 11 | Skadi Lodge – Ski-in Mountain Chalet | $539 | 4 |
| 12 | Puffin Cabin – Coastal Cliff Retreat | $409 | 3 |

Kiekvienam: trumpas angliškas aprašymas, plotas, lovos, kambariai, patogumai (sauna / hot tub / fireplace / Wi-Fi ir pan.).

## Nuotraukos (po 4 kiekvienam, iš viso 48)
1. Išorė — islandiška architektūra (velėniniai stogai, juoda mediena, gofruotas metalas) su kalnais/fjordu.
2. Svetainė — skandinaviškas interjeras, židinys, panoraminiai langai.
3. Miegamasis / vonia — šilti mediniai tonai, vilna.
4. Aplinka — pašvaistė, sniegas, juodas smėlis, vidurnakčio saulė (pagal namelio temą).

Nuotraukos įkeliamos į saugyklą ir priskiriamos objektui (1-oji — viršelis), jas galėsite keisti admin dalyje kaip ir dabar.

## Pastabos
- Esami du objektai ir rezervacijos nekeičiami.
- Svetainėje nauji nameliai atsiras sąraše ir kalendoriaus laisvų vietų skaičiuose (bus 14 vietoj 2) — viešoje svetainėje po publikavimo.

## Techniniai
- Generavimas: imagegen (fast, 1600x1067 jpg) į /tmp, upload į esamą viešą bucket'ą `properties/<slug>/`.
- Įrašai per insert į `properties` (cover_image_url, image_urls, sort_order 3–14, status active, currency USD); room_status sukuriamas trigeriu.
