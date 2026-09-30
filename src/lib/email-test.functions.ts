import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveFromAddress } from "@/lib/email-from";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error("Could not verify permissions.");
  if (!data) throw new Error("You don't have permission to do this.");
}

export const getEmailDiagnostics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin({ supabase: context.supabase, userId: context.userId });
    const from = resolveFromAddress();
    return {
      hasResendKey: Boolean(process.env["RESEND_API_KEY"]),
      hasLovableKey: Boolean(process.env["LOVABLE_API_KEY"]),
      from,
      usesFallbackFrom: !process.env["RESEND_FROM_EMAIL"],
      adminEmail: (context.claims as Record<string, unknown> | undefined)?.["email"] as string | undefined ?? null,
    };
  });

export const sendResendTestEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ to: z.string().trim().email("Invalid email address.") }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin({ supabase: context.supabase, userId: context.userId });

    const apiKey = process.env["RESEND_API_KEY"];
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const from = resolveFromAddress();

    if (!apiKey || !lovableKey) {
      return {
        ok: false as const,
        from,
        status: 0,
        detail: `Missing keys: ${[!apiKey && "RESEND_API_KEY", !lovableKey && "LOVABLE_API_KEY"].filter(Boolean).join(", ")}`,
      };
    }

    const stamp = new Date().toISOString();
    const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [data.to],
        subject: "[TEST] Email delivery check",
        html: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6">
          <h2 style="margin:0 0 12px">Email delivery works ✅</h2>
          <p>This email was sent from the admin system's test tool.</p>
          <p><strong>Sender:</strong> ${from}<br/><strong>Time (UTC):</strong> ${stamp}</p>
        </div>`,
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error("[sendResendTestEmail]", res.status, text);
      return { ok: false as const, from, status: res.status, detail: text.slice(0, 500) };
    }
    let id: string | null = null;
    try {
      id = (JSON.parse(text) as { id?: string }).id ?? null;
    } catch {
      /* ignore */
    }
    return { ok: true as const, from, status: res.status, detail: id ? `ID: ${id}` : text.slice(0, 200) };
  });
