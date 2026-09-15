import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formats UI numbers with Lithuanian thousands grouping. */
export function formatNumber(
  value: number | string | null | undefined,
  options: Intl.NumberFormatOptions = {},
): string {
  const number = Number(value ?? 0);
  return new Intl.NumberFormat("lt-LT", options).format(Number.isFinite(number) ? number : 0);
}
