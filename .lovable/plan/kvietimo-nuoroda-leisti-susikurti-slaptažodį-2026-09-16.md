# Kvietimo nuoroda: leisti susikurti slaptažodį

## Kas negerai (patikrinta)

Kvietimo laiške esanti nuoroda veda į **svetimą adresą** — sistemoje įrašytas kanoninis adresas yra `demo.revoo.site`, o šis projektas gyvena `isdemo.revoo.site` (ir `idemo.lovable.app`). Todėl paspaudus mygtuką atsidaro kito projekto langas, kuriame nėra jūsų kvietimo — jis tik rašo „Atidarykite šį puslapį per kvietimo laiške esančią nuorodą“ ir slaptažodžio susikurti neleidžia.

Papildomai: `demo.revoo.site` net nėra tarp leidžiamų grįžimo adresų, todėl net ir teisinga nuoroda būtų atmesta.

## Ką padarysiu

1. **Teisingas adresas laiškuose.** Kvietimo ir slaptažodžio atstatymo nuorodos ves į `isdemo.revoo.site` (arba į tą aplinką, iš kurios kvietimas siunčiamas — peržiūros aplinkoje į peržiūrą, kad galėtumėte iškart išbandyti).

2. **Slaptažodžio susikūrimo langas visada suveikia.** Puslapis atpažins visus kvietimo nuorodos formatus (kodas adrese, patvirtinimo žymė, taip pat tokenai po `#`), po to iškart parodys du laukus: „Naujas slaptažodis“ ir „Pakartokite slaptažodį“ — lygiai kaip Rentivo projekte.

3. **Aiškus pranešimas, kai nuoroda nebegalioja.** Jei nuoroda pasibaigusi arba jau panaudota, vietoje tuščio lango bus parašyta, kad reikia naujo kvietimo, su nuoroda į prisijungimą.

4. **Patikrinimas nuo pradžios iki galo**: išsiųsiu kvietimą testiniam adresui, atidarysiu nuorodą, susikursiu slaptažodį ir patvirtinsiu, kad prisijungimas veikia.

## Techninės detalės

- `src/lib/app-url.server.ts`: `APP_BASE_URL` → `https://isdemo.revoo.site`; `appLink()` leis ir peržiūros (`*.lovable.app`) bei `localhost` origin.
- `src/routes/reset-password.tsx`: prie esamo `code` / `token_hash` apdorojimo pridedamas hash fragmento (`access_token` + `refresh_token` → `setSession`) ir `error_description` apdorojimas; klaidos būsena su aiškiu tekstu.
- Nauji vertimų raktai LT/EN (`auth.linkExpired`).
- Kvietimo generavimo logika (`src/lib/users.functions.ts`) nekeičiama.
- Po pakeitimų: tipų patikra ir realus srauto testas.
