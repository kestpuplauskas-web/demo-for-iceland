import { Flame, MountainSnow, Soup, Waves } from "lucide-react";

import { EnsoFrame } from "@/components/site/Enso";
import { Reveal } from "@/components/site/Reveal";
import { useContent } from "@/content";

// Icons stay in code, in the same order as home.extras.items (restobar/sauna/tub/vouchers).
const EXTRA_ICONS = [Waves, Flame, Soup, MountainSnow];

export function ExtrasSection() {
  const { home } = useContent();
  const extras = home.extras.items.map((item, index) => ({
    ...item,
    icon: EXTRA_ICONS[index],
  }));

  return (
    <section id="at-the-house" className="on-paper scroll-mt-24 px-6 py-24 lg:px-12 lg:py-32">
      <div className="mx-auto max-w-[84rem]">
        <p className="label-caps text-stone">{home.extras.eyebrow}</p>
        <h2 className="mt-4 max-w-md font-display text-[clamp(2.25rem,4.5vw,3.5rem)] leading-tight text-paper">Things that are actually here</h2>

        <div className="mt-12 grid border-l border-t border-border sm:grid-cols-2 lg:grid-cols-4">
          {extras.map((extra, index) => (
            <Reveal key={extra.key} delay={index * 90}>
              <div className="h-full border-b border-r border-border p-7">
                <EnsoFrame className="h-12 w-12">
                  {extra.icon ? (
                    <extra.icon className="h-7 w-7 text-sage-deep" strokeWidth={1.5} aria-hidden />
                  ) : null}
                </EnsoFrame>
                <h3 className="mt-4 font-display text-xl text-paper">{extra.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone">{extra.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
