import { createFileRoute, redirect } from "@tanstack/react-router";

import { homeRoute } from "@/pages/home";
import { isPlatformHost } from "@/lib/site-entry.functions";

const home = homeRoute("en");

export const Route = createFileRoute("/")({
  ...(home as object),
  beforeLoad: async () => {
    // The SaaS app address only shows sign-in; hotel websites live at /site/<hotel> or on their own domain.
    const r = await isPlatformHost();
    if (r.site) throw redirect({ to: "/site/$slug", params: { slug: r.site }, replace: true });
    if (r.platform) throw redirect({ to: "/auth", replace: true });
  },
});
