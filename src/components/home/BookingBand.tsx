import { Enso } from "@/components/site/Enso";
import { useContent } from "@/content";
import { AVAILABILITY_SECTION_ID, scrollToId } from "@/lib/scroll-to";

export function BookingBand() {
  const { common, home } = useContent();
  return (
    <section id="practical" className="on-paper scroll-mt-24 border-y border-border px-6 py-24 lg:px-12 lg:py-32">
      <div className="mx-auto mb-24 max-w-[84rem]">
        <p className="label-caps text-aurora">Practical</p>
        <h2 className="mt-4 max-w-md font-display text-[clamp(2.25rem,4.5vw,3.5rem)] leading-tight text-paper">The small print, in normal words</h2>
        <div className="mt-12 grid gap-8 border-t border-border pt-8 text-sm leading-relaxed text-stone sm:grid-cols-2 lg:grid-cols-4">
          <p>Check-in 15:00–22:00. Check-out by 11:00. Late arrival is fine when arranged in advance.</p>
          <p>Quiet hours are 23:00–07:00. The cabins are timber and the valley carries sound.</p>
          <p>All prices include VSK. The Icelandic gistináttaskattur is shown separately before payment.</p>
          <p>Free cancellation up to 7 days before arrival. After that the first night is charged.</p>
        </div>
      </div>
      <div className="mx-auto flex max-w-3xl flex-col items-center border-t border-border pt-24 text-center">
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
          className="mt-9 rounded-full bg-aurora px-8 py-3.5 text-xs font-medium uppercase tracking-[0.15em] text-ink transition-colors hover:bg-aurora-deep"
        >
          {common.cta.checkDates}
        </button>
      </div>
    </section>
  );
}
