import { Enso } from "@/components/site/Enso";
import { useContent } from "@/content";
import { AVAILABILITY_SECTION_ID, scrollToId } from "@/lib/scroll-to";

export function BookingBand() {
  const { common, home } = useContent();
  return (
    <section className="border-y border-border bg-surface px-6 py-24 text-warm-white/75 lg:px-12">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <Enso className="h-9 w-9 text-aurora/70" />
        <h2 className="mt-8 font-display text-[clamp(1.875rem,4.2vw,2.75rem)] leading-tight">
          {home.bookingBand.title}
        </h2>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-warm-white/70">
          {home.bookingBand.text}
        </p>
        <button
          type="button"
          onClick={() => scrollToId(AVAILABILITY_SECTION_ID)}
          className="mt-9 rounded-full bg-aurora px-8 py-3.5 text-xs font-medium uppercase tracking-[0.15em] text-ink transition-colors hover:bg-[#9be3c4]"
        >
          {common.cta.checkDates}
        </button>
      </div>
    </section>
  );
}
