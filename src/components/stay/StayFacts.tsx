import { Reveal } from "@/components/site/Reveal";
import { amenityIconForLabel } from "@/lib/amenity-icons";
import { useContent } from "@/content";

export type Fact = { label: string; value: string };

export function StayFacts({ facts, amenities }: { facts: Fact[]; amenities: string[] }) {
  const { common } = useContent();
  return (
    <Reveal>
      <dl className="grid gap-8 rounded-md bg-linen p-8 sm:grid-cols-2 lg:grid-cols-4">
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt className="label-caps text-stone/80">{fact.label}</dt>
            <dd className="mt-2 font-display text-xl font-medium text-paper">{fact.value}</dd>
          </div>
        ))}
      </dl>

      {amenities.length ? (
        <div className="mt-10">
          <h2 className="label-caps text-sage">{common.labels.amenities}</h2>
          <ul className="mt-5 grid gap-x-8 text-sm leading-relaxed text-stone sm:grid-cols-2 lg:grid-cols-3">
            {amenities.map((amenity) => {
              const Icon = amenityIconForLabel(amenity);
              return (
                <li
                  key={amenity}
                  className="flex items-center justify-between gap-4 border-b border-border py-4"
                >
                  <span className="font-display text-base text-paper">{amenity}</span>
                  <Icon className="h-6 w-6 shrink-0 text-stone" strokeWidth={1.25} aria-hidden />
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </Reveal>
  );
}