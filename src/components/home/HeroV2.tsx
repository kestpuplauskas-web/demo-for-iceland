import { SearchBar } from "@/components/search/SearchBar";
import { useContent } from "@/content";
import { AVAILABILITY_SECTION_ID } from "@/lib/scroll-to";
import heroAurora from "@/assets/hero-aurora.jpg.asset.json";

/**
 * Home V2 hero: the booking search is the first thing a visitor sees —
 * no scrolling, no category step before results.
 */
export function HeroV2() {
  const { common, home } = useContent();

  return (
    <section id="top" className="relative isolate overflow-hidden border-b border-border bg-ink">
      <img
        src={heroAurora.url}
        alt={home.hero.imageAlt}
        className="absolute inset-0 h-full w-full object-cover"
        loading="eager"
        fetchPriority="high"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-ink/65 via-ink/25 to-ink/95" />

      <div className="relative mx-auto flex min-h-[78vh] max-w-[84rem] flex-col justify-end px-6 pb-14 pt-36 lg:px-12 lg:pb-20">
        <div className="max-w-2xl">
        <p className="label-caps text-aurora">{common.search.eyebrow}</p>
        <h1 className="mt-6 max-w-xl font-display text-[clamp(3.25rem,7vw,6rem)] leading-[0.98] font-normal text-warm-white">
          {common.search.title}
        </h1>
        <p className="mt-7 max-w-md text-sm leading-relaxed text-warm-white/70 sm:text-base">
          {common.search.lead}
        </p>
        </div>

        <div id={AVAILABILITY_SECTION_ID} className="mt-12 w-full max-w-4xl scroll-mt-28">
          <SearchBar className="w-full" />
        </div>
      </div>
      <div className="relative border-t border-border bg-ink/75">
        <div className="mx-auto grid max-w-[84rem] grid-cols-2 gap-px px-6 py-5 text-center text-[0.62rem] uppercase tracking-[0.12em] text-aurora sm:grid-cols-4 lg:px-12">
          <span>14 rooms & cabins</span><span>4 hot tubs facing north</span><span>40 min from Akureyri</span><span>All year</span>
        </div>
      </div>
    </section>
  );
}
