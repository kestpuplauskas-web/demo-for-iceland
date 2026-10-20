import { createServerFn } from "@tanstack/react-start";
import { getRequestHost, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";

/** True when the request is on the SaaS app host (app.revoostay.com, previews, localhost) rather than a hotel's own address. */
export const isPlatformHost = createServerFn({ method: "GET" }).handler(async () => {
  let host = "";
  try { host = (getRequestHost() ?? "").toLowerCase().split(":")[0]; } catch { /* ignore */ }
  const { subdomainFromHost } = await import("@/lib/site-org.server");
  if (subdomainFromHost(host)) return false;
  const platform =
    !host || host === "localhost" || host === "revoostay.com" || host === "app.revoostay.com" ||
    host.endsWith(".revoostay.com") || host.endsWith(".lovable.app") || host.endsWith(".revoo.site") ||
    host === "revoo.site" || !host.includes(".");
  return platform;
});

/** Remembers which hotel's website the guest is browsing (for inner pages like /stays). */
export const rememberSite = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().regex(/^[a-z0-9-]{1,63}$/) }).parse(d))
  .handler(async ({ data }) => {
    setCookie("site_org", data.slug, { path: "/", maxAge: 2592000, sameSite: "lax", secure: true });
    return { ok: true };
  });
