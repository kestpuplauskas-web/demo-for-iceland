/**
 * Kambarių parinkimas pagal svečių skaičių.
 * Naudojama admin naujos rezervacijos formoje: pasiūlo laisvų objektų rinkinį,
 * kurio bendra talpa padengia svečių skaičių.
 */

export type RoomCandidate = {
  id: string;
  name: string;
  maxGuests: number;
};

export type RoomAllocation = {
  propertyId: string;
  adults: number;
  children: number;
  infants: number;
  amount: number;
};

export function totalCapacity(rooms: Array<{ maxGuests: number }>): number {
  return rooms.reduce((s, r) => s + Math.max(0, Number(r.maxGuests) || 0), 0);
}

/**
 * Greedy: pirmiausia didžiausi kambariai, tada paskutinis pakeičiamas
 * mažiausiu vis dar tinkamu (kad nebūtų per didelio kambario be reikalo).
 */
export function suggestRooms<T extends RoomCandidate>(candidates: T[], guests: number): T[] {
  const need = Math.max(1, Math.floor(guests) || 1);
  const pool = [...candidates]
    .filter((c) => (Number(c.maxGuests) || 0) > 0)
    .sort((a, b) => b.maxGuests - a.maxGuests);
  if (pool.length === 0) return [];

  const picked: T[] = [];
  let covered = 0;
  for (const c of pool) {
    if (covered >= need) break;
    picked.push(c);
    covered += Number(c.maxGuests) || 0;
  }
  if (picked.length === 0) return [];

  // Paskutinį kambarį keičiam mažiausiu tinkamu (nepanaudotų kandidatų tarpe).
  const last = picked[picked.length - 1]!;
  const withoutLast = covered - (Number(last.maxGuests) || 0);
  const remaining = need - withoutLast;
  if (remaining > 0) {
    const usedIds = new Set(picked.slice(0, -1).map((p) => p.id));
    const fit = pool
      .filter((c) => !usedIds.has(c.id) && (Number(c.maxGuests) || 0) >= remaining)
      .sort((a, b) => a.maxGuests - b.maxGuests)[0];
    if (fit) picked[picked.length - 1] = fit;
  }
  return picked;
}

/** Paskirsto svečius po kambarius pagal talpą (kūdikiai dedami su vaikais/suaugusiais). */
export function distributeGuests(
  rooms: Array<{ maxGuests: number }>,
  adults: number,
  children: number,
  infants: number,
): Array<{ adults: number; children: number; infants: number }> {
  const out = rooms.map(() => ({ adults: 0, children: 0, infants: 0 }));
  if (rooms.length === 0) return out;

  let a = Math.max(0, Math.floor(adults) || 0);
  let c = Math.max(0, Math.floor(children) || 0);
  let i = Math.max(0, Math.floor(infants) || 0);

  // Bent 1 suaugęs kiekvienam kambariui, jei įmanoma.
  for (let r = 0; r < rooms.length && a > 0; r += 1) {
    out[r]!.adults = 1;
    a -= 1;
  }

  const cap = (r: number) => Math.max(1, Number(rooms[r]!.maxGuests) || 1);
  const used = (r: number) => out[r]!.adults + out[r]!.children;

  for (let r = 0; r < rooms.length && a > 0; r += 1) {
    const free = cap(r) - used(r);
    const take = Math.min(free, a);
    out[r]!.adults += take;
    a -= take;
  }
  for (let r = 0; r < rooms.length && c > 0; r += 1) {
    const free = cap(r) - used(r);
    const take = Math.min(free, c);
    out[r]!.children += take;
    c -= take;
  }
  // Likutis (jei talpos nepakanka) — į pirmą kambarį.
  if (a > 0) out[0]!.adults += a;
  if (c > 0) out[0]!.children += c;

  for (let r = 0; r < rooms.length && i > 0; r += 1) {
    if (used(r) > 0) {
      out[r]!.infants += 1;
      i -= 1;
    }
  }
  if (i > 0) out[0]!.infants += i;

  return out;
}
