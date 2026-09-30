import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Public password recovery.
 * We generate the link via the Auth Admin API and send it via a verified Resend domain
 * (Supabase default auth emails are not used for this project).
 * Always returns { ok: true } so that we do not reveal whether the email is registered.
 */
export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        email: z.string().trim().toLowerCase().email(),
        redirectTo: z.string().url(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { appLink } = await import("@/lib/app-url.server");
      const link = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: data.email,
        options: { redirectTo: appLink("/reset-password", data.redirectTo) },
      });
      const actionLink = link.data?.properties?.action_link;
      if (link.error || !actionLink) {
        console.warn("[password-reset] nepavyko sugeneruoti nuorodos", link.error?.message);
        return { ok: true };
      }

      const { sendEmail } = await import("@/lib/notifications.server");
      await sendEmail({
        to: data.email,
        subject: "Password reset — Dharma Stay",
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#111;line-height:1.6">
            <p>Sveiki,</p>
            <p>We received a request to reset your account password.</p>
            <p><a href="${actionLink}" style="display:inline-block;padding:10px 18px;background:#111;color:#fff;text-decoration:none;border-radius:6px">Set new password</a></p>
            <p style="font-size:13px;color:#666">If the button doesn't work, copy this link:<br>${actionLink}</p>
            <p style="font-size:13px;color:#666">If you did not make this request — simply ignore this email.</p>
          </div>
        `,
      });
    } catch (e) {
      console.error("[password-reset]", e);
    }
    return { ok: true };
  });
