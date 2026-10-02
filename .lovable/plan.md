# Gražesnė sąskaita pagal JAV standartą

## Kas dabar negerai
- Logotipas imamas tik iš atskiro „Invoice logo“ lauko — jis tuščias, todėl brendo nesimato (Branding logotipas nenaudojamas).
- „Issued by“ rodomas tik jei užpildytas atskiras laukas — kitaip dingsta.
- Nėra viešbučio kontaktų (telefono, el. pašto, svetainės), rezervacijos numerio, atvykimo/išvykimo datų, svečių skaičiaus.
- Lietuviškos/europietiškos liekanos: „Series … No.“, „Amount in words“, „Invoice accepted by: ____“, „Company code“, kaina valiutos ženklu gale (539.00 $).

## Naujas dizainas (A4 / Letter-stiliaus išdėstymas)
```text
[LOGO]  Mánahlíð                              INVOICE
        adresas · tel · el. paštas            Invoice #  SF-0012
                                              Date       Oct 2, 2026
                                              Booking #  MH-2026-0123
---------------------------------------------- [ PAID ] žalias ženklas
BILL TO                 STAY DETAILS
Vardas Pavardė          Property: Aurora Cabin
adresas, šalis          Check-in  Oct 15, 2026
tel · el. paštas        Check-out Oct 16, 2026 · 1 night · 2 guests
----------------------------------------------
DESCRIPTION             QTY   RATE        AMOUNT   (tamsi antraštės juosta,
Stay — Aurora Cabin       1   $539.00    $539.00    zebra eilutės)
Breakfast                 2   $16.00      $32.00
                                  Subtotal   $571.00
                                  Tax (x%)     $0.00  (jei taikomas)
                                  [ TOTAL DUE / PAID  $571.00 ] tamsus blokas
----------------------------------------------
Payment details (bankas, sąskaita)   Issued by: vardas / viešbutis
Pastabos · "Thank you for staying with us."
Apačia: viešbučio pavadinimas · svetainė · puslapis 1/1
```
- Spalvos iš svetainės stiliaus: tamsi (ink) antraštėms, žalias akcentas, šviesiai pilkos linijos.
- JAV formatai: datos „Oct 15, 2026“, sumos „$1,234.56“ (ženklas priekyje), „Tax“ vietoj „VAT“, be „Amount in words“ ir parašo linijos.
- Logotipas: „Invoice logo“ → jei tuščias, Branding tamsus logotipas; proporcijos išlaikomos, palaikomas ir SVG.
- „Issued by“: nustatymų laukas → jei tuščias, viešbučio pavadinimas.

## Kur pasikeis
- Rezervacijos sąskaitos peržiūra ir PDF atsisiuntimas admin skydelyje.
- Sąskaitos pavyzdys nustatymuose (rodys tą patį dizainą su pavyzdiniais duomenimis).
- Senos jau išrašytos sąskaitos taip pat bus rodomos naujame dizaine (logotipas ir kontaktai papildomi iš nustatymų peržiūros metu); sumos, numeriai nekeičiami.

## Techninė dalis
- `src/lib/invoice-pdf.ts`: perrašomas `buildInvoicePdf` išdėstymas; `InvoiceDocData` papildomas neprivalomais `bookingNumber`, `stay {property, checkIn, checkOut, nights, guests}`, `seller.phone/email/website`, `status`. Logotipo dydis pagal natūralias proporcijas (`getImageProperties`), SVG rasterizuojamas per canvas.
- `invoices.server.ts`: į `seller` įrašomi telefonas, el. paštas, svetainė, logo fallback į `brandLogoUrl`; `issued_by` fallback į pavadinimą.
- `InvoiceViewerDialog`: papildomai gauna rezervaciją (datos, numeris, svečiai) ir viešą brendą; trūkstami seni laukai papildomi kliento pusėje.
- `InvoicePreviewDialog`: pavyzdiniai stay duomenys.
- Duomenų bazės struktūra nekeičiama.
