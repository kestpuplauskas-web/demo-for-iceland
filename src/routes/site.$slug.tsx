import { createFileRoute } from "@tanstack/react-router";

/** Opens a hotel's public website on the main domain: remembers the hotel and shows its homepage. */
export const Route = createFileRoute("/site/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const slug = params.slug.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 63);
        return new Response(null, {
          status: 302,
          headers: {
            Location: "/",
            "Set-Cookie": `site_org=${slug}; Path=/; Max-Age=2592000; SameSite=Lax; Secure`,
          },
        });
      },
    },
  },
});
