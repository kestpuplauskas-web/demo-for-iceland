import { getRequestHost } from "@tanstack/react-start/server";
import { DEFAULT_ORG_ID } from "@/lib/org-scope";

const PLATFORM_DOMAIN = "revoostay.com";
const RESERVED = new Set(["app", "www", "api", "admin", "mail", "staff", "auth", "revoo", "revoostay", "support", "help", "billing"]);

/** Extracts a hotel subdomain from a host like "puffin.revoostay.com" (null otherwise). */
export function subdomainFromHost(host: string | null | undefined): string | null {
  if (!host) return null;
  const h = host.toLowerCase().split(":")[0];
  if (!h.endsWith(`.${PLATFORM_DOMAIN}`)) return null;
  const sub = h.slice(0, -(PLATFORM_DOMAIN.length + 1));
  if (!sub || sub.includes(".") || RESERVED.has(sub)) return null;
  return sub;
}

/** Which hotel the public website serves for the current request. Falls back to the default hotel. */
export async function resolveSiteOrgId(): Promise<string> {
  let host: string | null = null;
  try {
    host = getRequestHost() ?? null;
  } catch {
    host = null;
  }
  const sub = subdomainFromHost(host);
  if (!sub) return DEFAULT_ORG_ID;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("organizations")
    .select("id, status")
    .eq("subdomain", sub)
    .maybeSingle();
  if (!data || data.status === "blocked") return "00000000-0000-0000-0000-000000000000";
  return data.id as string;
}
