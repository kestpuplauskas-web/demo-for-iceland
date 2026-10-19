import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import heroAurora from "@/assets/hero-aurora.jpg.asset.json";
import { registerHotel, checkSubdomain, registerSchema } from "@/lib/register.functions";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Start your free trial | RevooStay" },
      { name: "description", content: "Create your hotel control panel and booking website on RevooStay. 14 days free." },
      { property: "og:title", content: "Start your free trial | RevooStay" },
      { property: "og:description", content: "Create your hotel control panel and booking website on RevooStay. 14 days free." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RegisterPage,
});

type Field = "fullName" | "email" | "password" | "hotelName" | "subdomain" | "verificationUrl";

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32);
}

function RegisterPage() {
  const register = useServerFn(registerHotel);
  const check = useServerFn(checkSubdomain);
  const [v, setV] = useState<Record<Field, string>>({ fullName: "", email: "", password: "", hotelName: "", subdomain: "", verificationUrl: "" });
  const [hp, setHp] = useState("");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [subTouched, setSubTouched] = useState(false);
  const [subFree, setSubFree] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const validate = (f: Field, val = v[f]) => {
    const r = registerSchema.shape[f].safeParse(val);
    setErrors((e) => ({ ...e, [f]: r.success ? undefined : r.error.issues[0]?.message }));
    return r.success;
  };
  const set = (f: Field, val: string) => setV((s) => ({ ...s, [f]: val }));

  const onSubBlur = async () => {
    if (!validate("subdomain")) return setSubFree(null);
    const r = await check({ data: { subdomain: v.subdomain } });
    setSubFree(r.available);
    if (!r.available) setErrors((e) => ({ ...e, subdomain: "This address is already taken" }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = (Object.keys(v) as Field[]).map((f) => validate(f)).every(Boolean);
    if (!ok || subFree === false) return;
    setBusy(true);
    try {
      await register({ data: { ...v, website: hp } });
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const input = (f: Field, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, hint?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={f} className="label-caps text-[0.7rem] text-stone">{label}</Label>
      <Input
        id={f}
        value={v[f]}
        onChange={(e) => set(f, e.target.value)}
        onBlur={() => validate(f)}
        aria-invalid={!!errors[f]}
        className={`bg-transparent text-paper caret-paper ${errors[f] ? "border-destructive" : ""}`}
        {...props}
      />
      {errors[f] ? <p className="text-xs text-destructive">{errors[f]}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );

  return (
    <div className="site-theme min-h-screen bg-ink lg:grid lg:grid-cols-2">
      <div className="flex min-h-screen items-center justify-center px-6 py-12 lg:min-h-0">
        <div className="w-full max-w-sm space-y-8">
          {done ? (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-aurora" />
              <h1 className="text-4xl font-light">Check your email</h1>
              <p className="text-sm text-muted-foreground">
                We sent a confirmation link to <span className="text-paper">{v.email}</span>. Open it to activate your control panel.
              </p>
              <Link to="/auth" className="text-sm underline underline-offset-4 hover:text-paper">Go to sign in</Link>
            </div>
          ) : (
            <>
              <div>
                <p className="label-caps mb-3 text-[0.7rem] text-aurora">14 days free · no card needed</p>
                <h1 className="text-5xl font-light">Create your hotel</h1>
                <p className="mt-2 text-sm text-muted-foreground">Your control panel and booking website, ready in a minute.</p>
              </div>
              <form onSubmit={submit} className="space-y-4" noValidate>
                {input("fullName", "Your name", { autoComplete: "name" })}
                {input("email", "Business email", { type: "email", autoComplete: "email" })}
                {input("password", "Password", { type: "password", autoComplete: "new-password" }, "At least 8 characters")}
                <div className="space-y-1.5">
                  <Label htmlFor="hotelName" className="label-caps text-[0.7rem] text-stone">Hotel name</Label>
                  <Input
                    id="hotelName"
                    value={v.hotelName}
                    autoComplete="organization"
                    onChange={(e) => {
                      set("hotelName", e.target.value);
                      if (!subTouched) set("subdomain", slugify(e.target.value));
                    }}
                    onBlur={() => validate("hotelName")}
                    className={`bg-transparent text-paper caret-paper ${errors.hotelName ? "border-destructive" : ""}`}
                  />
                  {errors.hotelName && <p className="text-xs text-destructive">{errors.hotelName}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="subdomain" className="label-caps text-[0.7rem] text-stone">Website address</Label>
                  <div className={`flex items-center rounded-md border ${errors.subdomain ? "border-destructive" : "border-input"}`}>
                    <input
                      id="subdomain"
                      value={v.subdomain}
                      onChange={(e) => { setSubTouched(true); setSubFree(null); set("subdomain", e.target.value.toLowerCase()); }}
                      onBlur={onSubBlur}
                      className="h-10 min-w-0 flex-1 bg-transparent px-3 text-sm text-paper caret-paper outline-none"
                    />
                    <span className="pr-3 text-sm text-muted-foreground">.revoostay.com</span>
                  </div>
                  {errors.subdomain ? (
                    <p className="text-xs text-destructive">{errors.subdomain}</p>
                  ) : subFree ? (
                    <p className="text-xs text-aurora">Available</p>
                  ) : null}
                </div>
                {input("verificationUrl", "Booking.com or Google Maps link", { type: "url", inputMode: "url" }, "Helps us confirm your property is real")}
                <input type="text" name="website" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} className="hidden" aria-hidden />
                <Button type="submit" className="h-12 w-full bg-aurora text-[0.72rem] uppercase tracking-[0.15em] text-ink hover:bg-aurora-deep" size="lg" disabled={busy}>
                  {busy ? "Creating…" : "Start free trial"}
                </Button>
              </form>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/auth" className="underline underline-offset-4 hover:text-paper">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
      <div className="relative hidden items-center justify-center overflow-hidden lg:flex">
        <img src={heroAurora.url} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-ink/30" />
        <div className="relative px-12 text-center">
          <p className="font-display text-4xl font-light tracking-[0.2em] text-paper">RevooStay</p>
        </div>
      </div>
    </div>
  );
}
