import { useQuery } from "@tanstack/react-query";
import { getPublicBranding } from "@/lib/property-settings.functions";
import { contact as fallback } from "@/data/contact";

/** Public site name + contacts from General Settings; static values only as fallback. */
export function useSiteContact() {
  const { data } = useQuery({
    queryKey: ["public-branding"],
    queryFn: () => getPublicBranding(),
    staleTime: 5 * 60_000,
  });
  const address = data?.address || fallback.address;
  return {
    name: data?.displayName || "Mánahlíð",
    address,
    phones: data?.phone ? [data.phone] : fallback.phones,
    email: data?.email || fallback.email,
    mapUrl: `https://maps.google.com/?q=${encodeURIComponent(address)}`,
  };
}
