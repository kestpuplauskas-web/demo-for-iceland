import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { availabilityInputSchema } from "@/lib/availability-schemas";
import {
  bookingInputSchema,
  contactMessageSchema,
  legalInputSchema,
  quoteInputSchema,
} from "@/lib/revoo-schemas";

/**
 * Thin server-function wrappers around the Core (Revoo) API.
 *
 * Module scope holds only imports and `createServerFn` declarations — the
 * server-only client is dynamically imported inside each handler so the API
 * key path is never reachable from the client bundle.
 */

const languageInput = z.object({ language: z.enum(["lt", "en"]).optional() });
const idInput = z.object({ id: z.string().uuid(), language: z.enum(["lt", "en"]).optional() });

export const listProperties = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => languageInput.parse(data ?? {}))
  .handler(async ({ data }) => {
    const { fetchProperties } = await import("@/lib/revoo-api.server");
    return fetchProperties(data.language);
  });

export const getProperty = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => idInput.parse(data))
  .handler(async ({ data }) => {
    const { fetchProperty } = await import("@/lib/revoo-api.server");
    return fetchProperty(data.id, data.language);
  });

export const getQuote = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => quoteInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { fetchQuote } = await import("@/lib/revoo-api.server");
    return fetchQuote(data);
  });

export const createBookingFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => bookingInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { createBooking } = await import("@/lib/revoo-api.server");
    return createBooking(data);
  });

export const getPaymentDetails = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchPaymentDetails } = await import("@/lib/revoo-api.server");
  return fetchPaymentDetails();
});

export const getAvailability = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => availabilityInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { computeAvailability } = await import("@/lib/availability.server");
    return computeAvailability(data);
  });

export const getLegal = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => legalInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { fetchLegal } = await import("@/lib/revoo-api.server");
    return fetchLegal(data.kind, data.language);
  });

export const sendContactMessageFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => contactMessageSchema.parse(data))
  .handler(async ({ data }) => {
    const { sendContactMessage } = await import("@/lib/revoo-api.server");
    return sendContactMessage(data);
  });