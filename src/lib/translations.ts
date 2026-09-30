export type TranslatableEntity = "property" | "content_template" | "property_settings";

export type TranslatableFieldDef = {
  /** Key value in the DB column `field`. */
  field: string;
  /** Translation key for the label; if absent — `label` is used. */
  labelKey?: string;
  label: string;
  multiline?: boolean;
  /** Laukas saugo HTML — rodyti/redaguoti su teksto redaktoriumi. */
  html?: boolean;
};

/** Objekto laukai, kuriuos galima versti. */
export const PROPERTY_TRANSLATABLE_FIELDS: TranslatableFieldDef[] = [
  { field: "name", label: "Pavadinimas", labelKey: "translations.fields.name" },
  { field: "description", label: "Description", labelKey: "translations.fields.description", multiline: true },
  { field: "location_note", label: "Vietos pastabos", labelKey: "translations.fields.location_note", multiline: true },
  { field: "rooms_notes", label: "Room notes", labelKey: "translations.fields.rooms_notes", multiline: true },
];

/**
 * Extra services are stored in a jsonb array and are recognized in price calculations
 * BY NAME, so the Lithuanian name effectively serves as their identifier.
 */
export const EXTRA_SERVICE_FIELD_PREFIX = "extra_service.";

export function extraServiceField(ltName: string): string {
  return `${EXTRA_SERVICE_FIELD_PREFIX}${ltName.trim()}`;
}

/** Can this field be translated at all? */
export function isAllowedField(entityType: TranslatableEntity, field: string): boolean {
  if (entityType === "content_template") {
    return field === "subject" || field === "content";
  }
  if (entityType !== "property") return true; // other types will be added in later stages
  if (PROPERTY_TRANSLATABLE_FIELDS.some((f) => f.field === field)) return true;
  return (
    field.startsWith(EXTRA_SERVICE_FIELD_PREFIX) &&
    field.length > EXTRA_SERVICE_FIELD_PREFIX.length
  );
}

/** Translation set: { [field]: { [lang]: value } } */
export type TranslationMap = Record<string, Record<string, string>>;
