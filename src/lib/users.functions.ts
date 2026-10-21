import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin, assertCanManageUsers, assertCanView, isDeveloperRole } from "./users.server";

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        email: z.string().trim().email(),
        role: z.enum(["admin", "housekeeper", "developer", "viewer"]),
        fullName: z.string().trim().max(120).optional(),
        redirectTo: z.string().url().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertCanManageUsers(context);
    if (data.role === "developer" && !(await isDeveloperRole(context))) {
      throw new Error("Only a developer can invite another developer.");
    }
    const { data: orgId } = await context.supabase.rpc("current_org_id");
    if (!orgId) throw new Error("No hotel selected.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { appLink } = await import("@/lib/app-url.server");
    const opts = {
      redirectTo: appLink("/reset-password", data.redirectTo),
      ...(data.fullName ? { data: { full_name: data.fullName } } : {}),
    };
    let link = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email: data.email,
      options: opts,
    });
    // If the user already exists — we send a password creation link.
    if (link.error && /registered|exists/i.test(link.error.message)) {
      link = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: data.email,
        options: opts,
      });
    }
    if (link.error) throw new Error(link.error.message);

    const newUserId = link.data.user?.id;
    const actionLink = link.data.properties?.action_link;
    if (!newUserId) throw new Error("Nepavyko sukurti vartotojo.");

    if (data.fullName) {
      await supabaseAdmin.auth.admin.updateUserById(newUserId, {
        user_metadata: { full_name: data.fullName },
      });
    }

    // Role is stored per hotel membership only.
    const { error: memberErr } = await supabaseAdmin
      .from("organization_members")
      .upsert({ organization_id: orgId, user_id: newUserId, role: data.role } as never, {
        onConflict: "organization_id,user_id",
      });
    if (memberErr) throw new Error(memberErr.message);

    if (actionLink) {
      const { sendEmail } = await import("@/lib/notifications.server");
      const { data: settingsRow } = await supabaseAdmin
        .from("property_settings")
        .select("display_name")
        .eq("scope", "global")
        .eq("organization_id", orgId as string)
        .maybeSingle();
      let hotelName = ((settingsRow as { display_name?: string | null } | null)?.display_name ?? "").trim();
      if (!hotelName) {
        const { data: org } = await supabaseAdmin
          .from("organizations" as never)
          .select("name")
          .eq("id", orgId as string)
          .maybeSingle();
        hotelName = ((org as { name?: string | null } | null)?.name ?? "").trim() || "your hotel";
      }
      const esc = (s: string) =>
        s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
      const safeHotel = esc(hotelName);
      const roleLabel =
        data.role === "admin"
          ? "an administrator"
          : data.role === "developer"
            ? "a developer"
            : data.role === "viewer"
              ? "a viewer"
              : "a housekeeper";
      await sendEmail({
        to: data.email,
        subject: `You're invited to join ${hotelName}`,
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#111;line-height:1.6">
            <p>Hello,</p>
            <p>You have been invited to join <strong>${safeHotel}</strong> as ${roleLabel}.</p>
            <p>Click the button below to create your password:</p>
            <p><a href="${actionLink}" style="display:inline-block;padding:10px 18px;background:#111;color:#fff;text-decoration:none;border-radius:6px">Create password</a></p>
            <p style="font-size:13px;color:#666">If the button doesn't work, copy this link:<br>${actionLink}</p>
            <p style="font-size:13px;color:#666">${safeHotel}</p>
          </div>
        `,
      });
    }

    return { ok: true, userId: newUserId, emailed: Boolean(actionLink) };
  });

export const listUsersWithRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertCanView(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: orgId } = await context.supabase.rpc("current_org_id");
    const { data, error } = await supabaseAdmin
      .from("organization_members")
      .select("user_id, role, created_at")
      .eq("organization_id", (orgId as string | null) ?? "00000000-0000-0000-0000-000000000000")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Array<{ user_id: string; role: string; created_at: string }>;
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    const info = new Map(
      (authUsers?.users ?? []).map((u) => [
        u.id,
        {
          email: u.email ?? "",
          fullName: ((u.user_metadata as { full_name?: string } | null)?.full_name ?? "").trim(),
          lastSignInAt: u.last_sign_in_at ?? null,
        },
      ]),
    );

    return rows.map((r) => ({
      userId: r.user_id,
      role: r.role,
      createdAt: r.created_at,
      email: info.get(r.user_id)?.email ?? "",
      fullName: info.get(r.user_id)?.fullName ?? "",
      lastSignInAt: info.get(r.user_id)?.lastSignInAt ?? null,
    }));
  });

export const updateUserName = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ userId: z.string().uuid(), fullName: z.string().trim().max(120) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      user_metadata: { full_name: data.fullName },
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertCanManageUsers(context);
    if (data.userId === context.userId) throw new Error("You cannot delete your own account.");
    const { data: orgId } = await context.supabase.rpc("current_org_id");
    if (!orgId) throw new Error("No hotel selected.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Remove the person from this hotel only; other hotels keep their access.
    const { error } = await supabaseAdmin
      .from("organization_members")
      .delete()
      .eq("organization_id", orgId)
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });