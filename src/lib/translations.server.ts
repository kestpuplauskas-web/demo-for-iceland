// Server-only: applying translations in the public API.
// The `content_translations` table has no anon read access, so we read via
// a privileged client — just like /v1/legal does. The caller has already
// been authenticated with an API key by that point.

import { resolveDefaultLanguage } from "@/lib/languages";
import { EXTRA_SERVICE_FIELD_PREFIX, extraServiceField } from "@/lib/translations";

/** Property default language from settings (original language). */
export async function loadDefaultLanguage(): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("property_settings")
    .select("default_language")
    .eq("scope", "global")
    .maybeSingle();
  return resolveDefaultLanguage((data as { default_language?: string } | null)?.default_language);
}

/** { entityId: { field: value } } vienai kalbai. */
export type EntityTranslations = Record<string, Record<string, string>>;

export async function loadTranslations(
  entityType: string,
  entityIds: string[],
  lang: string,
): Promise<EntityTranslations> {
  if (entityIds.length === 0) return {};
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("content_translations")
    .select("entity_id, field, value")
    .eq("entity_type", entityType)
    .eq("lang", lang)
    .in("entity_id", entityIds);
  if (error) {
    console.error("[loadTranslations]", error.message);
    return {}; // failed to fetch translations — return originals instead of an error
  }
  const out: EntityTranslations = {};
  for (const r of (data ?? []) as Array<{ entity_id: string; field: string; value: string }>) {
    out[r.entity_id] ??= {};
    out[r.entity_id]![r.field] = r.value;
  }
  return out;
}

/** Applies translations to a single property. Missing fields remain in the original language. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyPropertyTranslations<T extends Record<string, any>>(
  prop: T,
  tr: Record<string, string> | undefined,
): T {
  if (!tr) return prop;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: Record<string, any> = { ...prop };
  if (tr["name"]?.trim()) out["name"] = tr["name"];
  if (tr["description"]?.trim()) out["description"] = tr["description"];

  if (Array.isArray(prop["extra_services"])) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    out["extra_services"] = prop["extra_services"].map((s: any) => {
      const t = tr[extraServiceField(String(s?.name ?? ""))];
      return t?.trim() ? { ...s, name: t } : s;
    });
  }
  return out as T;
}

/**
 * Reverse dictionary: translated name -> original name.
 * Required for price calculation, since services are recognized by their original name.
 */
export function buildExtraNameResolver(tr: Record<string, string> | undefined) {
  const byTranslated = new Map<string, string>();
  for (const [field, value] of Object.entries(tr ?? {})) {
    if (!field.startsWith(EXTRA_SERVICE_FIELD_PREFIX)) continue;
    const original = field.slice(EXTRA_SERVICE_FIELD_PREFIX.length);
    if (value.trim()) byTranslated.set(value.trim().toLowerCase(), original);
  }
  /** Accepts both the original and translated name; returns the original. */
  return (incoming: string): string =>
    byTranslated.get(incoming.trim().toLowerCase()) ?? incoming;
}