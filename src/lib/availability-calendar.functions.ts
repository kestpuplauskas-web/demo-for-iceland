import { createServerFn } from "@tanstack/react-start";

export type AvailabilityCalendar = { total: number; booked: Record<string, number> };

/** Public: per-night count of booked active properties (no personal data). */
export const getPublicAvailabilityCalendar = createServerFn({ method: "GET" }).handler(
  async (): Promise<AvailabilityCalendar> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ count, error: pErr }, { data, error: bErr }] = await Promise.all([
      supabaseAdmin.from("properties").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabaseAdmin.rpc("get_active_booked_dates"),
    ]);
    if (pErr || bErr) {
      console.error("[availability-calendar]", pErr?.message ?? bErr?.message);
      throw new Error("Failed to load availability.");
    }
    const today = new Date().toISOString().slice(0, 10);
    const limit = new Date(Date.now() + 400 * 86_400_000).toISOString().slice(0, 10);
    const perProp = new Map<string, Set<string>>();
    for (const b of (data ?? []) as Array<{ property_id: string; date_from: string; date_to: string }>) {
      const set = perProp.get(b.property_id) ?? new Set<string>();
      const d = new Date(`${b.date_from}T00:00:00Z`);
      const end = new Date(`${b.date_to}T00:00:00Z`);
      while (d < end) {
        const key = d.toISOString().slice(0, 10);
        if (key >= today && key <= limit) set.add(key);
        d.setUTCDate(d.getUTCDate() + 1);
      }
      perProp.set(b.property_id, set);
    }
    const booked: Record<string, number> = {};
    for (const set of perProp.values()) for (const k of set) booked[k] = (booked[k] ?? 0) + 1;
    return { total: count ?? 0, booked };
  },
);
