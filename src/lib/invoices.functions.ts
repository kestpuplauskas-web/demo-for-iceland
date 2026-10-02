import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertCanView } from "./users.server";

export const getInvoiceForBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ bookingId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertCanView(context);

    const { data: row, error } = await context.supabase
      .from("invoices")
      .select("*")
      .eq("booking_id", data.bookingId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return row;

    const [{ data: s }, { data: b }] = await Promise.all([
      context.supabase
        .from("property_settings")
        .select("display_name, company_name, brand_logo_url, invoice_logo_url, invoice_issuer_name, phone, email")
        .eq("scope", "global")
        .maybeSingle(),
      context.supabase
        .from("bookings")
        .select("booking_number, date_from, date_to, guests, total_guests, properties(name)")
        .eq("id", data.bookingId)
        .maybeSingle(),
    ]);
    const st = (s ?? {}) as Record<string, string | null>;
    const bk = (b ?? null) as Record<string, any> | null;
    const r = row as Record<string, any>;
    const seller = (r.seller ?? {}) as Record<string, string>;
    const brandName = st.display_name || st.company_name || seller.name || "";
    return {
      ...r,
      issued_by: r.issued_by || st.invoice_issuer_name || brandName,
      seller: {
        ...seller,
        brandName,
        logoUrl: seller.logoUrl || st.invoice_logo_url || st.brand_logo_url || "",
        phone: seller.phone || st.phone || "",
        email: seller.email || st.email || "",
      },
      booking_number: bk?.booking_number ?? "",
      stay: bk
        ? {
            property: bk.properties?.name ?? "",
            checkIn: bk.date_from,
            checkOut: bk.date_to,
            guests: Number(bk.total_guests ?? bk.guests ?? 0),
          }
        : null,
    };
  });

export const ensureInvoiceForBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ bookingId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: rErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (rErr) throw new Error(rErr.message);
    if (!isAdmin) throw new Error("Forbidden");

    const { data: booking, error: bErr } = await context.supabase
      .from("bookings")
      .select("id, status")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (bErr) throw new Error(bErr.message);
    if (!booking) throw new Error("Booking not found.");
    if (booking.status !== "confirmed") {
      throw new Error("Invoices can only be generated for paid (confirmed) bookings.");
    }
    const { generateInvoiceForBooking } = await import("./invoices.server");
    await generateInvoiceForBooking(data.bookingId);
    const { data: row, error } = await context.supabase
      .from("invoices")
      .select("*")
      .eq("booking_id", data.bookingId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Failed to generate the invoice.");
    return row;
  });