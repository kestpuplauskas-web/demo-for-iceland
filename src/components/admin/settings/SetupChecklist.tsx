import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, ChevronDown, Circle } from "lucide-react";
import { getSetupStatus } from "@/lib/setup.functions";

/** Compact launch checklist shown above the settings sections. */
export function SetupChecklist() {
  const fetchStatus = useServerFn(getSetupStatus);
  const { data } = useQuery({ queryKey: ["setup-status"], queryFn: () => fetchStatus() });
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
        <ul className="space-y-2 border-t px-4 py-3">
          {data.map((i) => (
            <li key={i.key} className="flex items-start gap-2 text-sm">
              {i.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span>
                <span className={i.ok ? "" : "font-medium"}>{i.label}</span>
                <span className="block text-xs text-muted-foreground">{i.hint}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
