import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  computeQuote,
  occupancyForDate,
  priceForNight,
  stayNightDates,
  type OccupancyTier,
  type RateCalendarRow,
} from "@/lib/booking-pricing";

import { assertAdmin as ensureAdmin, assertCanView } from "@/lib/users.server";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Neteisinga data");

export const listRateCalendar = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ property_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertCanView(context);
    const { data: rows, error } = await context.supabase
      .from("property_rate_calendar")
      .select("*")
      .eq("property_id", data.property_id)
      .order("date_from", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const rowInput = z
  .object({
    id: z.string().uuid().optional(),
    property_id: z.string().uuid(),
    date_from: isoDate,
    date_to: isoDate,
    kind: z.enum(["season", "event", "manual"]),
    label: z.string().trim().min(1, "Enter a name").max(100),
    multiplier: z.number().positive().max(10).nullable(),
    fixed_price: z.number().min(0).max(100000).nullable(),
    priority: z.number().int().min(-100).max(100).default(0),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  })
  .refine((v) => (v.multiplier == null) !== (v.fixed_price == null), {
    message: "Choose either a percentage change or a fixed price — not both.",
  })
  .refine((v) => v.date_to >= v.date_from, { message: "The end date cannot be earlier than the start date." });

export const saveRateCalendarRow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => rowInput.parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { id, ...rest } = data;
    const q = id
      ? context.supabase.from("property_rate_calendar").update(rest).eq("id", id)
      : context.supabase.from("property_rate_calendar").insert({ ...rest, created_by: context.userId });
    const { data: row, error } = await q.select("*").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteRateCalendarRow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase.from("property_rate_calendar").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const tierSchema = z.object({ minOccupancyPct: z.number().min(0).max(100), multiplier: z.number().positive().max(10) });

export const saveOccupancyPricing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        property_id: z.string().uuid(),
        tiers: z.array(tierSchema).max(20),
        min_nightly_rate: z.number().min(0).nullable(),
        max_nightly_rate: z.number().min(0).nullable(),
        dynamic_pricing_enabled: z.boolean(),
      })
      .superRefine((v, ctx) => {
        for (let i = 1; i < v.tiers.length; i++) {
          if (v.tiers[i].minOccupancyPct <= v.tiers[i - 1].minOccupancyPct) {
            ctx.addIssue({
              code: "custom",
              message: `Occupancy thresholds must increase in sequence — threshold ${v.tiers[i].minOccupancyPct}% is repeated or lower than the previous one.`,
            });
            return;
          }
        }
      })
      .refine((v) => v.min_nightly_rate == null || v.max_nightly_rate == null || v.max_nightly_rate >= v.min_nightly_rate, {
        message: "The maximum price cannot be lower than the minimum price.",
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase
      .from("properties")
      .update({
        occupancy_pricing: data.tiers,
        min_nightly_rate: data.min_nightly_rate,
        max_nightly_rate: data.max_nightly_rate,
        dynamic_pricing_enabled: data.dynamic_pricing_enabled,
      })
      .eq("id", data.property_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const previewDynamicPrice = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ property_id: z.string().uuid(), date_from: isoDate, date_to: isoDate }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertCanView(context);
    const sb = context.supabase;
    const [{ data: prop, error: pErr }, { data: cal, error: cErr }, { data: active, error: aErr }, { data: bks, error: bErr }] =
      await Promise.all([
        sb.from("properties")
          .select("price_per_night, price_tiers, dynamic_pricing_enabled, min_nightly_rate, max_nightly_rate, occupancy_pricing")
          .eq("id", data.property_id)
          .single(),
        sb.from("property_rate_calendar").select("*").eq("property_id", data.property_id)
          .lte("date_from", data.date_to).gte("date_to", data.date_from),
        sb.from("properties").select("id").eq("is_active", true),
        sb.from("bookings").select("property_id, date_from, date_to, status")
          .lt("date_from", data.date_to).gt("date_to", data.date_from).neq("status", "cancelled"),
      ]);
    const err = pErr ?? cErr ?? aErr ?? bErr;
    if (err) throw new Error(err.message);
    if (!prop) throw new Error("Objektas nerastas.");
    const ids = (active ?? []).map((r: { id: string }) => r.id);
    const occupancyByDate: Record<string, number> = {};
    for (const d of stayNightDates(data.date_from, data.date_to)) {
      occupancyByDate[d] = occupancyForDate(d, ids, bks ?? []);
    }
    const q = computeQuote({
      pricePerNight: Number(prop.price_per_night),
      priceTiers: (prop.price_tiers as any) ?? [],
      extraServices: [],
      dateFrom: data.date_from,
      dateTo: data.date_to,
      adults: 1,
      children: 0,
      infants: 0,
      selectedExtras: [],
      dynamicPricing: {
        enabled: Boolean(prop.dynamic_pricing_enabled),
        rateCalendar: (cal ?? []) as RateCalendarRow[],
        occupancyTiers: (prop.occupancy_pricing as unknown as OccupancyTier[]) ?? [],
        minNightlyRate: prop.min_nightly_rate != null ? Number(prop.min_nightly_rate) : null,
        maxNightlyRate: prop.max_nightly_rate != null ? Number(prop.max_nightly_rate) : null,
        occupancyByDate,
      },
    });
    return { ...q, occupancyByDate };
  });

/** For the admin booking form: dynamic pricing data for selected properties. */
export const getDynamicPricingInputs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({ property_ids: z.array(z.string().uuid()).max(50), date_from: isoDate, date_to: isoDate })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertCanView(context);
    const { loadDynamicPricingMap } = await import("@/lib/dynamic-pricing.server");
    return loadDynamicPricingMap(data.property_ids, data.date_from, data.date_to);
  });

/** Property dynamic pricing settings (toggle, thresholds, occupancy tiers). */
export const getPricingSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ property_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertCanView(context);
    const { data: row, error } = await context.supabase
      .from("properties")
      .select("dynamic_pricing_enabled, min_nightly_rate, max_nightly_rate, occupancy_pricing, price_per_night")
      .eq("id", data.property_id)
      .single();
    if (error) throw new Error(error.message);
    return {
      enabled: Boolean(row.dynamic_pricing_enabled),
      min: row.min_nightly_rate != null ? Number(row.min_nightly_rate) : null,
      max: row.max_nightly_rate != null ? Number(row.max_nightly_rate) : null,
      tiers: ((row.occupancy_pricing as unknown as OccupancyTier[]) ?? []),
      base: Number(row.price_per_night),
    };
  });

/* ───────────── Centrinis kainodaros ekranas (/admin/pricing) ───────────── */

/** Pricing summary for all properties. */
export const listPricingOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertCanView(context);
    const { data, error } = await context.supabase
      .from("properties")
      .select(
        "id, name, is_active, price_per_night, dynamic_pricing_enabled, min_nightly_rate, max_nightly_rate, occupancy_pricing",
      )
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((p) => ({
      id: p.id as string,
      name: p.name as string,
      is_active: Boolean(p.is_active),
      base: Number(p.price_per_night),
      enabled: Boolean(p.dynamic_pricing_enabled),
      min: p.min_nightly_rate != null ? Number(p.min_nightly_rate) : null,
      max: p.max_nightly_rate != null ? Number(p.max_nightly_rate) : null,
      tiers: (p.occupancy_pricing as unknown as OccupancyTier[]) ?? [],
    }));
  });

/** Pricing rules for one or all properties. */
export const listRateCalendarMulti = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ property_id: z.string().uuid().nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertCanView(context);
    let q = context.supabase
      .from("property_rate_calendar")
      .select("*")
      .order("date_from", { ascending: true });
    if (data.property_id) q = q.eq("property_id", data.property_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Heatmap: price per day for a selected property, or the average across all. */
export const getPricingHeatmap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ property_id: z.string().uuid().nullable(), date_from: isoDate, date_to: isoDate }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertCanView(context);
    const sb = context.supabase;
    let propQ = sb
      .from("properties")
      .select(
        "id, price_per_night, dynamic_pricing_enabled, min_nightly_rate, max_nightly_rate, occupancy_pricing",
      )
      .eq("is_active", true);
    if (data.property_id) propQ = propQ.eq("id", data.property_id);

    const [{ data: props, error: pErr }, { data: cal, error: cErr }, { data: bks, error: bErr }] =
      await Promise.all([
        propQ,
        sb
          .from("property_rate_calendar")
          .select("property_id, date_from, date_to, kind, multiplier, fixed_price, priority, created_at")
          .lte("date_from", data.date_to)
          .gte("date_to", data.date_from),
        sb
          .from("bookings")
          .select("property_id, date_from, date_to, status")
          .lt("date_from", data.date_to)
          .gt("date_to", data.date_from)
          .neq("status", "cancelled"),
      ]);
    const err = pErr ?? cErr ?? bErr;
    if (err) throw new Error(err.message);

    const list = props ?? [];
    const activeIds = list.map((p: { id: string }) => p.id);
    const dates = stayNightDates(data.date_from, data.date_to);
    const days = dates.map((date) => {
      const occupancy = occupancyForDate(date, activeIds, bks ?? []);
      let sumBase = 0;
      let sumPrice = 0;
      let source: string = "base";
      for (const p of list as any[]) {
        const base = Number(p.price_per_night) || 0;
        const rows = ((cal ?? []) as any[]).filter((r) => r.property_id === p.id) as RateCalendarRow[];
        const n = priceForNight(base, date, {
          enabled: Boolean(p.dynamic_pricing_enabled),
          rateCalendar: rows,
          occupancyTiers: (p.occupancy_pricing as unknown as OccupancyTier[]) ?? [],
          minNightlyRate: p.min_nightly_rate != null ? Number(p.min_nightly_rate) : null,
          maxNightlyRate: p.max_nightly_rate != null ? Number(p.max_nightly_rate) : null,
          occupancyByDate: { [date]: occupancy },
        });
        sumBase += base;
        sumPrice += n.price;
        if (n.source !== "base") source = n.source;
      }
      const count = list.length || 1;
      const base = Math.round((sumBase / count) * 100) / 100;
      const price = Math.round((sumPrice / count) * 100) / 100;
      return {
        date,
        base,
        price,
        source,
        occupancy: Math.round(occupancy),
        ratio: base > 0 ? price / base : 1,
      };
    });
    return { days };
  });

/** A single rule applied to multiple properties at once. */
export const saveRateCalendarBulk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        property_ids: z.array(z.string().uuid()).min(1, "Select at least one property.").max(200),
        date_from: isoDate,
        date_to: isoDate,
        kind: z.enum(["season", "event", "manual"]),
        label: z.string().trim().min(1, "Enter a name").max(100),
        multiplier: z.number().positive().max(10).nullable(),
        fixed_price: z.number().min(0).max(100000).nullable(),
            priority: z.number().int().min(-100).max(100).default(0),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#f59e0b"),
      })
      .refine((v) => (v.multiplier == null) !== (v.fixed_price == null), {
        message: "Choose either a percentage change or a fixed price — not both.",
      })
      .refine((v) => v.date_to >= v.date_from, {
        message: "The end date cannot be earlier than the start date.",
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { property_ids, ...rest } = data;
    const rows = property_ids.map((property_id) => ({ ...rest, property_id, created_by: context.userId }));
    const { error } = await context.supabase.from("property_rate_calendar").insert(rows);
    if (error) throw new Error(error.message);
    return { ok: true, count: rows.length };
  });

/** Dynamic pricing toggle for multiple properties at once. */
export const bulkSetDynamicPricing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ property_ids: z.array(z.string().uuid()).min(1).max(200), enabled: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase
      .from("properties")
      .update({ dynamic_pricing_enabled: data.enabled })
      .in("id", data.property_ids);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Bulk deletion of multiple rules at once. */
export const deleteRateCalendarRows = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ ids: z.array(z.string().uuid()).min(1).max(2000) }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase.from("property_rate_calendar").delete().in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, count: data.ids.length };
  });

/** Property base, min, and max price (from the Pricing table). */
export const updatePropertyPrices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        property_id: z.string().uuid(),
        price_per_night: z.number().min(0).max(100000),
        min_nightly_rate: z.number().min(0).max(100000).nullable(),
        max_nightly_rate: z.number().min(0).max(100000).nullable(),
      })
      .refine((v) => v.min_nightly_rate == null || v.max_nightly_rate == null || v.max_nightly_rate >= v.min_nightly_rate, {
        message: "The maximum price cannot be lower than the minimum price.",
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { property_id, ...rest } = data;
    const { error } = await context.supabase.from("properties").update(rest).eq("id", property_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
