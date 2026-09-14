/** The public website is English-only. Legacy locale helpers stay for route compatibility. */
export const LOCALES = ["en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "manahlid_locale";
export const LOCALE_PREFIX = "/en";

export const htmlLang: Record<Locale, string> = { en: "en" };
export const ogLocale: Record<Locale, string> = { en: "en_US" };
export const localeName: Record<Locale, string> = { en: "English" };

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en";
}

/** The public website always resolves to English. */
export function localeFromPath(pathname: string): Locale {
  return "en";
}

/** Strips the retired locale prefix, returning the canonical public path. */
export function stripLocale(pathname: string): string {
  if (pathname === LOCALE_PREFIX) return "/";
  if (pathname.startsWith(`${LOCALE_PREFIX}/`)) return pathname.slice(LOCALE_PREFIX.length) || "/";
  return pathname || "/";
}

/** Returns the canonical unprefixed public path. */
export function localizePath(path: string, locale: Locale): string {
  const base = stripLocale(path.startsWith("/") ? path : `/${path}`);
  return base;
}

/**
 * Maps a router route id (e.g. "/apartamentai/$propertyId") to its counterpart
 * in the target locale. The LT and EN route trees mirror each other, so this is
 * the same prefix rule as localizePath, applied to route patterns.
 */
export function localizeRouteId(routeId: string, locale: Locale): string {
  const id = routeId.replace(/\/$/, "") || "/";
  return localizePath(id, locale);
}
