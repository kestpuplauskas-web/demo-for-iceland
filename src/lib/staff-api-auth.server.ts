/**
 * Personalo (kambarinių) API sluoksnio autentifikacija: Supabase JWT + rolės patikra.
 * Naudojamas tik /api/staff/v1/* endpoint'uose.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { apiError, apiJson, corsHeaders } from "./api-auth.server";

function allowedOrigins(): string[] {
  return (process.env.STAFF_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export type StaffCtx = {
  userId: string;
  role: "admin" | "housekeeper";
  /** Hotel the user is working in; all reads/writes are limited to it. */
  orgId: string | null;
  propertyIds: string[];
  headers: Record<string, string>;
};

async function verifyStaffJwt(token: string): Promise<{ userId: string } | null> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  const supabase = createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  const sub = data?.claims?.sub;
  if (error || !sub) return null;
  return { userId: sub };
}

/** Bendras autentifikacijos + autorizacijos sluoksnis /api/staff/v1/* endpoint'ams. */
export async function withStaffAuth(
  request: Request,
  handler: (ctx: StaffCtx) => Promise<Response>,
): Promise<Response> {
  const origin = request.headers.get("origin");
  const sameOrigin = (() => {
    try {
      return origin ? new URL(request.url).origin === origin : false;
    } catch {
      return false;
    }
  })();
  const headers = corsHeaders(origin, sameOrigin && origin ? [origin] : allowedOrigins());
  if (origin && !headers["Access-Control-Allow-Origin"]) {
    return apiError("forbidden_origin", "Origin not allowed", 403, headers);
  }

  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return apiError("unauthorized", "Missing token", 401, headers);

  const verified = await verifyStaffJwt(token);
  if (!verified) return apiError("unauthorized", "Invalid token", 401, headers);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
    _user_id: verified.userId,
    _role: "admin",
  });
  const { data: isHousekeeper } = await supabaseAdmin.rpc("has_role", {
    _user_id: verified.userId,
    _role: "housekeeper",
  });
  if (!isAdmin && !isHousekeeper) {
    return apiError("forbidden", "No staff role", 403, headers);
  }

  // Resolve the user's current hotel with their own token (current_org_id uses auth.uid()).
  const userDb = createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: orgIdRaw } = await userDb.rpc("current_org_id");
  const orgId = (orgIdRaw as string | null) ?? null;
  const { orgPropertyIds } = await import("./housekeeping.server");
  const propertyIds = await orgPropertyIds(supabaseAdmin, orgId);

  // Any /rooms/:id/* call must target a room of this hotel.
  const m = new URL(request.url).pathname.match(/\/api\/staff\/v1\/rooms\/([^/]+)/);
  if (m && !propertyIds.includes(decodeURIComponent(m[1]!))) {
    return apiError("not_found", "Room not found", 404, headers);
  }

  try {
    return await handler({
      userId: verified.userId,
      orgId,
      propertyIds,
      role: isAdmin ? "admin" : "housekeeper",
      headers,
    });
  } catch (e) {
    console.error("[staff-api]", e instanceof Error ? e.message : e);
    return apiError("server_error", "Request failed", 500, headers);
  }
}

export { apiJson, apiError };
