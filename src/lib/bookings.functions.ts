import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertCanView } from "./users.server";
import { recalcExtras, nightsBetweenDates, type ExtraCalcKind } from "@/lib/booking-extras";

export const BOOKING_SOURCES = ["phone", "whatsapp", "website", "booking", "airbnb", "other"] as const;
// "direct" remains only for backward compatibility with old records (not shown in the list)
export const BOOKING_SOURCE_VALUES = [...BOOKING_SOURCES, "direct"] as const;
export const BOOKING_STATUSES = ["confirmed", "pending", "completed", "cancelled"] as const;
/** All possible statuses, including those imported from external calendars (not shown in the form). */
export const ALL_BOOKING_STATUSES = [...BOOKING_STATUSES, "blocked_external"] as const;

export const BOOKING_SOURCE_LABEL_KEYS: Record<string, string> = {
  phone: "enums.bookingSource.phone",
  whatsapp: "enums.bookingSource.whatsapp",
  website: "enums.bookingSource.website",
  booking: "enums.bookingSource.booking",
  airbnb: "enums.bookingSource.airbnb",
  other: "enums.bookingSource.other",
  direct: "enums.bookingSource.direct",
};

export const BOOKING_STATUS_LABEL_KEYS: Record<string, string> = {
  confirmed: "enums.bookingStatus.confirmed",
  pending: "enums.bookingStatus.pending",
  completed: "enums.bookingStatus.completed",
  cancelled: "enums.bookingStatus.cancelled",
  blocked_external: "enums.bookingStatus.blocked_external",
};

const bookingInput = z.object({
  property_id: z.string().uuid(),
  date_from: z.string().min(1),
  date_to: z.string().min(1),
  check_in_time: z.string().trim().max(10).default(""),
  check_out_time: z.string().trim().max(10).default(""),
  location: z.string().trim().max(300).default(""),
  guests: z.number().int().min(1).max(50).default(1),
  adults_count: z.number().int().min(1).max(50).default(1),
  children_count: z.number().int().min(0).max(50).default(0),
  infants_count: z.number().int().min(0).max(50).default(0),
  total_guests: z.number().int().min(1).max(50).default(1),
  customer_name: z.string().trim().max(200).default(""),
  customer_phone: z.string().trim().max(50).default(""),
  customer_email: z
    .string()
    .trim()
    .max(255)
    .default("")
    .refine(
      (v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      "Invalid email",
    ),
  customer_address: z.string().trim().max(300).default(""),
  customer_country: z.string().trim().max(100).default("Lietuva"),
  customer_id_code: z.string().trim().max(50).default(""),
  client_type: z.enum(["person", "company"]).default("person"),
  birth_date: z
    .string()
    .trim()
    .default("")
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  company_name: z.string().trim().max(200).default(""),
  company_code: z.string().trim().max(50).default(""),
  is_vat_payer: z.boolean().default(false),
  vat_number: z.string().trim().max(50).default(""),
  source: z.enum(BOOKING_SOURCE_VALUES).default("phone"),
  status: z.enum(BOOKING_STATUSES).default("confirmed"),
  total_amount: z.number().min(0).max(1000000).default(0),
  note: z.string().max(2000).default(""),
  extras: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(100),
        calc: z.enum(["per_person", "per_child", "flat_per_day"]),
        pricePerDay: z.number().min(0).max(100000).default(0),
        amount: z.number().min(0).max(1000000).default(0),
      }),
    )
    .max(20)
    .default([]),
  extras_total: z.number().min(0).max(1000000).default(0),
}).superRefine((v, ctx) => {
  if (v.client_type === "company") {
    if (!v.company_name) ctx.addIssue({ code: "custom", path: ["company_name"], message: "Company name is required" });
    if (!v.company_code) ctx.addIssue({ code: "custom", path: ["company_code"], message: "Company code is required" });
    if (v.is_vat_payer && !v.vat_number) ctx.addIssue({ code: "custom", path: ["vat_number"], message: "PVM kodas privalomas" });
  } else if (!v.customer_name) {
    ctx.addIssue({ code: "custom", path: ["customer_name"], message: "Full name is required" });
  }
});

export type BookingInput = z.infer<typeof bookingInput>;

const ensureAdmin = async (ctx: { supabase: any; userId: string }) => {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
};

const withServerExtras = async (
  supabase: any,
  data: BookingInput,
): Promise<BookingInput> => {
  const { data: prop, error } = await supabase
    .from("properties")
    .select("extra_services")
    .eq("id", data.property_id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const defined =
    (prop?.extra_services as Array<{ name: string; calc: ExtraCalcKind; pricePerDay: number }>) ?? [];
  const { extras, extras_total } = recalcExtras(defined, data.extras ?? [], {
    adults: data.adults_count,
    children: data.children_count,
    infants: data.infants_count,
    days: nightsBetweenDates(data.date_from, data.date_to),
  });
  return { ...data, extras, extras_total };
};

// Prevents overlapping bookings for the same property (cancelled ones are ignored).
// Half-open interval: [date_from, date_to) — another guest may arrive on the departure day.
const assertNoOverlap = async (
  supabase: any,
  input: { property_id: string; date_from: string; date_to: string; excludeId?: string },
) => {
  if (input.date_to <= input.date_from) {
    throw new Error("Departure date must be later than the arrival date");
  }
  let q = supabase
    .from("bookings")
    .select("id, date_from, date_to, customer_name, company_name")
    .eq("property_id", input.property_id)
    .neq("status", "cancelled")
    .lt("date_from", input.date_to)
    .gt("date_to", input.date_from);
  if (input.excludeId) q = q.neq("id", input.excludeId);
  const { data: rows, error } = await q;
  if (error) throw new Error(error.message);
  if (rows && rows.length > 0) {
    const c = rows[0];
    const who = c.customer_name || c.company_name || "—";
    throw new Error(
      `These dates are already taken: ${who} (${c.date_from} → ${c.date_to}). Booking not saved.`,
    );
  }
};

export const listBookings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        propertyId: z.string().uuid().optional(),
        status: z.enum(ALL_BOOKING_STATUSES).optional(),
        from: z.string().optional(),
        to: z.string().optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertCanView(context);
    let q = context.supabase
      .from("bookings")
      .select("*, properties(id, name)")
      .order("date_from", { ascending: false });
    if (data.propertyId) q = q.eq("property_id", data.propertyId);
    if (data.status) q = q.eq("status", data.status);
    if (data.from) q = q.gte("date_to", data.from);
    if (data.to) q = q.lte("date_from", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertCanView(context);
    const { data: row, error } = await context.supabase
      .from("bookings")
      .select("*, properties(id, name)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const checkBookingConflicts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        property_id: z.string().uuid(),
        date_from: z.string().min(1),
        date_to: z.string().min(1),
        excludeId: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertCanView(context);
    let q = context.supabase
      .from("bookings")
      .select("id, date_from, date_to, customer_name, status")
      .eq("property_id", data.property_id)
      .neq("status", "cancelled")
      .lt("date_from", data.date_to)
      .gt("date_to", data.date_from);
    if (data.excludeId) q = q.neq("id", data.excludeId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listOccupiedRanges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        property_id: z.string().uuid(),
        excludeId: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertCanView(context);
    let q = context.supabase
      .from("bookings")
      .select("id, date_from, date_to")
      .eq("property_id", data.property_id)
      .neq("status", "cancelled");
    if (data.excludeId) q = q.neq("id", data.excludeId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// Free (active) properties for the given period — excluding overlapping non-cancelled bookings.
export const listFreePropertyIds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        date_from: z.string().min(1),
        date_to: z.string().min(1),
        excludeId: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertCanView(context);
    if (data.date_to <= data.date_from) return [] as string[];
    const { data: props, error: pErr } = await context.supabase
      .from("properties")
      .select("id")
      .eq("is_active", true);
    if (pErr) throw new Error(pErr.message);

    let q = context.supabase
      .from("bookings")
      .select("property_id")
      .neq("status", "cancelled")
      .lt("date_from", data.date_to)
      .gt("date_to", data.date_from);
    if (data.excludeId) q = q.neq("id", data.excludeId);
    const { data: busy, error: bErr } = await q;
    if (bErr) throw new Error(bErr.message);

    const taken = new Set((busy ?? []).map((b: { property_id: string }) => b.property_id));
    return ((props ?? []) as Array<{ id: string }>)
      .map((p) => p.id)
      .filter((id) => !taken.has(id));
  });

export const createBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => bookingInput.parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    await assertNoOverlap(context.supabase, {
      property_id: data.property_id,
      date_from: data.date_from,
      date_to: data.date_to,
    });
    const payload = await withServerExtras(context.supabase, data);
    const { data: row, error } = await context.supabase
      .from("bookings")
      .insert({ ...payload, booking_number: "" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    try {
      const { notifyBookingEvent } = await import("./notifications.server");
      await notifyBookingEvent(String((row as { id: string }).id), "booking_confirmation");
    } catch (e) {
      console.error("[createBooking:notify]", e);
    }
    if ((row as { status?: string }).status === "confirmed") {
      try {
        const { generateInvoiceForBooking } = await import("./invoices.server");
        await generateInvoiceForBooking(String((row as { id: string }).id));
      } catch (e) {
        console.error("[createBooking:invoice]", e);
      }
    }
    return row;
  });

export const updateBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => bookingInput.and(z.object({ id: z.string().uuid() })).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { id, ...rest } = data;
    await assertNoOverlap(context.supabase, {
      property_id: rest.property_id,
      date_from: rest.date_from,
      date_to: rest.date_to,
      excludeId: id,
    });
    const { data: before } = await context.supabase
      .from("bookings")
      .select("status, date_from, date_to, total_amount")
      .eq("id", id)
      .maybeSingle();
    const payload = await withServerExtras(context.supabase, rest as BookingInput);
    const { data: row, error } = await context.supabase
      .from("bookings")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    try {
      const { notifyBookingEvent } = await import("./notifications.server");
      const prev = before as { status?: string; date_from?: string; date_to?: string; total_amount?: number } | null;
      const next = row as { status?: string; date_from?: string; date_to?: string; total_amount?: number };
      if (prev && prev.status !== "cancelled" && next.status === "cancelled") {
        // The cancellation email to the guest is always sent, regardless of the toggle.
        await notifyBookingEvent(id, "booking_cancellation", { force: true });
      } else if (
        prev &&
        (prev.date_from !== next.date_from ||
          prev.date_to !== next.date_to ||
          Number(prev.total_amount) !== Number(next.total_amount) ||
          prev.status !== next.status)
      ) {
        // If this specific change is the transition to "Paid" — the door code for the guest
        // turi pasiekti visada, nepriklausomai nuo „Rezervacijos pakeitimas“ jungiklio.
        // Kitais atvejais (datos/suma) gerbiamas administratoriaus nustatymas.
        const justConfirmed = prev.status !== "confirmed" && next.status === "confirmed";
        await notifyBookingEvent(id, "booking_change", justConfirmed ? { force: true } : undefined);
        if (justConfirmed) {
          try {
            const { generateInvoiceForBooking } = await import("./invoices.server");
            await generateInvoiceForBooking(id);
          } catch (e) {
            console.error("[updateBooking:invoice]", e);
          }
        }
      }
    } catch (e) {
      console.error("[updateBooking:notify]", e);
    }
    return row;
  });

export const deleteBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase.from("bookings").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Moves a booking in the calendar (different property and/or different dates).
// Only property_id / date_from / date_to are changed — other fields remain unchanged.
export const rescheduleBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        property_id: z.string().uuid(),
        date_from: z.string().min(1),
        date_to: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    if (data.date_to <= data.date_from) throw new Error("Departure date must be later than the arrival date");

    const { data: conflicts, error: cErr } = await context.supabase
      .from("bookings")
      .select("id, date_from, date_to, customer_name")
      .eq("property_id", data.property_id)
      .neq("status", "cancelled")
      .neq("id", data.id)
      .lt("date_from", data.date_to)
      .gt("date_to", data.date_from);
    if (cErr) throw new Error(cErr.message);
    if (conflicts && conflicts.length > 0) {
      const c = conflicts[0];
      throw new Error(`Laikotarpis kertasi su kita rezervacija (${c.customer_name || "—"} ${c.date_from} → ${c.date_to})`);
    }

    const { data: row, error } = await context.supabase
      .from("bookings")
      .update({ property_id: data.property_id, date_from: data.date_from, date_to: data.date_to })
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    try {
      const { notifyBookingEvent } = await import("./notifications.server");
      await notifyBookingEvent(data.id, "booking_change");
    } catch (e) {
      console.error("[rescheduleBooking:notify]", e);
    }
    return row;
  });

// Occupied dates for all active properties — for the new booking calendar.
export const listAllOccupiedRanges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ excludeId: z.string().uuid().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertCanView(context);
    const { data: props, error: propsError } = await context.supabase
      .from("properties")
      .select("id")
      .eq("is_active", true);
    if (propsError) throw new Error(propsError.message);
    const activeIds = (props ?? []).map((p) => String(p.id));
    let q = context.supabase
      .from("bookings")
      .select("id, property_id, date_from, date_to")
      .neq("status", "cancelled");
    if (data.excludeId) q = q.neq("id", data.excludeId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return {
      activeCount: activeIds.length,
      rows: (rows ?? [])
        .filter((r) => activeIds.includes(String(r.property_id)))
        .map((r) => ({
          property_id: String(r.property_id),
          date_from: String(r.date_from),
          date_to: String(r.date_to),
        })),
    };
  });
