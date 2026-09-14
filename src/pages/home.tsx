
import { BookingBand } from "@/components/home/BookingBand";
import { ExtrasSection } from "@/components/home/ExtrasSection";
import { HeroV2 } from "@/components/home/HeroV2";
import { IntroStrip } from "@/components/home/IntroStrip";
import { LocationSection } from "@/components/home/LocationSection";
import { StaysSection } from "@/components/home/StaysSection";
import { getContent } from "@/content";
import { SITE_URL } from "@/data/nav";
import { contact } from "@/data/contact";
import type { Locale } from "@/lib/locale";
import { propertiesQueryFor } from "@/lib/property-queries";
import { useLooseLoaderData } from "@/lib/route-data";
import type { Property } from "@/lib/revoo-schemas";
import { pageHead } from "@/lib/seo";

type HomeLoaderData = { properties: Property[] | null };

export function homeRoute(locale: Locale) {
  const c = getContent(locale);
  const title = c.home.seoTitle;
  const description = c.home.seoDescription;

  return {
    head: () => ({
      ...pageHead({ path: "/", title, description, locale }),
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LodgingBusiness",
            name: "Mánahlíð",
            url: SITE_URL,
            description,
            email: contact.email,
            telephone: contact.phones[0],
            address: {
              "@type": "PostalAddress",
              streetAddress: "Ólafsfjarðarvegur 625",
              addressLocality: "Ólafsfjörður",
              postalCode: "626",
              addressCountry: "IS",
            },
            priceRange: "ISK 28,900–68,900",
          }),
        },
      ],
    }),
    loader: async ({ context }: { context: { queryClient: { ensureQueryData: (q: unknown) => Promise<unknown> } } }): Promise<HomeLoaderData> => {
      // Fetch on the server and hand the rows to the component, so SSR and the
      // first client render agree. An API hiccup must not take the landing page
      // down — the section renders its own error state.
      try {
        return {
          properties: (await context.queryClient.ensureQueryData(
            propertiesQueryFor(locale),
          )) as Property[],
        };
      } catch {
        return { properties: null };
      }
    },
    component: Index,
  };
}

function Index() {
  const { properties } = useLooseLoaderData<HomeLoaderData>();

  return (
    <>
      <HeroV2 />
      <IntroStrip />
      <StaysSection {...(properties ? { initialProperties: properties } : {})} />
      <ExtrasSection />
      <LocationSection />
      <BookingBand />
    </>
  );
}
