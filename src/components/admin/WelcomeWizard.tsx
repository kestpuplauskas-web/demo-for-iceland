import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { ArrowRight, BedDouble, Building2, Check, ExternalLink, ImageIcon, Globe } from "lucide-react";
import { getSetupStatus } from "@/lib/setup.functions";
import { getWebsiteDomain } from "@/lib/website-domain.functions";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export function useSetupStatus() {
  const fetchStatus = useServerFn(getSetupStatus);
  // Always re-check on open: rooms/logo are saved on other pages that don't invalidate this cache.
  return useQuery({
    queryKey: ["setup-status"],
    queryFn: () => fetchStatus(),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

/** First-login launchpad: guides a new hotel to a live booking website. */
export function WelcomeWizard() {
  const { data } = useSetupStatus();
  const fetchDomain = useServerFn(getWebsiteDomain);
  const { data: domain } = useQuery({ queryKey: ["website-domain"], queryFn: () => fetchDomain() });
  if (!data) return null;
  const ok = (k: string) => data.find((i) => i.key === k)?.ok ?? false;
  const steps = [
    {
      icon: Building2,
      title: "Add your hotel details",
      text: "Name, address, phone, email and currency. Guests see these on your website and invoices.",
      cta: "Open settings",
      done: ok("name") && ok("address") && ok("contacts") && ok("region"),
      to: "/admin/settings",
    },
    {
      icon: BedDouble,
      title: "Create your first cabin or room",
      text: "Give it a name, a nightly price and photos. You can add more any time.",
      cta: "Add a room",
      done: ok("properties"),
      to: "/admin/properties",
    },
    {
      icon: ImageIcon,
      title: "Upload your logo",
      text: "Your logo appears in the website header, emails and invoices.",
      cta: "Upload logo",
      done: ok("logo"),
      to: "/admin/settings",
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;
  const nextIdx = steps.findIndex((s) => !s.done);
  const siteUrl = domain?.subdomain ? `/site/${domain.subdomain}` : "/";

  return (
    <section className="mb-8 overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="border-b bg-muted/40 px-6 py-6 sm:px-8">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Getting started</p>
        <h2 className="mt-1 text-2xl font-semibold">Welcome to RevooStay</h2>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Three short steps and your booking website is ready for guests. It takes about 5 minutes.
        </p>
        <div className="mt-5 flex items-center gap-4">
          <Progress value={(doneCount / steps.length) * 100} className="h-2 max-w-md" />
          <span className="text-sm font-medium tabular-nums">
            {doneCount} of {steps.length} done
          </span>
        </div>
      </div>

      <ol className="divide-y">
        {steps.map((s, i) => {
          const active = i === nextIdx;
          const Icon = s.icon;
          return (
            <li
              key={s.title}
              className={`flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:px-8 ${active ? "bg-primary/5" : ""}`}
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${
                  s.done ? "border-primary bg-primary text-primary-foreground" : active ? "border-primary text-primary" : "text-muted-foreground"
                }`}
              >
                {s.done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">Step {i + 1}</p>
                <h3 className={`font-semibold ${s.done ? "text-muted-foreground line-through" : ""}`}>{s.title}</h3>
                {!s.done && <p className="mt-0.5 text-sm text-muted-foreground">{s.text}</p>}
              </div>
              {s.done ? (
                <span className="text-sm font-medium text-primary">Done</span>
              ) : (
                <Button asChild variant={active ? "default" : "outline"} className="min-h-11">
                  <Link to={s.to as "/admin/settings" | "/admin/properties"}>
                    {s.cta} <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </li>
          );
        })}
      </ol>

      <div className="flex flex-col gap-3 border-t bg-muted/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-center gap-2 text-sm">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Your website:</span>
          <span className="font-medium">app.revoostay.com{siteUrl}</span>
        </div>
        <Button asChild variant="ghost" size="sm" className="min-h-11">
          <a href={siteUrl} target="_blank" rel="noopener noreferrer">
            Preview website <ExternalLink className="ml-1 h-4 w-4" />
          </a>
        </Button>
      </div>
    </section>
  );
}
