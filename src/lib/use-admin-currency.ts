import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPropertySettings } from "@/lib/property-settings.functions";
import { currencySymbol } from "@/lib/properties";
import { formatNumber } from "@/lib/utils";
import i18n from "@/i18n";
import { useEffect } from "react";

/**
 * Global dashboard currency from Settings (scope=global).
 * Returns the symbol ("$", "€", "kr." ...) and a formatter.
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

  useEffect(() => {
    const interp = (i18n.options.interpolation ??= {});
    interp.defaultVariables = { ...(interp.defaultVariables ?? {}), currency: symbol };
    void i18n.changeLanguage("en");
  }, [symbol]);

  const format = (value: number | null | undefined, digits = 0) =>
    `${formatNumber(value, { minimumFractionDigits: digits, maximumFractionDigits: digits })} ${symbol}`;

  return { code, symbol, format };
}
