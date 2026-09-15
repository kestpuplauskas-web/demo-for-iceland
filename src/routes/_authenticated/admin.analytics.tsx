import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Eye, Inbox, TrendingDown, TrendingUp, Users } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import {
  getAnalyticsSummary,
  percentChange,
  type AnalyticsRange,
} from "@/lib/analytics.functions";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
  component: AnalyticsPage,
});

const RANGES: AnalyticsRange[] = [7, 30, 90];

const shortDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

const CARD = "rounded-lg border bg-card text-card-foreground shadow-sm";

function StatCard({
  label,
  value,
  change,
  icon: Icon,
  suffix,
  changeHint,
}: {
  label: string;
  value: string | number;
  change?: number | null;
  icon: typeof Eye;
  suffix?: string;
  changeHint?: string;
}) {
  const positive = (change ?? 0) >= 0;
  return (
    <div className={`${CARD} p-5`}>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums">
        {value}
        {suffix ? <span className="text-lg text-muted-foreground">{suffix}</span> : null}
      </p>
      {change !== undefined && change !== null ? (
        <p
          className={`mt-2 flex items-center gap-1 text-xs ${positive ? "text-primary" : "text-destructive"}`}
        >
          {positive ? (
            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {positive ? "+" : ""}
          {change}% {changeHint}
        </p>
      ) : null}
    </div>
  );
}

function BreakdownList({
  title,
  rows,
  total,
  empty,
}: {
  title: string;
  rows: { label: string; views: number }[];
  total: number;
  empty: string;
}) {
  return (
    <div className={`${CARD} p-5`}>
      <h2 className="text-sm font-medium">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((row) => (
            <li key={row.label}>
              <div className="flex items-center justify-between text-sm">
                <span className="truncate pr-3 text-muted-foreground">{row.label}</span>
                <span className="shrink-0 tabular-nums">{row.views}</span>
              </div>
              <Progress value={total ? (row.views / total) * 100 : 0} className="mt-1.5 h-1" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AnalyticsPage() {
  const { t, i18n } = useTranslation();
  const [range, setRange] = useState<AnalyticsRange>(30);
  const fetchSummary = useServerFn(getAnalyticsSummary);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-analytics", range],
    queryFn: () => fetchSummary({ data: { range } }),
    staleTime: 60_000,
  });

  const countryLabel = useMemo(() => {
    const names = new Intl.DisplayNames([i18n.language || "en"], { type: "region" });
    return (code: string) => {
      if (!code || code === "unknown") return t("analytics.unknown");
      try {
        return names.of(code.toUpperCase()) ?? code.toUpperCase();
      } catch {
        return code.toUpperCase();
      }
    };
  }, [i18n.language, t]);

  const chartData = useMemo(() => {
    const byDay = new Map((data?.daily ?? []).map((d) => [d.day, d]));
    const out: { day: string; label: string; views: number; visitors: number }[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      const row = byDay.get(key);
      out.push({
        day: key,
        label: shortDay(key),
        views: Number(row?.views ?? 0),
        visitors: Number(row?.visitors ?? 0),
      });
    }
    return out;
  }, [data, range]);

  const totalViews = Number(data?.totals?.views ?? 0);
  const totalVisitors = Number(data?.totals?.visitors ?? 0);
  const leads = Number(data?.leads ?? 0);
  const conversion = totalVisitors ? ((leads / totalVisitors) * 100).toFixed(1) : "0.0";
  const bots = Number(data?.bots ?? 0);

  const sourceLabel = (key: string) =>
    t(`analytics.sources.${key}`, { defaultValue: key });
  const deviceLabel = (key: string) =>
    t(`analytics.devices.${key}`, { defaultValue: key });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("analytics.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("analytics.subtitle")}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("analytics.botsNote")}
            {isLoading ? "" : ` (${bots})`}
          </p>
        </div>
        <div className="flex gap-2">
          {RANGES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRange(value)}
              className={`rounded-full px-4 py-2 text-sm transition-colors ${
                range === value
                  ? "bg-primary text-primary-foreground"
                  : "border text-foreground hover:bg-accent"
              }`}
            >
              {t("analytics.rangeDays", { count: value })}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className={`${CARD} p-4 text-sm text-destructive`}>
          {t("analytics.loadFailed")} {error instanceof Error ? error.message : ""}
        </div>
      ) : null}

      {isLoading ? (
        <div className={`${CARD} p-10 text-center text-sm text-muted-foreground`}>
          {t("common.loading")}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={t("analytics.pageViews")}
              value={totalViews}
              change={percentChange(totalViews, Number(data?.previous?.views ?? 0))}
              changeHint={t("analytics.vsPrevious")}
              icon={Eye}
            />
            <StatCard
              label={t("analytics.uniqueVisitors")}
              value={totalVisitors}
              change={percentChange(totalVisitors, Number(data?.previous?.visitors ?? 0))}
              changeHint={t("analytics.vsPrevious")}
              icon={Users}
            />
            <StatCard label={t("analytics.bookings")} value={leads} icon={Inbox} />
            <StatCard
              label={t("analytics.conversion")}
              value={conversion}
              suffix="%"
              icon={TrendingUp}
            />
          </div>

          <div className={`${CARD} mt-6 p-5`}>
            <h2 className="mb-4 text-sm font-medium">{t("analytics.traffic")}</h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: -20, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="pv-views" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="pv-visitors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--accent-foreground))" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="hsl(var(--accent-foreground))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="views"
                    name={t("analytics.pageViews")}
                    stroke="hsl(var(--primary))"
                    fill="url(#pv-views)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="visitors"
                    name={t("analytics.uniqueVisitors")}
                    stroke="hsl(var(--accent-foreground))"
                    fill="url(#pv-visitors)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <BreakdownList
              title={t("analytics.countries")}
              total={totalViews}
              empty={t("analytics.noData")}
              rows={(data?.countries ?? []).map((c) => ({
                label: countryLabel(c.country),
                views: Number(c.views),
              }))}
            />
            <BreakdownList
              title={t("analytics.topPages")}
              total={totalViews}
              empty={t("analytics.noData")}
              rows={(data?.top_pages ?? []).map((p) => ({ label: p.path, views: Number(p.views) }))}
            />
            <BreakdownList
              title={t("analytics.trafficSources")}
              total={totalViews}
              empty={t("analytics.noData")}
              rows={(data?.sources ?? []).map((s) => ({
                label: sourceLabel(s.source),
                views: Number(s.views),
              }))}
            />
            <BreakdownList
              title={t("analytics.deviceTypes")}
              total={totalViews}
              empty={t("analytics.noData")}
              rows={(data?.devices ?? []).map((d) => ({
                label: deviceLabel(d.device),
                views: Number(d.views),
              }))}
            />
          </div>

          {totalViews === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">{t("analytics.emptyHint")}</p>
          ) : null}
        </>
      )}
    </div>
  );
}
