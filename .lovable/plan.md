# Žemėlapio pataisymas pagrindiniame puslapyje

Žemėlapio paslaugos teikėjas (CARTO) dabar reikalauja rakto, todėl vietoje žemėlapio matosi užrašai „API KEY REQUIRED“.

## Kas pasikeis
- Žemėlapio fonas bus imamas iš nemokamo šaltinio, kuriam rakto nereikia (OpenStreetMap).
- Žymeklis, vieta, priartinimo mygtukai ir išdėstymas lieka tokie patys.
- Žemėlapio apačioje bus rodoma OpenStreetMap nuoroda (to reikalauja jų sąlygos).

## Patikra
Atidaromas pagrindinis puslapis ir patikrinama, ar žemėlapis matosi be užrašų.

## Techninės detalės
LocationMap komponente rastro šaltinis keičiamas iš `basemaps.cartocdn.com` į `tile.openstreetmap.org/{z}/{x}/{y}.png` ir atnaujinama autorystės eilutė.
