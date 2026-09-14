import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { MapPin } from "lucide-react";

import { EnsoDivider } from "@/components/site/Enso";
import { ImagePlaceholder } from "@/components/site/ImagePlaceholder";
import { Reveal } from "@/components/site/Reveal";
import { useContent } from "@/content";
import { contact } from "@/data/contact";

const LocationMap = lazy(() => import("@/components/home/LocationMap"));

function MapSkeleton() {
  return <div className="h-full w-full animate-pulse bg-muted" />;
}

export function LocationSection() {
  const { common, home } = useContent();
  return (
    <section id="the-place" className="scroll-mt-24 overflow-x-clip bg-surface px-6 py-24 lg:px-12 lg:py-32">
      <div className="mx-auto max-w-[84rem]">
        <EnsoDivider className="mb-16" />

        <div className="grid items-center gap-14 lg:grid-cols-2">
          <Reveal direction="left">
            <p className="label-caps text-sage">{home.location.eyebrow}</p>
            <h2 className="mt-4 font-display text-[clamp(2rem,4.5vw,2.625rem)] leading-tight font-medium text-paper">
              {home.location.title}
            </h2>
            <div className="mt-6 space-y-4 text-base leading-[1.75] text-stone sm:text-lg">
              {home.location.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <dl className="mt-10 grid grid-cols-2 gap-8 border-t border-border pt-8 text-sm">
              <div><dt className="label-caps text-aurora">From Akureyri</dt><dd className="mt-2 text-paper">40 minutes</dd></div>
              <div><dt className="label-caps text-aurora">From Keflavík</dt><dd className="mt-2 text-paper">4h 30 by car</dd></div>
              <div><dt className="label-caps text-aurora">Nearest shop</dt><dd className="mt-2 text-paper">12 km · Ólafsfjörður</dd></div>
              <div><dt className="label-caps text-aurora">Aurora season</dt><dd className="mt-2 text-paper">Sep – Apr</dd></div>
            </dl>

            <div className="mt-8 flex items-start gap-3 text-sm text-stone">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sage" aria-hidden />
              <span>{contact.address}</span>
            </div>
            <a
              href={contact.mapUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex rounded-full border border-sage px-6 py-3 text-sm font-medium text-sage transition-colors hover:bg-aurora hover:text-ink"
            >
              {common.cta.openMap}
            </a>
          </Reveal>

          <Reveal delay={120} direction="right">
            <div className="overflow-hidden rounded-md shadow-soft">
              <ImagePlaceholder label={home.location.imageAlt} className="aspect-[4/3]" />
            </div>
          </Reveal>
        </div>

        <Reveal delay={80} className="mt-16">
          <div className="h-[360px] overflow-hidden rounded-md shadow-soft [filter:grayscale(1)_contrast(0.95)] lg:h-[500px]">
            <ClientOnly fallback={<MapSkeleton />}>
              <Suspense fallback={<MapSkeleton />}>
                <LocationMap />
              </Suspense>
            </ClientOnly>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
