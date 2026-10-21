import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, ChevronDown, ChevronRight, Circle } from "lucide-react";
import { getSetupStatus } from "@/lib/setup.functions";

/** Where each checklist item leads when clicked. */
const ITEM_TARGETS: Record<string, string> = {
  name: "general",
  address: "general",
  region: "general",
  contacts: "general",
  logo: "branding",
  company: "invoicing",
  properties: "properties",
  email: "integrations",
  ical: "integrations",
};

/** Compact launch checklist shown above the settings sections. */
export function SetupChecklist({ onNavigate }: { onNavigate?: (target: string) => void }) {
  const fetchStatus = useServerFn(getSetupStatus);
  const { data } = useQuery({
    queryKey: ["setup-status"],
    queryFn: () => fetchStatus(),
    staleTime: 0,
    refetchOnMount: "always",
  });
  const done = data?.filter((i) => i.ok).length ?? 0;
  const total = data?.length ?? 0;
  const [open, setOpen] = useState(false);
  if (!data) return null;
  const complete = done === total;
  return (
    <div className="mb-4 rounded-lg border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="text-sm font-medium">
          Setup checklist{" "}
          <span className="text-muted-foreground">
            · {done} of {total} done{complete ? " — ready" : ""}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <div className="mx-4 mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
      </div>
      {open ? (
        <ul className="space-y-1 border-t px-2 py-2">
          {data.map((i) => {
            const target = ITEM_TARGETS[i.key];
            const clickable = !i.ok && Boolean(target && onNavigate);
            const inner = (
              <>
                {i.ok ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="flex-1">
                  <span className={i.ok ? "" : "font-medium"}>{i.label}</span>
                  <span className="block text-xs text-muted-foreground">{i.hint}</span>
                </span>
                {clickable ? (
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                ) : null}
              </>
            );
            return (
              <li key={i.key}>
                {clickable ? (
                  <button
                    type="button"
                    onClick={() => onNavigate?.(target!)}
                    className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
                  >
                    {inner}
                  </button>
                ) : (
                  <div className="flex items-start gap-2 px-2 py-1.5 text-sm">{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
