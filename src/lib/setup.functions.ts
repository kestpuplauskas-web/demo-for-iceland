import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertCanView, assertDeveloper } from "./users.server";

export type SetupItem = { key: string; label: string; ok: boolean; hint: string };

/** Launch checklist for a new hotel: basic settings + external services. */
export const getSetupStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SetupItem[]> => {
    await assertCanView(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: s } = await supabaseAdmin
      .from("property_settings")
      .select("display_name, address, city, country, timezone, currency, phone, email, brand_logo_url, company_name")
      .eq("scope", "global")
      .maybeSingle();
    const { data: props } = await supabaseAdmin
      .from("properties")
      .select("id, ical_import_url")
      .eq("is_active", true);
    const has = (v: unknown) => typeof v === "string" && v.trim().length > 0;
    const row = (s ?? {}) as Record<string, unknown>;
    const icalCount = (props ?? []).filter((p) => has(p.ical_import_url)).length;
    return [
      { key: "name", label: "Hotel name", ok: has(row.display_name), hint: "General → Display name" },
      { key: "address", label: "Address and city", ok: has(row.address) && has(row.city), hint: "General → Address" },
      { key: "region", label: "Country, time zone and currency", ok: has(row.country) && has(row.timezone) && has(row.currency), hint: "General → Country / Time zone / Currency" },
      { key: "contacts", label: "Public phone and email", ok: has(row.phone) && has(row.email), hint: "Shown on the website header, footer and contact page" },
      { key: "logo", label: "Logo", ok: has(row.brand_logo_url), hint: "Branding → Upload PNG or SVG" },
      { key: "company", label: "Company details for invoices", ok: has(row.company_name), hint: "Invoices → Company name" },
      { key: "properties", label: "At least one active property", ok: (props ?? []).length > 0, hint: "Manage → Properties" },
      { key: "email", label: "Email sending service", ok: Boolean(process.env["RESEND_API_KEY"]), hint: "Needs an email service key — ask your developer" },
      { key: "ical", label: "Channel calendars (Booking.com, Airbnb)", ok: icalCount > 0, hint: `${icalCount} of ${(props ?? []).length} properties linked — optional` },
    ];
  });

/** Removes all bookings and their documents. A backup snapshot is saved first. */
export const clearDemoBookings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ confirm: z.literal("DELETE") }).parse(d))
  .handler(async ({ context }) => {
    await assertDeveloper(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: snapErr } = await supabaseAdmin.rpc("create_system_snapshot", {
      _name: `Before demo cleanup ${new Date().toISOString().slice(0, 10)}`,
      _created_by: context.userId,
    });
    if (snapErr) throw new Error(`Backup failed, nothing deleted: ${snapErr.message}`);
    const all = "00000000-0000-0000-0000-000000000000";
    for (const table of ["booking_notifications", "invoices", "payment_transactions", "signed_contracts"] as const) {
      const { error } = await supabaseAdmin.from(table).delete().neq("id", all);
      if (error) throw new Error(error.message);
    }
    const { count, error } = await supabaseAdmin.from("bookings").delete({ count: "exact" }).neq("id", all);
    if (error) throw new Error(error.message);
    return { deleted: count ?? 0 };
  });
