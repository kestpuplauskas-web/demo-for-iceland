import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PLAN_PRICE: Record<string, number> = { starter: 29, growth: 59, pro: 119 };
const COMMISSION = 0.02;

async function isPlatformAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("is_platform_admin", { _user_id: context.userId });
  return data === true;
}

export const getPlatformAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await isPlatformAdmin(context);
    let managingOrgId: string | null = null;
    if (admin) {
      const { data } = await context.supabase
        .from("platform_admin_context")
        .select("organization_id")
        .eq("user_id", context.userId)
        .maybeSingle();
      managingOrgId = (data?.organization_id as string | null) ?? null;
    }
    const { data: orgId } = await context.supabase.rpc("current_org_id");
    let org: { id: string; name: string; plan: string; trialEndsAt: string | null } | null = null;
    if (orgId) {
      const { data } = await context.supabase
        .from("organizations")
        .select("id, name, plan, trial_ends_at")
        .eq("id", orgId as string)
        .maybeSingle();
      if (data) org = { id: data.id, name: data.name, plan: data.plan, trialEndsAt: data.trial_ends_at };
    }
    return { isPlatformAdmin: admin, managingOrgId, org };
  });

/** Platform admin: pick a hotel to manage (null = back to platform overview). */
export const setManagedOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid().nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isPlatformAdmin(context))) throw new Error("Not authorised");
    const { error } = await context.supabase
      .from("platform_admin_context")
      .upsert({ user_id: context.userId, organization_id: data.id, updated_at: new Date().toISOString() } as never, {
        onConflict: "user_id",
      });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listOrganizations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isPlatformAdmin(context))) throw new Error("Not authorised");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: orgs, error } = await supabaseAdmin
      .from("organizations")
      .select("id,name,subdomain,custom_domain,plan,status,trial_ends_at,contact_email,verification_url,created_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const monthStart = new Date();
    monthStart.setDate(1);
    const ms = monthStart.toISOString().slice(0, 10);
    const [{ data: props }, { data: members }, { data: bookings }] = await Promise.all([
      supabaseAdmin.from("properties").select("organization_id"),
      supabaseAdmin.from("organization_members").select("organization_id"),
      supabaseAdmin
        .from("bookings")
        .select("organization_id,total_amount,source,status,created_at")
        .gte("created_at", ms)
        .neq("status", "cancelled"),
    ]);
    const count = (rows: any[] | null, id: string) => (rows ?? []).filter((r) => r.organization_id === id).length;
    const rows = (orgs ?? []).map((o: any) => {
      const b = (bookings ?? []).filter((x: any) => x.organization_id === o.id);
      const gmv = b.reduce((s: number, x: any) => s + Number(x.total_amount ?? 0), 0);
      const direct = b
        .filter((x: any) => !x.source || x.source === "website")
        .reduce((s: number, x: any) => s + Number(x.total_amount ?? 0), 0);
      return {
        ...o,
        properties: count(props, o.id),
        members: count(members, o.id),
        bookingsMonth: b.length,
        gmv,
        commission: Math.round(direct * COMMISSION * 100) / 100,
      };
    });
    const now = Date.now();
    const isTrial = (o: any) => o.plan === "trial" || (o.trial_ends_at && new Date(o.trial_ends_at).getTime() > now);
    const kpis = {
      total: rows.length,
      active: rows.filter((o) => o.status === "active" && !isTrial(o)).length,
      trial: rows.filter((o) => o.status === "active" && isTrial(o)).length,
      blocked: rows.filter((o) => o.status === "blocked").length,
      mrr: rows
        .filter((o) => o.status === "active" && !isTrial(o))
        .reduce((s, o) => s + (PLAN_PRICE[o.plan] ?? 0), 0),
      gmv: rows.reduce((s, o) => s + o.gmv, 0),
      commission: Math.round(rows.reduce((s, o) => s + o.commission, 0) * 100) / 100,
    };
    return { rows, kpis };
  });

export const setOrganizationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), status: z.enum(["active", "blocked"]) }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isPlatformAdmin(context))) throw new Error("Not authorised");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("organizations").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
