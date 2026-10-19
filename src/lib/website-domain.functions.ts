import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DOMAIN_RE = /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

export const getWebsiteDomain = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: orgId } = await context.supabase.rpc("current_org_id");
    if (!orgId) return null;
    const { data } = await context.supabase
      .from("organizations")
      .select("subdomain, custom_domain")
      .eq("id", orgId as string)
      .maybeSingle();
    if (!data) return null;
    return { subdomain: data.subdomain as string, customDomain: (data.custom_domain as string | null) ?? "" };
  });

export const saveCustomDomain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        domain: z
          .string()
          .trim()
          .toLowerCase()
          .transform((v) => v.replace(/^https?:\/\//, "").replace(/\/.*$/, ""))
          .refine((v) => v === "" || DOMAIN_RE.test(v), "Enter a valid domain, e.g. stay.myhotel.com")
          .refine((v) => !v.endsWith("revoostay.com"), "Use your own domain, not revoostay.com"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Only administrators can change the domain.");
    const { data: orgId } = await context.supabase.rpc("current_org_id");
    if (!orgId) throw new Error("Hotel not found.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const value = data.domain || null;
    if (value) {
      const { data: taken } = await supabaseAdmin
        .from("organizations")
        .select("id")
        .eq("custom_domain", value)
        .neq("id", orgId as string)
        .maybeSingle();
      if (taken) throw new Error("This domain is already used by another hotel.");
    }
    const { error } = await supabaseAdmin
      .from("organizations")
      .update({ custom_domain: value })
      .eq("id", orgId as string);
    if (error) throw new Error("Could not save the domain. Please try again.");
    return { ok: true };
  });

/** Checks public DNS for a CNAME/A record of the domain. */
export const verifyCustomDomain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ domain: z.string().trim().toLowerCase().min(4).max(253) }).parse(d))
  .handler(async ({ data }) => {
    const q = async (type: string) => {
      const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(data.domain)}&type=${type}`, {
        headers: { accept: "application/dns-json" },
      });
      const j = (await r.json()) as { Answer?: { data: string }[] };
      return (j.Answer ?? []).map((a) => a.data.replace(/\.$/, ""));
    };
    try {
      const [cname, a] = await Promise.all([q("CNAME"), q("A")]);
      return { found: cname.length > 0 || a.length > 0, cname, a };
    } catch {
      return { found: false, cname: [], a: [] };
    }
  });
