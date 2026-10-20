import { createServerFn } from "@tanstack/react-start";
import { getCookie, getRequestHeader, getRequestHost, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";

/** True when the request is on the SaaS app host (app.revoostay.com, previews, localhost) rather than a hotel's own address. */
export const isPlatformHost = createServerFn({ method: "GET" }).handler(async (): Promise<{ platform: boolean; site: string | null }> => {
  let host = "";
  try { host = (getRequestHost() ?? "").toLowerCase().split(":")[0]; } catch { /* ignore */ }
  const { subdomainFromHost } = await import("@/lib/site-org.server");
  if (subdomainFromHost(host)) return { platform: false, site: null };
  const platform =
    !host || host === "localhost" || host === "revoostay.com" || host === "app.revoostay.com" ||
    host.endsWith(".revoostay.com") || host.endsWith(".lovable.app") || host.endsWith(".revoo.site") ||
    host === "revoo.site" || !host.includes(".");
  if (!platform) return { platform: false, site: null };
  // A guest clicking "Home" on a hotel website goes back to that hotel, not to sign-in.
  let site: string | null = null;
  try {
    const ref = getRequestHeader("referer") ?? "";
    const path = ref ? new URL(ref).pathname : "";
    const c = getCookie("site_org");
    if (path && !/^\/(auth|admin|register|reset-password|staff)/.test(path) && c && /^[a-z0-9-]{1,63}$/.test(c)) site = c;
  } catch { /* ignore */ }
  return { platform: true, site };
});

/** Remembers which hotel's website the guest is browsing (for inner pages like /stays). */
export const rememberSite = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().regex(/^[a-z0-9-]{1,63}$/) }).parse(d))
  .handler(async ({ data }) => {
    setCookie("site_org", data.slug, { path: "/", maxAge: 2592000, sameSite: "lax", secure: true });
    return { ok: true };
  });
