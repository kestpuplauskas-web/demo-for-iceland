# Next step: a separate, ready-to-use admin panel for each new hotel

Registration works. Next, a new hotel (e.g. viskmb@gmail.com) needs to get its own clean workspace. Today some parts are still shared with Mánahlíð.

## What will change
1. **Separate settings for each hotel** – name, address, currency, logo, contacts and email settings belong to that hotel only. A new hotel starts empty, filled with its own registration details.
2. **Separate invoice numbering** – each hotel gets its own invoice sequence (e.g. starting at INV-0001).
3. **Welcome wizard on first login** – 3 short steps: hotel details → first cabin/room → photos. The "Setup checklist" shows progress.
4. **Trial status in the menu** – "Trial: 14 days left" is shown so the owner knows how long they have.
5. **The registration page shows the RevooStay brand**, not the Mánahlíð menu.

## How I will check it
- I sign in as viskmb@gmail.com and confirm: none of Mánahlíð's cabins, bookings, settings or invoices are visible.
- I sign in as Mánahlíð and confirm that nothing has changed.

## Steps after this one
- Subdomains: `hotel.revoostay.com` opens that hotel's own website.
- Stripe Connect with an automatic 2% fee.
- Sales page on `revoostay.com`.

## Technical details
- `general_settings` / invoice-numbering tables get `organization_id` + org isolation RLS; a migration copies the current values to the Mánahlíð org.
- `registerHotel` creates a starter settings row for the new org.
- Invoice numbers are generated per org (unique per `organization_id, number`).
- `/register` gets its own platform layout without the public site header.
