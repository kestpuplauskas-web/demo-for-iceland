import { MountainSnow } from "lucide-react";

import { cn } from "@/lib/utils";

export function ImagePlaceholder({
  className,
  label = "Mánahlíð",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "relative isolate flex min-h-40 w-full items-center justify-center overflow-hidden bg-surface-2 text-paper",
        className,
      )}
    >
      <div className="absolute inset-4 border border-paper/10 sm:inset-6" aria-hidden />
      <div
        className="absolute inset-0 opacity-35 [background-image:linear-gradient(135deg,transparent_0%,transparent_49.8%,var(--color-border)_50%,transparent_50.2%,transparent_100%)]"
        aria-hidden
      />
      <div className="relative flex flex-col items-center gap-4">
        <MountainSnow className="h-10 w-10 text-aurora/70" strokeWidth={1} aria-hidden />
        <span className="font-display text-xl font-normal uppercase tracking-[0.18em] text-paper/70">
          Mánahlíð
        </span>
      </div>
    </div>
  );
}