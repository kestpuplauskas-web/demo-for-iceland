import { EnsoDivider } from "@/components/site/Enso";
import { Reveal } from "@/components/site/Reveal";
import { useContent } from "@/content";

export function IntroStrip() {
  const { home } = useContent();
  return (
    <section className="on-paper px-6 py-24 lg:px-12 lg:py-32">
      <div className="mx-auto grid max-w-4xl gap-12 lg:grid-cols-[0.9fr_1.2fr] lg:gap-24">
        <Reveal>
          <p className="label-caps text-aurora">The house</p>
          <p className="mt-6 font-display text-[clamp(1.65rem,3vw,2.35rem)] leading-[1.25] font-light italic text-paper">
            {home.intro.title}
          </p>
          <p className="mt-8 text-[0.62rem] uppercase tracking-[0.14em] text-stone">Sigrún & Bjarni — owners since 2016</p>
        </Reveal>
        <Reveal delay={100}>
          <p className="mt-8 text-base leading-[1.75] text-stone sm:text-lg">
            {home.intro.text}
          </p>
          <p className="mt-5 text-sm leading-[1.75] text-stone">We are not a hotel and we do not pretend to be one. There is no reception desk, no lobby music and no minibar. Booking on this page goes straight to us.</p>
        </Reveal>
      </div>
    </section>
  );
}
