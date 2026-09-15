import { useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useState } from "react";


import { plural } from "@/components/search/plural";
import { SearchBar, type SearchValues } from "@/components/search/SearchBar";
import { useBooking } from "@/components/site/booking-context";
import { Enso } from "@/components/site/Enso";
import { ImagePlaceholder } from "@/components/site/ImagePlaceholder";
import { getContent, useContent, useLocale } from "@/content";
import { availabilityQuery } from "@/lib/availability-queries";
import type { Locale } from "@/lib/locale";
import { cn } from "@/lib/utils";

import { propertiesQueryFor } from "@/lib/property-queries";
import { formatPrice, toPropertyView } from "@/lib/property-view";
import type { Property } from "@/lib/revoo-schemas";
import { pageHead } from "@/lib/seo";
import { amenityIconForLabel } from "@/lib/amenity-icons";

type ResultsSearch = SearchValues;

function numberParam(value: unknown, min: number): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min ? Math.floor(parsed) : undefined;
}

function pick(key: string, value: number | undefined): Record<string, number> {
  return value === undefined ? {} : { [key]: value };
}

export function availabilityResultsRoute(locale: Locale) {
  const c = getContent(locale);

  return {
    validateSearch: (search: Record<string, unknown>): ResultsSearch => ({
      ...(typeof search["nuo"] === "string" ? { nuo: search["nuo"] } : {}),
      ...(typeof search["iki"] === "string" ? { iki: search["iki"] } : {}),
      ...pick("suauge", numberParam(search["suauge"], 1)),
      ...pick("vaikai", numberParam(search["vaikai"], 0)),
      ...pick("kudikiai", numberParam(search["kudikiai"], 0)),
    }),
    head: () => {
      const head = pageHead({
        path: "/laisvi-kambariai",
        title: c.common.results.seoTitle,
        description: c.common.results.seoDescription,
        locale,
      });
      return { ...head, meta: [...head.meta, { name: "robots", content: "noindex" }] };
    },
    component: () => <ResultsPage locale={locale} />,
  };
}

function ResultsPage({ locale }: { locale: Locale }) {
  const { common } = useContent();
  const search = useSearch({ strict: false }) as ResultsSearch;
  const adults = search.suauge ?? 2;
  const children = search.vaikai ?? 0;
  const seats = adults + children;

  const availability = useQuery(availabilityQuery(search.nuo, search.iki, seats));
  const properties = useQuery(propertiesQueryFor(locale));

  const hasDates = Boolean(search.nuo && search.iki);
  const loading = hasDates && (availability.isPending || availability.isFetching || properties.isPending);
  const failed = availability.isError || properties.isError;

  const freeIds = availability.data?.free_ids ?? [];
  const totals = new Map(
    (availability.data?.free_units ?? []).map((unit) => [unit.id, unit.total] as const),
  );
  const rooms = (properties.data ?? []).filter((property) => freeIds.includes(property.id));
  const nights = availability.data?.nights ?? 0;

  return (
    <>
      <section className="bg-linen px-6 pt-32 pb-8 lg:px-12 lg:pt-36">
        <div className="mx-auto max-w-[84rem] text-center">
          <Enso className="mx-auto h-9 w-9 text-sage/70" />
          <p className="label-caps mt-6 text-sage">{common.results.eyebrow}</p>
          <h1 className="mt-4 font-display text-[clamp(2.25rem,5vw,3.25rem)] leading-[1.12] font-medium text-paper">
            {common.results.title}
          </h1>
        </div>
      </section>

      <section className="bg-linen px-6 pb-24 lg:px-12">
        <div className="mx-auto grid max-w-[84rem] gap-8 lg:grid-cols-[22rem_1fr] lg:items-start">
          <aside className="lg:sticky lg:top-28">
            {/* keeps the calendar card top aligned with the first room card */}
            {hasDates && !failed && !loading && rooms.length > 0 ? (
              <p className="hidden pb-4 text-sm text-transparent lg:block" aria-hidden>
                .
              </p>
            ) : null}
            <SearchBar variant="compact" initial={search} />
          </aside>


          <div>
            {!hasDates ? (
              <p className="py-10 text-center text-sm text-stone">{common.results.missingDates}</p>
            ) : failed ? (
              <div className="py-10 text-center text-sm text-stone">
                <p>{common.results.error}</p>
                <button
                  type="button"
                  onClick={() => {
                    void availability.refetch();
                    void properties.refetch();
                  }}
                  className="mt-5 rounded-full bg-aurora px-6 py-2.5 text-xs font-medium text-ink transition-colors hover:bg-aurora-deep"
                >
                  {common.results.retry}
                </button>
              </div>
            ) : loading ? (
              <div className="mx-auto max-w-md py-16 text-center">
                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-border">
                  <div className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-aurora animate-[loading-bar_1.2s_ease-in-out_infinite]" />
                </div>
                <p className="mt-6 font-display text-lg text-paper">{common.results.loadingTitle}</p>
                <p className="mt-2 text-sm text-stone">{common.results.loadingText}</p>
              </div>
            ) : rooms.length === 0 ? (
              <div className="py-12 text-center">
                <p className="font-display text-2xl text-paper">{common.results.empty}</p>
                <p className="mt-3 text-sm text-stone">{common.results.emptyHint}</p>
              </div>
            ) : (
              <>
                <p className="pb-4 text-sm text-stone">
                  {rooms.length}{" "}
                  {plural(
                    rooms.length,
                    common.results.foundOne,
                    common.results.foundFew,
                    common.results.foundMany,
                  )}
                </p>

                <div className="grid gap-6">
                  {rooms.map((property) => (
                    <RoomResultCard
                      key={property.id}
                      property={property}
                      locale={locale}
                      nights={nights}
                      total={totals.get(property.id) ?? null}
                      checkin={search.nuo as string}
                      checkout={search.iki as string}
                      adults={seats}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}


function RoomResultCard({
  property,
  locale,
  nights,
  total,
  checkin,
  checkout,
  adults,
}: {
  property: Property;
  locale: Locale;
  nights: number;
  total: number | null;
  checkin: string;
  checkout: string;
  adults: number;
}) {
  const { common } = useContent();
  const { open } = useBooking();
  const [expanded, setExpanded] = useState(false);
  const view = toPropertyView(property, locale);
  const perNight = total !== null && nights > 0 ? total / nights : view.priceFrom;

  return (
    <article
      className={cn(
        "overflow-hidden rounded-lg border bg-surface shadow-soft transition-colors",
        expanded ? "border-sage/50 shadow-lift" : "border-border hover:border-sage/40",
      )}
    >
      <div className="grid gap-4 p-4 md:grid-cols-[13rem_1fr_12rem] md:items-start md:gap-5">
        {view.image ? (
          <div className="aspect-[4/3] overflow-hidden rounded-md bg-surface-2">
            <img
              src={view.image}
              alt={view.imageAlt}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <ImagePlaceholder label={view.imageAlt} className="aspect-[4/3] rounded-md" />
        )}

        <div className="flex flex-col">
          <h2 className="font-display text-[1.375rem] leading-snug font-semibold text-paper">
            {view.name}
          </h2>
          {view.meta ? (
            <p className="mt-2 text-xs tracking-wide text-stone/80">{view.meta}</p>
          ) : null}
          {view.description && !expanded ? (
            <p className="mt-3 line-clamp-2 text-[0.95rem] leading-relaxed text-stone">
              {view.description}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className="mt-2 self-start text-sm font-medium text-sage underline underline-offset-4 transition-colors hover:text-aurora"
          >
            {expanded ? common.results.lessInfo : common.results.moreInfo}
          </button>
          {view.amenities.length > 0 && !expanded ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {view.amenities.slice(0, 4).map((amenity) => {
                const Icon = amenityIconForLabel(amenity);
                return (
                  <li
                    key={amenity}
                    className="flex items-center gap-2 rounded-md border border-border px-3 py-1 text-xs text-stone"
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
                    {amenity}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>

        <div className="flex flex-col items-start gap-4 border-t border-border pt-4 md:h-full md:items-end md:border-t-0 md:border-l md:pt-0 md:pl-5 md:text-right">
          <div className="md:text-right">
            <p className="font-display text-2xl font-semibold text-paper">
              {total !== null
                ? `${formatMoney(total, view.currency)}`
                : view.priceFrom !== null
                  ? `${common.labels.priceFrom} ${formatMoney(view.priceFrom, view.currency)}`
                  : common.stays.priceOnRequest}
            </p>
            <p className="mt-1 text-xs text-stone">
              {total !== null ? common.results.forStay : ""}
              {perNight !== null && perNight !== undefined
                ? `${total !== null ? " · " : ""}${common.labels.priceFrom} ${formatMoney(Math.round(perNight), view.currency)} / ${common.results.perNight}`
                : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => open(property.id, { checkin, checkout, adults }, { name: property.name })}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-aurora px-5 py-3 text-sm font-medium text-ink transition-colors hover:bg-aurora-deep md:mt-auto"
          >
            {common.cta.book}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-border px-4 py-6 sm:px-6">
          <h3 className="label-caps text-sage">{common.results.detailsTitle}</h3>
          {view.description ? (
            <p className="mt-3 whitespace-pre-line text-[0.95rem] leading-relaxed text-stone">
              {view.description}
            </p>
          ) : null}
          {view.amenities.length > 0 ? (
            <>
              <h4 className="mt-6 font-display text-lg font-semibold text-paper">
                {common.results.amenitiesTitle}
              </h4>
              <ul className="mt-3 flex flex-wrap gap-2">
                {view.amenities.map((amenity) => {
                  const Icon = amenityIconForLabel(amenity);
                  return (
                    <li
                      key={amenity}
                      className="flex items-center gap-2 rounded-md border border-border px-3 py-1 text-xs text-stone"
                    >
                      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
                      {amenity}
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}

    </article>
  );
}
