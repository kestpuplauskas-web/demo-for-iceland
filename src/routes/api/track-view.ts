// Pirminis lankomumo švyturėlis. Slapukų nėra, IP ir naršyklės duomenys nesaugomi.
import { createFileRoute } from "@tanstack/react-router";

const ALLOWED_HOSTS = [
  "manahlid.is",
  "www.manahlid.is",
  "manahlid.revoo.site",
  "demo.revoo.site",
  "localhost",
  "127.0.0.1",
];

const BOT_PATTERN =
  /bot|crawl|spider|slurp|bing|yandex|baidu|duckduck|facebookexternalhit|embedly|quora|pinterest|semrush|ahrefs|petal|headless|lighthouse|preview|monitor|curl|wget|python-requests|node-fetch|go-http/i;

/** Priimame tik savo svetainės (arba Lovable peržiūros) užklausas. */
function originAllowed(request: Request): boolean {
  const raw = request.headers.get("origin") ?? request.headers.get("referer");
  if (!raw) return false;
  let host: string;
  try {
    host = new URL(raw).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (ALLOWED_HOSTS.includes(host)) return true;
  return host.endsWith(".lovable.app") || host.endsWith(".lovableproject.com");
}

function deviceFrom(ua: string): "mobile" | "tablet" | "desktop" {
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android|blackberry|windows phone/i.test(ua)) return "mobile";
  return "desktop";
}

function sourceFrom(host: string | null): string {
  if (!host) return "direct";
  const h = host.toLowerCase();
  if (h.includes("google")) return "google";
  if (h.includes("bing") || h.includes("duckduckgo") || h.includes("yahoo")) return "search";
  if (h.includes("facebook") || h.includes("fb.")) return "facebook";
  if (h.includes("instagram")) return "instagram";
  if (h.includes("linkedin")) return "linkedin";
  if (h.includes("manahlid")) return "direct";
  return "other";
}

async function sha256(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const noContent = () => new Response(null, { status: 204 });

export const Route = createFileRoute("/api/track-view")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          if (!originAllowed(request)) return noContent();

          const userAgent = request.headers.get("user-agent") ?? "";
          if (!userAgent) return noContent();
          // Robotus vis tiek įrašome, tik pažymime — statistikoje jie neskaičiuojami.
          const isBot = BOT_PATTERN.test(userAgent);

          const raw = await request.text().catch(() => "");
          let body: { path?: unknown; referrer?: unknown } | null = null;
          try {
            body = raw ? JSON.parse(raw) : null;
          } catch {
            body = null;
          }
          if (!body) return noContent();

          const path = typeof body.path === "string" ? body.path.slice(0, 300) : "";
          if (!path.startsWith("/") || path.startsWith("/admin") || path.startsWith("/staff")) {
            return noContent();
          }

          let referrerHost: string | null = null;
          if (typeof body.referrer === "string" && body.referrer) {
            try {
              referrerHost = new URL(body.referrer).hostname.toLowerCase().slice(0, 200);
            } catch {
              referrerHost = null;
            }
          }
          if (referrerHost && referrerHost.includes("manahlid")) referrerHost = null;

          const salt = process.env["ANALYTICS_SALT"] ?? "manahlid-analytics";
          const ip =
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
            request.headers.get("cf-connecting-ip") ??
            "unknown";
          const utcDay = new Date().toISOString().slice(0, 10);
          // Vienkryptis, kasdien besikeičiantis žymuo — IP ar naršyklė nesaugomi.
          const visitorHash = await sha256(`${salt}|${utcDay}|${ip}|${userAgent}`);

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const insert = supabaseAdmin.from("page_views") as unknown as {
            insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
          };
          const { error } = await insert.insert({
            path,
            referrer_host: referrerHost,
            source: sourceFrom(referrerHost),
            device: deviceFrom(userAgent),
            country: request.headers.get("cf-ipcountry") ?? null,
            visitor_hash: visitorHash,
            day: utcDay,
            user_agent: userAgent.slice(0, 500),
            is_bot: isBot,
          });
          if (error) console.error("track-view insert failed:", error.message);
        } catch (err) {
          console.error("track-view error:", err instanceof Error ? err.message : String(err));
        }

        // Visada tylu — sekimas niekada neturi paveikti viešos svetainės.
        return noContent();
      },
    },
  },
});
