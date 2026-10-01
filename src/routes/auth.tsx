import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyRole } from "@/lib/properties.functions";
import { requestPasswordReset } from "@/lib/auth-recovery.functions";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPublicBranding } from "@/lib/property-settings.functions";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { PLATFORM_NAME } from "@/lib/brand";
import { useTranslation } from "react-i18next";
import heroAurora from "@/assets/hero-aurora.jpg.asset.json";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: `Sign in | ${PLATFORM_NAME}` },
      { name: "description", content: `Sign in to the ${PLATFORM_NAME} administration panel.` },
      { property: "og:title", content: `Sign in | ${PLATFORM_NAME}` },
      { property: "og:description", content: `Sign in to the ${PLATFORM_NAME} administration panel.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { t } = useTranslation(undefined, { lng: "en" });
  const navigate = useNavigate();
  const fetchRole = useServerFn(getMyRole);
  const sendReset = useServerFn(requestPasswordReset);
  const fetchBranding = useServerFn(getPublicBranding);
  const { data: branding } = useQuery({
    queryKey: ["public-branding"],
    queryFn: () => fetchBranding(),
    staleTime: 5 * 60 * 1000,
  });
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    const goToDestination = async () => {
      try {
        const role = await fetchRole();
        if (role.isAdmin) navigate({ to: "/admin", replace: true });
        else if (role.roles.includes("housekeeper")) navigate({ to: "/staff", replace: true });
        else navigate({ to: "/admin", replace: true });
      } catch {
        navigate({ to: "/admin", replace: true });
      }
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") return;
      if (session) void goToDestination();
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void goToDestination();
    });
    return () => subscription.unsubscribe();
  }, [navigate, fetchRole]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(t("auth.signedIn"));
      } else {
        await sendReset({
          data: { email, redirectTo: `${window.location.origin}/reset-password` },
        });
        toast.success(t("auth.resetSent"));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.error"));
    } finally {
      setBusy(false);
    }
  };

  const logoSrc = branding?.logoLightUrl || branding?.logoUrl || "";
  const logoEl = (cls: string) =>
    logoSrc && !logoFailed ? (
      <img src={logoSrc} onError={() => setLogoFailed(true)} alt={branding?.displayName || PLATFORM_NAME} className={cls} />
    ) : (
      <span className="font-display text-3xl font-light tracking-[0.2em] text-paper">
        {branding?.displayName || PLATFORM_NAME}
      </span>
    );

  return (
    <div className="site-theme min-h-screen bg-ink lg:grid lg:grid-cols-2">
      {/* Kairė pusė — prisijungimas */}
      <div className="flex min-h-screen items-center justify-center px-6 py-12 lg:min-h-0">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden">{logoEl("h-12 w-auto object-contain")}</div>
          <div>
            <p className="label-caps mb-3 text-[0.7rem] text-aurora">Staff &amp; admin access</p>
            <h1 className="text-5xl font-light">
              {mode === "login" ? t("auth.loginTitle") : t("auth.forgotTitle")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === "forgot" ? t("auth.forgotSubtitle") : t("auth.loginSubtitle")}
            </p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="label-caps text-[0.7rem] text-stone">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-transparent text-paper caret-paper"
              />
            </div>
            {mode !== "forgot" && (
              <div className="space-y-1.5">
                <Label htmlFor="pw" className="label-caps text-[0.7rem] text-stone">{t("auth.password")}</Label>
                <Input
                  id="pw"
                  type="password"
                  autoComplete="current-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-transparent text-paper caret-paper"
                />
              </div>
            )}
            <Button type="submit" className="h-12 w-full bg-aurora text-[0.72rem] uppercase tracking-[0.15em] text-ink hover:bg-aurora-deep" size="lg" disabled={busy}>
              {busy ? t("auth.busy") : mode === "login" ? t("auth.submitLogin") : t("auth.submitReset")}
            </Button>
          </form>
          <div className="space-y-2 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <button type="button" className="underline underline-offset-4 hover:text-paper" onClick={() => setMode("forgot")}>
                {t("auth.forgotLink")}
              </button>
            ) : (
              <button type="button" className="underline underline-offset-4 hover:text-paper" onClick={() => setMode("login")}>
                {t("auth.backToLogin")}
              </button>
            )}
            <div>
              <Link to="/" className="text-xs hover:text-paper">
                {t("auth.home")}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Dešinė pusė — nuotrauka ir logotipas */}
      <div className="relative hidden items-center justify-center overflow-hidden lg:flex">
        <img src={heroAurora.url} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-ink/30" />
        <div className="relative flex flex-col items-center gap-6 px-12 text-center">
          {logoEl("max-h-40 w-auto max-w-[22rem] object-contain")}
        </div>
      </div>
    </div>
  );
}
