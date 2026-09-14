import { SITE_URL } from "@/data/nav";
import { localizePath, ogLocale, type Locale } from "@/lib/locale";

/**
 * Builds per-page head metadata. Every leaf route gets a unique title,
 * description, OG pair, absolute og:url, a self-referencing canonical and
 * hreflang alternates for the other locale.
 */
export function pageHead({
  path,
  title,
  description,
  type = "website",
  locale = "en",
}: {
  /** Canonical public path, e.g. "/apartamentai". */
  path: string;
  title: string;
  description: string;
  type?: string;
  locale?: Locale;
}) {
  const url = `${SITE_URL}${localizePath(path, "en")}`;

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: type },
      { property: "og:url", content: url },
      { property: "og:locale", content: ogLocale[locale] },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: url },
    ],
  };
}

export function breadcrumbLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}
