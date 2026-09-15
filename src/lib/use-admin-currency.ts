import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPropertySettings } from "@/lib/property-settings.functions";
import { currencySymbol } from "@/lib/properties";
import { formatNumber } from "@/lib/utils";

/**
 * Globali skydelio valiuta iš Nustatymų (scope=global).
 * Grąžina simbolį („kr." / „€") ir formatavimo pagalbininką.
 */
export function useAdminCurrency() {
  const fetchSettings = useServerFn(getPropertySettings);
  const { data } = useQuery({
    queryKey: ["property-settings", "global"],
    queryFn: () => fetchSettings(),
    staleTime: 5 * 60 * 1000,
  });

  const code = (data?.settings as { currency?: string } | undefined)?.currency ?? "EUR";
  const symbol = currencySymbol(code);

  const format = (value: number | null | undefined, digits = 0) =>
    `${formatNumber(value, { minimumFractionDigits: digits, maximumFractionDigits: digits })} ${symbol}`;

  return { code, symbol, format };
}
