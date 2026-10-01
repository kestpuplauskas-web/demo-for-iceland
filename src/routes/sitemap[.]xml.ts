import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

import { SITE_URL } from "@/data/nav";
import { categorySlug, distinctCategories } from "@/lib/property-category";
import { buildSlugIndex } from "@/lib/property-slug";
import { fetchProperties } from "@/lib/revoo-api.server";

const STATIC_PATHS = [
  "/",
  "/stays",
  "/about",
  "/about/house-rules",
  "/restaurant",
  "/banquet-hall",
  "/sauna",
  "/gift-vouchers",
  "/contact",
  "/terms",
  "/privacy-policy",
];

function urlEntry(path: string): string {
  return [`  <url>`, `    <loc>${SITE_URL}${path}</loc>`, `  </url>`].join("\n");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const paths = [...STATIC_PATHS];

        try {
          const properties = await fetchProperties("en");
          for (const code of distinctCategories(properties)) {
            paths.push(`/stays/type/${categorySlug(code)}`);
          }
          const { byId } = buildSlugIndex(properties);
          for (const slug of byId.values()) {
            paths.push(`/stays/${slug}`);
          }
        } catch {
          // The engine may be unreachable — still serve the static routes.
        }

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...paths.map(urlEntry),
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
