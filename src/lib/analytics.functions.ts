import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AnalyticsRange = 7 | 30 | 90;

export interface AnalyticsSummary {
  totals: { views: number; visitors: number };
  previous: { views: number; visitors: number };
  daily: { day: string; views: number; visitors: number }[];
  top_pages: { path: string; views: number }[];
  sources: { source: string; views: number }[];
  devices: { device: string; views: number }[];
  countries: { country: string; views: number; visitors: number }[];
  leads: number;
  bots: number;
}

const EMPTY: AnalyticsSummary = {
  totals: { views: 0, visitors: 0 },
  previous: { views: 0, visitors: 0 },
  daily: [],
  top_pages: [],
  sources: [],
  devices: [],
  countries: [],
  leads: 0,
  bots: 0,
};

const rangeSchema = z.object({
  range: z.union([z.literal(7), z.literal(30), z.literal(90)]),
});

function isoDay(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - offsetDays);
  return d.toISOString().slice(0, 10);
}

/** Lankomumo suvestinė. Duomenų bazėje prieiga tik administratoriams. */
export const getAnalyticsSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => rangeSchema.parse(input))
  .handler(async ({ data, context }): Promise<AnalyticsSummary> => {
    const rpc = context.supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;

    const { data: result, error } = await rpc("analytics_summary", {
      _from: isoDay(data.range - 1),
      _to: isoDay(0),
    });

    if (error) {
      console.error("analytics_summary failed", error.message);
      throw new Error("Failed to load analytics data.");
    }

    return { ...EMPTY, ...((result as Partial<AnalyticsSummary> | null) ?? {}) };
  });

export function percentChange(current: number, previous: number): number | null {
  if (!previous) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}
