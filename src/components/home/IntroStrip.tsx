import { EnsoDivider } from "@/components/site/Enso";
import { Reveal } from "@/components/site/Reveal";
import { useContent } from "@/content";

export function IntroStrip() {
  const { home } = useContent();
  return (
    <section className="on-paper px-6 py-24 lg:px-12 lg:py-32">
      <div className="mx-auto max-w-3xl text-center">
        <EnsoDivider />
        <Reveal>
          <p className="mt-12 font-display text-[clamp(1.6rem,3.4vw,2.25rem)] leading-[1.3] font-light italic text-paper">
            {home.intro.title}
          </p>
          <p className="mt-8 text-base leading-[1.75] text-stone sm:text-lg">
            {home.intro.text}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
