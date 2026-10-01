import { format, isSameDay } from "date-fns";
import { enGB, lt as ltLocale } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";

import { plural } from "@/components/search/plural";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPublicAvailabilityCalendar } from "@/lib/availability-calendar.functions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useContent, useLocale } from "@/content";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function nightsBetween(range: DateRange | undefined): number {
  if (!range?.from || !range?.to) return 0;
  return Math.max(0, Math.round((range.to.getTime() - range.from.getTime()) / 86_400_000));
}

/**
 * Booking-engine range picking: the first click sets check-in, the second sets
 * check-out, and any click on a completed range starts a fresh check-in — so
 * changing dates never requires clearing first. The picker never closes itself
 * on selection; the parent closes it on submit or when another field opens.
 */
const dayKey = (d: Date) => format(d, "yyyy-MM-dd");

function nextRange(
  range: DateRange | undefined,
  day: Date,
  isFull: (d: Date) => boolean = () => false,
): DateRange | undefined {
  if (!range?.from || range.to) return isFull(day) ? range : { from: day };
  if (isSameDay(day, range.from)) return undefined;
  if (day < range.from) return isFull(day) ? range : { from: day };
  // Check-out may land on a full night, but no night in between may be full.
  for (let d = new Date(range.from); d < day; d.setDate(d.getDate() + 1)) {
    if (isFull(d)) return isFull(day) ? range : { from: day };
  }
  return { from: range.from, to: day };
}

export function DateRangeField({
  range,
  onChange,
  open: openProp,
  onOpenChange,
  inline = false,
  months,
  className,
}: {
  range: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Render the calendar always visible instead of inside a popover. */
  inline?: boolean;
  months?: number;
  className?: string;
}) {
  const { common } = useContent();
  const locale = useLocale();
  const isMobile = useIsMobile();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = openProp ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const today = useMemo(startOfToday, []);
  const dateLocale = locale === "en" ? enGB : ltLocale;
  const nights = nightsBetween(range);
  const fetchAvail = useServerFn(getPublicAvailabilityCalendar);
  const avail = useQuery({
    queryKey: ["public-availability-calendar"],
    queryFn: () => fetchAvail(),
    enabled: open || inline,
    staleTime: 60_000,
  });
  const total = avail.data?.total ?? 0;
  const freeOn = (d: Date) => (avail.data ? total - (avail.data.booked[dayKey(d)] ?? 0) : null);
  const isFull = (d: Date) => {
    const f = freeOn(d);
    return f !== null && total > 0 && f <= 0;
  };
  const isFew = (d: Date) => {
    const f = freeOn(d);
    return f !== null && total > 1 && f === 1;
  };
  const isFree = (d: Date) => {
    const f = freeOn(d);
    return f !== null && f > 0 && !isFew(d);
  };
  // A full night can still be a check-out day while picking the end of a range.
  const checkoutOk = (d: Date) => !!range?.from && !range.to && d > range.from;

  const label = range?.from
    ? `${format(range.from, "d MMM", { locale: dateLocale })} — ${
        range.to ? format(range.to, "d MMM", { locale: dateLocale }) : "…"
      }${
        nights > 0
          ? ` · ${nights} ${plural(nights, common.search.nightOne, common.search.nightFew, common.search.nightMany)}`
          : ""
      }`
    : common.search.datesPlaceholder;

  const calendar = (
    <>
      <Calendar
        mode="range"
        locale={dateLocale}
        weekStartsOn={1}
        numberOfMonths={months ?? (isMobile ? 1 : 2)}
        selected={range}
        onSelect={() => {
          /* selection is driven by onDayClick for predictable re-picking */
        }}
        onDayClick={(day, modifiers) => {
          if (modifiers["disabled"]) return;
          onChange(nextRange(range, day, isFull));
        }}
        disabled={[{ before: today }, (d: Date) => d >= today && isFull(d) && !checkoutOk(d)]}
        modifiers={{ full: (d: Date) => d >= today && isFull(d), few: (d: Date) => d >= today && isFew(d), free: (d: Date) => d >= today && isFree(d) }}
        modifiersClassNames={{
          full: "[&>button]:line-through [&>button]:opacity-40 bg-[rgb(255_255_255/0.04)]",
          few: "bg-[rgb(199_161_105/0.14)]",
          free: "bg-[rgb(127_211_174/0.10)]",
        }}
        components={{
          DayButton: (props) => {
            const d = props.day.date;
            const f = d >= today && !props.modifiers.outside ? freeOn(d) : null;
            return (
              <CalendarDayButton {...props} className={cn(props.className, "flex-col gap-0 leading-none")}>
                {props.children}
                {f !== null && total > 0 ? (
                  <span
                    className={cn(
                      "mt-0.5 text-[0.6rem] font-semibold no-underline",
                      f <= 0 ? "text-stone/60" : f === 1 && total > 1 ? "text-brass" : "text-aurora",
                    )}
                  >
                    {f <= 0 ? "—" : f}
                  </span>
                ) : null}
              </CalendarDayButton>
            );
          },
        }}
        startMonth={today}
        className="pointer-events-auto [--cell-size:2.4rem] sm:[--cell-size:2.6rem]"
        classNames={{
          month: "flex w-full flex-col gap-4",
          caption_label: "font-display text-lg font-medium capitalize text-paper",
          weekday: "flex-1 select-none text-[0.7rem] uppercase tracking-[0.12em] text-stone/70",
        }}
      />
      <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-[0.7rem] text-stone">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-aurora" />Available</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-brass" />Few left</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-stone/40" />Fully booked</span>
        {avail.isLoading ? <span className="text-stone/60">Loading availability…</span> : null}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
        <span className="text-xs text-stone">
          {nights > 0
            ? `${nights} ${plural(nights, common.search.nightOne, common.search.nightFew, common.search.nightMany)}`
            : range?.from
              ? common.search.checkOut
              : common.search.needDates}
        </span>
        <span className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="rounded-md border border-border px-4 py-1.5 text-xs text-stone transition-colors hover:text-paper"
          >
            {common.search.clear}
          </button>
          {inline ? null : (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full bg-aurora px-4 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-aurora-deep"
            >
              {common.search.done}
            </button>
          )}
        </span>
      </div>
    </>
  );

  if (inline) {
    return <div className={cn("w-full", className)}>{calendar}</div>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-3 rounded-sm px-5 py-3.5 text-left transition-colors hover:bg-[rgb(127_211_174/0.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage",
            className,
          )}
        >
          <CalendarDays className="h-5 w-5 shrink-0 text-sage" aria-hidden />
          <span className="min-w-0">
            <span className="label-caps block text-stone/80">{common.search.datesLabel}</span>
            <span
              className={cn(
                "mt-1 block truncate text-sm font-medium",
                range?.from ? "text-paper" : "text-stone/70",
              )}
            >
              {label}
            </span>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto rounded-sm border-border bg-surface p-4 shadow-lift">
        {calendar}
      </PopoverContent>
    </Popover>
  );
}
