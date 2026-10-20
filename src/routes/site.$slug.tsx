import { createFileRoute, notFound } from "@tanstack/react-router";
import { homeRoute } from "@/pages/home";
import { rememberSite } from "@/lib/site-entry.functions";

const home = homeRoute("en") as unknown as {
  head: () => Record<string, unknown>;
  loader: (a: { context: unknown }) => Promise<unknown>;
  component: () => React.ReactNode;
};

/** A hotel's public website on the app domain: app.revoostay.com/site/<hotel>. */
export const Route = createFileRoute("/site/$slug")({
  beforeLoad: async ({ params }) => {
    const slug = params.slug.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9-]/g, "").slice(0, 63);
    if (!slug) throw notFound();
    await rememberSite({ data: { slug } });
  },
  head: home.head as never,
  loader: home.loader as never,
  component: home.component,
});
