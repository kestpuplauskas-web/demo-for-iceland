import { getContent } from "@/content";
import type { Locale } from "@/lib/locale";

/** Canonical public paths. The customer-facing site is English-only. */
export type RoutePath = string;
export type NavLink = { label: string; to: RoutePath };
export type NavEntry = NavLink | { label: string; items: NavLink[] };

const FALLBACK_SITE_URL = "https://manahlid.revoo.site";

/** Canonical site origin; override with VITE_SITE_URL if the domain changes. */
export const SITE_URL = (
  import.meta.env?.['VITE_SITE_URL'] || FALLBACK_SITE_URL
).replace(/\/$/, "");

export function mainNav(locale: Locale): NavEntry[] {
  return [
    { label: "Stay", to: "/apartamentai" },
    { label: "At the house", to: "/#at-the-house" },
    { label: "The place", to: "/#the-place" },
    { label: "Practical", to: "/#practical" },
  ];
}

export function footerNav(locale: Locale): NavLink[] {
  const { nav } = getContent(locale).common;
  return [
    { label: "Rooms & cabins", to: "/apartamentai" },
    { label: "At the house", to: "/#at-the-house" },
    { label: "The place", to: "/#the-place" },
    { label: "Practical information", to: "/#practical" },
  ];
}
