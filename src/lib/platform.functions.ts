import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function isPlatformAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("is_platform_admin", { _user_id: context.userId });
  return data === true;
}

export const getPlatformAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: orgId } = await context.supabase.rpc("current_org_id");
    let org: { name: string; plan: string; trialEndsAt: string | null } | null = null;
    if (orgId) {
      const { data } = await context.supabase
        .from("organizations")
        .select("name, plan, trial_ends_at")
        .eq("id", orgId as string)
        .maybeSingle();
      if (data) org = { name: data.name, plan: data.plan, trialEndsAt: data.trial_ends_at };
    }
    return { isPlatformAdmin: await isPlatformAdmin(context), org };
  });

export const listOrganizations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isPlatformAdmin(context))) throw new Error("Not authorised");
    const { data: orgs, error } = await context.supabase
      .from("organizations")
      .select("id,name,subdomain,plan,status,trial_ends_at,contact_email,verification_url,created_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: props }, { data: members }] = await Promise.all([
      supabaseAdmin.from("properties").select("organization_id"),
      supabaseAdmin.from("organization_members").select("organization_id"),
    ]);
    const count = (rows: any[] | null, id: string) => (rows ?? []).filter((r) => r.organization_id === id).length;
    return (orgs ?? []).map((o: any) => ({ ...o, properties: count(props, o.id), members: count(members, o.id) }));
  });

export const setOrganizationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), status: z.enum(["active", "blocked"]) }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isPlatformAdmin(context))) throw new Error("Not authorised");
    const { error } = await context.supabase.from("organizations").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
