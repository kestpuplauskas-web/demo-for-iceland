import { cn } from "@/lib/utils";

/** Text-only Mánahlíð mark; public pages intentionally have no graphic logo. */
export function Logo({ className, title = "Mánahlíð" }: { className?: string; title?: string }) {
  return (
    <span
      role="img"
      aria-label={title}
      className={cn("font-display uppercase tracking-[0.16em]", className)}
    >
      Mánahlíð
    </span>
  );
}
