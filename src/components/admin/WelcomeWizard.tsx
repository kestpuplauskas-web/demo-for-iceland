import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Circle } from "lucide-react";
import { getSetupStatus } from "@/lib/setup.functions";

/** First-login welcome: 3 steps until the hotel has details, a property and photos. */
export function WelcomeWizard() {
  const fetchStatus = useServerFn(getSetupStatus);
  const { data } = useQuery({ queryKey: ["setup-status"], queryFn: () => fetchStatus() });
  if (!data) return null;
  const ok = (k: string) => data.find((i) => i.key === k)?.ok ?? false;
  const steps = [
    { label: "Hotel details", done: ok("name") && ok("address") && ok("contacts"), to: "/admin/settings" },
    { label: "First cabin or room", done: ok("properties"), to: "/admin/properties" },
    { label: "Logo and photos", done: ok("logo"), to: "/admin/settings" },
  ];
  if (steps.every((s) => s.done)) return null;
  return (
    <section className="mb-6 rounded-lg border bg-card p-5">
      <h2 className="text-lg font-semibold">Welcome to RevooStay</h2>
      <p className="mt-1 text-sm text-muted-foreground">Three short steps and your booking website is ready.</p>
      <ol className="mt-4 grid gap-3 sm:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.label}>
            <Link
              to={s.to}
              className="flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
            >
              {s.done ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
              <span>
                {i + 1}. {s.label}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
