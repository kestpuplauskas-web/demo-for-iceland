import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { isDisposableDomain } from "./disposable-domains";

const RESERVED = new Set(["app", "www", "api", "admin", "mail", "staff", "auth", "revoo", "revoostay", "support", "help", "billing"]);

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(200),
  password: z.string().min(8, "Use at least 8 characters").max(72),
  hotelName: z.string().trim().min(2, "Enter your hotel name").max(120),
  subdomain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]([a-z0-9-]{1,30}[a-z0-9])$/, "3–32 characters: letters, numbers and hyphens"),
  verificationUrl: z
    .string()
    .trim()
    .url("Paste a full link, e.g. https://www.booking.com/hotel/…")
    .max(500),
  website: z.string().max(0).optional(), // honeypot
});

export const checkSubdomain = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ subdomain: z.string().trim().toLowerCase().max(40) }).parse(d))
  .handler(async ({ data }) => {
    if (RESERVED.has(data.subdomain)) return { available: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .eq("subdomain", data.subdomain);
    return { available: (count ?? 0) === 0 };
  });

export const registerHotel = createServerFn({ method: "POST" })
  .inputValidator((d) => registerSchema.parse(d))
  .handler(async ({ data }) => {
    if (data.website) return { ok: true }; // bot: silently accept
    const domain = data.email.split("@")[1] ?? "";
    if (isDisposableDomain(domain)) {
      throw new Error("Please use your business email — temporary email addresses are not accepted.");
    }
    const host = (() => { try { return new URL(data.verificationUrl).hostname.toLowerCase(); } catch { return ""; } })();
    if (!/(^|\.)(booking\.com|google\.[a-z.]+|goo\.gl|maps\.app\.goo\.gl|airbnb\.[a-z.]+|tripadvisor\.[a-z.]+)$/.test(host)) {
      throw new Error("The link must point to your property on Booking.com, Google Maps, Airbnb or Tripadvisor.");
    }
    if (RESERVED.has(data.subdomain)) throw new Error("This address is reserved. Please choose another.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .eq("subdomain", data.subdomain);
    if ((count ?? 0) > 0) throw new Error("This address is already taken. Please choose another.");

    const { appLink } = await import("@/lib/app-url.server");
    const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "signup",
      email: data.email,
      password: data.password,
      options: { redirectTo: appLink("/auth"), data: { full_name: data.fullName } },
    });
    if (linkErr || !link.user) {
      const msg = linkErr?.message ?? "";
      if (/already/i.test(msg)) throw new Error("An account with this email already exists. Please sign in instead.");
      throw new Error("We could not create your account. Please try again.");
    }
    const userId = link.user.id;

    const { data: org, error: orgErr } = await supabaseAdmin
      .from("organizations")
      .insert({
        name: data.hotelName,
        subdomain: data.subdomain,
        contact_email: data.email,
        verification_url: data.verificationUrl,
        plan: "trial",
        status: "active",
      } as never)
      .select("id")
      .single();
    if (orgErr || !org) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error("We could not create your hotel. Please try again.");
    }
    const orgId = (org as { id: string }).id;
    await supabaseAdmin.from("organization_members").insert({ organization_id: orgId, user_id: userId } as never);
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "admin" } as never);

    const actionLink = link.properties?.action_link;
    if (actionLink) {
      try {
        const { sendEmail } = await import("@/lib/notifications.server");
        await sendEmail({
          to: data.email,
          subject: "Confirm your RevooStay account",
          html: `
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#111;line-height:1.6">
              <p>Hi ${data.fullName.replace(/[<>&"]/g, "")},</p>
              <p>Welcome to RevooStay. Confirm your email to open the control panel for <strong>${data.hotelName.replace(/[<>&"]/g, "")}</strong>.</p>
              <p><a href="${actionLink}" style="display:inline-block;padding:10px 18px;background:#111;color:#fff;text-decoration:none;border-radius:6px">Confirm email</a></p>
              <p style="font-size:13px;color:#666">Your free 14-day trial starts today. If you did not sign up, ignore this email.</p>
            </div>`,
        });
      } catch (e) {
        console.error("[register] confirmation email failed", e);
      }
    }
    return { ok: true };
  });
