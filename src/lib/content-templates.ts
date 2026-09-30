import { z } from "zod";

export const CONTENT_VARIABLES = [
  { token: "{{guest_name}}", labelKey: "content.variables.guest_name" },
  { token: "{{guest_name_vocative}}", labelKey: "content.variables.guest_name_vocative" },
  { token: "{{property_name}}", labelKey: "content.variables.property_name" },
  { token: "{{location}}", labelKey: "content.variables.location" },
  { token: "{{room_name}}", labelKey: "content.variables.room_name" },
  { token: "{{booking_number}}", labelKey: "content.variables.booking_number" },
  { token: "{{date_from}}", labelKey: "content.variables.date_from" },
  { token: "{{date_to}}", labelKey: "content.variables.date_to" },
  { token: "{{check_in}}", labelKey: "content.variables.check_in" },
  { token: "{{check_out}}", labelKey: "content.variables.check_out" },
  { token: "{{check_in_until}}", labelKey: "content.variables.check_in_until" },
  { token: "{{quiet_hours_from}}", labelKey: "content.variables.quiet_hours_from" },
  { token: "{{quiet_hours_to}}", labelKey: "content.variables.quiet_hours_to" },
  { token: "{{door_code}}", labelKey: "content.variables.door_code" },
  { token: "{{wifi_name}}", labelKey: "content.variables.wifi_name" },
  { token: "{{wifi_password}}", labelKey: "content.variables.wifi_password" },
  { token: "{{total_amount}}", labelKey: "content.variables.total_amount" },
  { token: "{{currency}}", labelKey: "content.variables.currency" },
  { token: "{{phone}}", labelKey: "content.variables.phone" },
  { token: "{{email}}", labelKey: "content.variables.email" },
  { token: "{{review_link}}", labelKey: "content.variables.review_link" },
] as const;

export const PREVIEW_SAMPLE: Record<string, string> = {
  "{{guest_name}}": "John Smith",
  "{{guest_name_vocative}}": "John Smith",
  "{{property_name}}": "Dharma Stay",
  "{{location}}": "Vilniaus g. 10, Druskininkai — 2nd floor, door No. 3",
  "{{room_name}}": "Bedroom 1",
  "{{booking_number}}": "R-26001",
  "{{date_from}}": "2026-08-10",
  "{{date_to}}": "2026-08-14",
  "{{check_in}}": "15:00",
  "{{check_out}}": "11:00",
  "{{check_in_until}}": "22:00",
  "{{quiet_hours_from}}": "22:00",
  "{{quiet_hours_to}}": "07:00",
  "{{door_code}}": "1234#",
  "{{wifi_name}}": "DharmaStay_WiFi",
  "{{wifi_password}}": "svecias2026",
  "{{total_amount}}": "480,00",
  "{{currency}}": "EUR",
  "{{phone}}": "+370 600 00000",
  "{{email}}": "info@revoo.lt",
  "{{review_link}}": "https://g.page/r/review",
};

export function renderPreview(text: string) {
  return Object.entries(PREVIEW_SAMPLE).reduce(
    (acc, [token, value]) => acc.split(token).join(value),
    text ?? "",
  );
}

export type ContentCategory = "email" | "whatsapp" | "guest_info";

export type ContentFieldDef = {
  name: string;
  labelKey: string;
  /** Label for server-side/fallback use (without i18n context). */
  label: string;
  type: "text" | "textarea" | "url";
  defaultValue?: string;
  required?: boolean;
};

export type ContentTemplateDef = {
  category: ContentCategory;
  name: string;
  titleKey: string;
  descriptionKey: string;
  /** Original English heading — used server-side (email log). */
  title: string;
  hasSubject: boolean;
  hasRichText: boolean;
  canTestSend?: boolean;
  canTestWhatsapp?: boolean;
  fields?: ContentFieldDef[];
  defaultSubject?: string;
  defaultContent?: string;
  openLinkField?: string;
};

export const ETURISTAS_DEFAULT_URL =
  "https://eturistas.ntis.lt/srv-edit/yGcAqPoxUjtPUWOfNdvFwKYYcQrnDfRBnjZlcFokltyAnhvhJe";

export const CONTENT_TEMPLATES: ContentTemplateDef[] = [
  {
    category: "email",
    name: "booking_confirmation",
    title: "Booking confirmation",
    titleKey: "content.templates.booking_confirmation.title",
    descriptionKey: "content.templates.booking_confirmation.description",
    hasSubject: true,
    hasRichText: true,
    canTestSend: true,
    defaultSubject: "Your booking {{booking_number}} is confirmed",
    defaultContent:
      "<p>Hi {{guest_name}},</p><p>Your booking <strong>{{booking_number}}</strong> at {{property_name}} is confirmed.</p><p>Check-in: {{date_from}} from {{check_in}}<br>Check-out: {{date_to}} by {{check_out}}<br>Amount: {{total_amount}} {{currency}}</p><p>See you soon!</p>",
  },
  {
    category: "email",
    name: "booking_cancellation",
    title: "Booking cancellation",
    titleKey: "content.templates.booking_cancellation.title",
    descriptionKey: "content.templates.booking_cancellation.description",
    hasSubject: true,
    hasRichText: true,
    canTestSend: true,
    defaultSubject: "Booking {{booking_number}} cancelled",
    defaultContent:
      "<p>Hi {{guest_name}},</p><p>We\u2019re letting you know that your booking {{booking_number}} at {{property_name}} ({{date_from}}–{{date_to}}) has been cancelled.</p><p>If you have any questions, email {{email}} or call {{phone}}.</p>",
  },
  {
    category: "email",
    name: "booking_change",
    title: "Booking change",
    titleKey: "content.templates.booking_change.title",
    descriptionKey: "content.templates.booking_change.description",
    hasSubject: true,
    hasRichText: true,
    canTestSend: true,
    defaultSubject: "Changes to booking {{booking_number}}",
    defaultContent:
      "<p>Hi {{guest_name}},</p><p>Your booking {{booking_number}} has been updated.</p><p>New dates: {{date_from}} – {{date_to}}<br>Amount: {{total_amount}} {{currency}}</p>",
  },
  {
    category: "email",
    name: "checkin_reminder",
    title: "Pre-arrival reminder",
    titleKey: "content.templates.checkin_reminder.title",
    descriptionKey: "content.templates.checkin_reminder.description",
    hasSubject: true,
    hasRichText: true,
    canTestSend: true,
    defaultSubject: "We look forward to your arrival on {{date_from}} — {{property_name}}",
    defaultContent:
      "<p>Hi {{guest_name}},</p><p>This is a reminder about your upcoming stay at {{property_name}}.</p><p>Check-in: {{date_from}} from {{check_in}}<br>Door code: {{door_code}}<br>WiFi: {{wifi_name}} / {{wifi_password}}</p>",
  },
  {
    category: "email",
    name: "review_request",
    title: "Review request",
    titleKey: "content.templates.review_request.title",
    descriptionKey: "content.templates.review_request.description",
    hasSubject: true,
    hasRichText: true,
    canTestSend: true,
    defaultSubject: "Thank you for staying at {{property_name}}",
    defaultContent:
      "<p>Hi {{guest_name}},</p><p>Thank you for choosing {{property_name}}. We\u2019d really appreciate your review.</p>",
  },
  {
    category: "whatsapp",
    name: "door_code",
    title: "Door code",
    titleKey: "content.templates.door_code.title",
    descriptionKey: "content.templates.door_code.description",
    hasSubject: false,
    hasRichText: false,
    canTestWhatsapp: true,
    defaultContent:
      "Hi {{guest_name}}! Your door code at {{property_name}}: {{door_code}}. Arrival {{date_from}} from {{check_in}}. WiFi: {{wifi_name}} / {{wifi_password}}",
  },
  {
    category: "guest_info",
    name: "wifi",
    title: "WiFi",
    titleKey: "content.templates.wifi.title",
    descriptionKey: "content.templates.wifi.description",
    hasSubject: false,
    hasRichText: false,
    fields: [
      { name: "wifiName", label: "WiFi name", labelKey: "content.fields.wifiName", type: "text", required: true },
      { name: "wifiPassword", label: "WiFi password", labelKey: "content.fields.wifiPassword", type: "text", required: true },
    ],
  },
  {
    category: "guest_info",
    name: "restaurant",
    title: "Restaurant information",
    titleKey: "content.templates.restaurant.title",
    descriptionKey: "content.templates.restaurant.description",
    hasSubject: false,
    hasRichText: true,
  },
  {
    category: "guest_info",
    name: "eturistas",
    title: "E. turistas",
    titleKey: "content.templates.eturistas.title",
    descriptionKey: "content.templates.eturistas.description",
    hasSubject: false,
    hasRichText: false,
    openLinkField: "url",
    fields: [
      { name: "title", label: "Title", labelKey: "content.fields.title", type: "text", defaultValue: "E. turistas", required: true },
      {
        name: "description",
        label: "Description",
        labelKey: "content.fields.description",
        type: "textarea",
        defaultValue:
          "Before arrival, please complete the guest registration form in the E. turistas system.",
      },
      { name: "url", label: "Link", labelKey: "content.fields.url", type: "url", defaultValue: ETURISTAS_DEFAULT_URL, required: true },
    ],
  },
];

export const CONTENT_SECTIONS: {
  id: ContentCategory;
  icon: string;
  titleKey: string;
  descriptionKey: string;
}[] = [
  {
    id: "email",
    icon: "✉️",
    titleKey: "content.sections.email.title",
    descriptionKey: "content.sections.email.description",
  },
  {
    id: "whatsapp",
    icon: "💬",
    titleKey: "content.sections.whatsapp.title",
    descriptionKey: "content.sections.whatsapp.description",
  },
  {
    id: "guest_info",
    icon: "🛎️",
    titleKey: "content.sections.guest_info.title",
    descriptionKey: "content.sections.guest_info.description",
  },
];

export function templateKey(category: string, name: string) {
  return `${category}:${name}`;
}

/** Normalizes an LT/international phone number to E.164 without "+" (wa.me format). */
export function normalizeWhatsappPhone(raw: string): string {
  const digits = (raw ?? "").replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  let n = digits.startsWith("+") ? digits.slice(1) : digits;
  if (n.startsWith("00")) n = n.slice(2);
  else if (n.startsWith("8") && n.length === 9) n = `370${n.slice(1)}`;
  return n;
}

export function buildWhatsappLink(phone: string, message: string) {
  return `https://wa.me/${normalizeWhatsappPhone(phone)}?text=${encodeURIComponent(message)}`;
}

export const contentTemplateSchema = z.object({
  category: z.enum(["email", "whatsapp", "guest_info"]),
  templateName: z.string().min(1).max(80),
  subject: z.string().max(300).default(""),
  content: z.string().max(20000).default(""),
  fields: z.record(z.string().max(2000)).default({}),
  isEnabled: z.boolean().default(true),
});

export type ContentTemplateRecord = {
  /** DB row ID; null when the template has not been saved yet. */
  id: string | null;
  category: ContentCategory;
  templateName: string;
  subject: string;
  content: string;
  fields: Record<string, string>;
  isEnabled: boolean;
  updatedAt: string | null;
};

export function defaultsFor(def: ContentTemplateDef): ContentTemplateRecord {
  const fields: Record<string, string> = {};
  for (const f of def.fields ?? []) fields[f.name] = f.defaultValue ?? "";
  return {
    id: null,
    category: def.category,
    templateName: def.name,
    subject: def.defaultSubject ?? "",
    content: def.defaultContent ?? "",
    fields,
    isEnabled: true,
    updatedAt: null,
  };
}

export function buildFormSchema(
  def: ContentTemplateDef,
  t: (key: string, opts?: Record<string, unknown>) => string = (k) => k,
) {
  const shape: Record<string, z.ZodTypeAny> = { isEnabled: z.boolean() };

  shape["subject"] = def.hasSubject
    ? z
        .string()
        .trim()
        .min(1, t("content.validation.subjectRequired"))
        .max(300, t("content.validation.subjectTooLong"))
    : z.string().max(300);

  const needsContent = def.hasRichText || def.category === "whatsapp";
  shape["content"] = needsContent
    ? z
        .string()
        .trim()
        .min(1, t("content.validation.contentRequired"))
        .max(20000, t("content.validation.contentTooLong"))
    : z.string().max(20000);

  const fieldShape: Record<string, z.ZodTypeAny> = {};
  for (const f of def.fields ?? []) {
    if (f.type === "url") {
      const url = z.string().trim().url(t("content.validation.invalidUrl"));
      fieldShape[f.name] = f.required ? url : z.union([z.literal(""), url]);
    } else {
      let s = z.string().trim().max(2000);
      if (f.required)
        s = s.min(1, t("content.validation.fieldRequired", { field: t(f.labelKey) }));
      fieldShape[f.name] = s;
    }
  }
  shape["fields"] = z.object(fieldShape);

  return z.object(shape);
}