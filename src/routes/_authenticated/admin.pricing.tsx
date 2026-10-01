import { formatNumber } from "@/lib/utils";
import { useAdminCurrency } from "@/lib/use-admin-currency";
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  bulkSetDynamicPricing,
  deleteRateCalendarRow,
  deleteRateCalendarRows,
  updatePropertyPrices,
  getPricingHeatmap,
  listPricingOverview,
  listRateCalendarMulti,
  saveRateCalendarBulk,
} from "@/lib/pricing-rules.functions";
import { DynamicPricingPanel } from "@/components/admin/DynamicPricingPanel";

export const Route = createFileRoute("/_authenticated/admin/pricing")({
  component: PricingPage,
});

type Kind = "season" | "event" | "manual";
const KIND_LABEL: Record<Kind, string> = { season: "Season", event: "Holiday", manual: "Fixed price" };
const KIND_PRIORITY: Record<Kind, number> = { season: 0, event: 10, manual: 100 };
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

function errText(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  try {
    const parsed = JSON.parse(msg);
    if (Array.isArray(parsed) && parsed[0]?.message) return parsed[0].message;
  } catch {
    /* not JSON */
  }
  return msg;
}

/** Heat color based on price ratio to base price. */
function heatColor(ratio: number): string {
  if (ratio <= 0.9) return "hsl(205 70% 72%)";
  if (ratio < 1.01) return "hsl(200 30% 88%)";
  if (ratio < 1.1) return "hsl(140 55% 72%)";
  if (ratio < 1.25) return "hsl(55 85% 68%)";
  if (ratio < 1.5) return "hsl(28 90% 66%)";
  if (ratio < 2) return "hsl(5 80% 66%)";
  return "hsl(288 55% 62%)";
}

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
const firstWeekday = (y: number, m: number) => (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7;

const emptyRule = {
  label: "",
  kind: "season" as Kind,
  date_from: "",
  date_to: "",
  mode: "multiplier" as "multiplier" | "fixed",
  multiplier: "1.30",
  fixed_price: "",
  priority: "0",
  color: "#f59e0b",
};
const PALETTE = ["#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#3b82f6", "#06b6d4", "#10b981", "#84cc16", "#64748b"];

function PricingPage() {
  const { symbol: cur } = useAdminCurrency();
  const qc = useQueryClient();
  const fetchOverview = useServerFn(listPricingOverview);
  const fetchRules = useServerFn(listRateCalendarMulti);
  const fetchHeatmap = useServerFn(getPricingHeatmap);
  const saveBulkFn = useServerFn(saveRateCalendarBulk);
  const deleteRowFn = useServerFn(deleteRateCalendarRow);
  const deleteRowsFn = useServerFn(deleteRateCalendarRows);
  const bulkToggleFn = useServerFn(bulkSetDynamicPricing);
  const updPricesFn = useServerFn(updatePropertyPrices);
  const updPrices = useMutation({
    mutationFn: (v: { property_id: string; price_per_night: number; min_nightly_rate: number | null; max_nightly_rate: number | null }) =>
      updPricesFn({ data: v }),
    onSuccess: () => {
      toast.success("Price saved");
      qc.invalidateQueries({ queryKey: ["pricing-overview"] });
      qc.invalidateQueries({ queryKey: ["pricing-heatmap"] });
      qc.invalidateQueries({ queryKey: ["dyn-pricing"] });
    },
    onError: (e) => {
      toast.error(errText(e));
      qc.invalidateQueries({ queryKey: ["pricing-overview"] });
    },
  });
  const savePrice = (p: { id: string; base: number; min: number | null; max: number | null }, field: "base" | "min" | "max", raw: string) => {
    const t = raw.trim().replace(",", ".");
    const val = t === "" ? null : Number(t);
    if (val != null && (!Number.isFinite(val) || val < 0)) return toast.error("Enter a positive number.");
    if (field === "base" && val == null) return toast.error("Base price is required.");
    const next = { base: p.base, min: p.min, max: p.max, [field]: val };
    if (next[field] === p[field]) return;
    updPrices.mutate({ property_id: p.id, price_per_night: next.base as number, min_nightly_rate: next.min, max_nightly_rate: next.max });
  };

  const now = new Date();
  const todayIso = iso(now.getFullYear(), now.getMonth(), now.getDate());
  /* 12 months forward from the current month */
  const months = Array.from({ length: 12 }, (_, k) => {
    const d = new Date(now.getFullYear(), now.getMonth() + k, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const rangeEnd = iso(months[11].y, months[11].m, daysInMonth(months[11].y, months[11].m));
  const rangeEndExcl = (() => { const d = new Date(months[11].y, months[11].m + 1, 1); return iso(d.getFullYear(), d.getMonth(), 1); })();
  const [propertyId, setPropertyId] = useState<string | null>(null);

  const overviewQ = useQuery({ queryKey: ["pricing-overview"], queryFn: () => fetchOverview() });
  const properties = overviewQ.data ?? [];

  const rulesQ = useQuery({
    queryKey: ["pricing-rules", propertyId],
    queryFn: () => fetchRules({ data: { property_id: propertyId } }),
  });
  const rules = ((rulesQ.data ?? []) as any[]).filter((r) => r.date_to >= todayIso);

  const heatQ = useQuery({
    queryKey: ["pricing-heatmap", propertyId, todayIso],
    queryFn: () =>
      fetchHeatmap({
        data: { property_id: propertyId, date_from: todayIso, date_to: rangeEndExcl },
      }),
  });
  const byDate = useMemo(() => {
    const m: Record<string, { price: number; ratio: number; occupancy: number; source: string }> = {};
    for (const d of heatQ.data?.days ?? []) m[d.date] = d;
    return m;
  }, [heatQ.data]);

  /* Rule applied to the day (highest priority) — for calendar color */
  const ruleForDate = (date: string) => {
    let best: any = null;
    for (const r of rules) {
      if (r.date_from <= date && r.date_to >= date && (!best || r.priority > best.priority)) best = r;
    }
    return best;
  };
  const [pickStart, setPickStart] = useState<string | null>(null);
  const onDayClick = (date: string) => {
    if (!pickStart) {
      setPickStart(date);
      setForm((f) => ({ ...f, date_from: date, date_to: date }));
    } else {
      const [a, b] = pickStart <= date ? [pickStart, date] : [date, pickStart];
      setForm((f) => ({ ...f, date_from: a, date_to: b }));
      setPickStart(null);
    }
  };

  const propName = (id: string) => properties.find((p) => p.id === id)?.name ?? "—";

  /* ── New rule ── */
  const [form, setForm] = useState(emptyRule);
  const [applyAll, setApplyAll] = useState(true);
  const [targets, setTargets] = useState<string[]>([]);
  const targetIds = applyAll ? properties.map((p) => p.id) : targets;
  const formValid =
    form.label.trim() &&
    form.date_from &&
    form.date_to &&
    form.date_to >= form.date_from &&
    targetIds.length > 0 &&
    (form.mode === "multiplier" ? Number(form.multiplier) > 0 : Number(form.fixed_price) >= 0 && form.fixed_price !== "");

  const saveBulk = useMutation({
    mutationFn: () =>
      saveBulkFn({
        data: {
          property_ids: targetIds,
          label: form.label.trim(),
          kind: form.kind,
          date_from: form.date_from,
          date_to: form.date_to,
          multiplier: form.mode === "multiplier" ? Number(form.multiplier) : null,
          fixed_price: form.mode === "fixed" ? Number(form.fixed_price) : null,
          priority: Number(form.priority) || 0,
          color: form.color,
        },
      }),
    onSuccess: (r) => {
      toast.success(`Rule applied to ${r.count} propert${r.count === 1 ? "y" : "ies"}`);
      setForm(emptyRule);
      qc.invalidateQueries({ queryKey: ["pricing-rules"] });
      qc.invalidateQueries({ queryKey: ["pricing-heatmap"] });
      qc.invalidateQueries({ queryKey: ["rate-calendar"] });
    },
    onError: (e) => toast.error(errText(e)),
  });

  const [toDelete, setToDelete] = useState<any | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const delAll = useMutation({
    mutationFn: (ids: string[]) => deleteRowsFn({ data: { ids } }),
    onSuccess: (r) => {
      toast.success(`Deleted rules: ${r.count}`);
      qc.invalidateQueries({ queryKey: ["pricing-rules"] });
      qc.invalidateQueries({ queryKey: ["pricing-heatmap"] });
      qc.invalidateQueries({ queryKey: ["rate-calendar"] });
    },
    onError: (e) => toast.error(errText(e)),
  });
  const delRow = useMutation({
    mutationFn: (id: string) => deleteRowFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["pricing-rules"] });
      qc.invalidateQueries({ queryKey: ["pricing-heatmap"] });
      qc.invalidateQueries({ queryKey: ["rate-calendar"] });
    },
    onError: (e) => toast.error(errText(e)),
  });

  const toggle = useMutation({
    mutationFn: (v: { ids: string[]; enabled: boolean }) =>
      bulkToggleFn({ data: { property_ids: v.ids, enabled: v.enabled } }),
    onSuccess: (_d, v) => {
      toast.success(v.enabled ? "Dynamic pricing enabled" : "Dynamic pricing disabled");
      qc.invalidateQueries({ queryKey: ["pricing-overview"] });
      qc.invalidateQueries({ queryKey: ["pricing-heatmap"] });
      qc.invalidateQueries({ queryKey: ["dyn-pricing"] });
    },
    onError: (e) => toast.error(errText(e)),
  });

  return (
    <div className="space-y-8 p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Pricing</h1>
          <p className="text-sm text-muted-foreground">
            All property prices in one place — calendar, seasons, holidays, and occupancy impact.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="pr-prop">Property</Label>
            <select
              id="pr-prop"
              className="h-10 min-w-56 rounded-md border bg-background px-3 text-sm"
              value={propertyId ?? ""}
              onChange={(e) => setPropertyId(e.target.value || null)}
            >
              <option value="">All properties (average)</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Heat calendar */}
      <section className="space-y-3 rounded-xl border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Price calendar {months[0].y}-{String(months[0].m+1).padStart(2,"0")} – {rangeEnd.slice(0,7)}</h2>
            <p className="text-xs text-muted-foreground">
              {pickStart
                ? `Start: ${pickStart}. Click the end date.`
                : "Click the start and end date — the dates will be filled into a new rule. Days with a rule are shown in its color."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {[
              ["Cheaper", 0.85],
              ["Base", 1],
              ["+10%", 1.15],
              ["+30%", 1.3],
              ["+60%", 1.6],
              ["Peak", 2.2],
            ].map(([l, r]) => (
              <span key={String(l)} className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-sm border" style={{ backgroundColor: heatColor(Number(r)) }} />
                {l}
              </span>
            ))}
          </div>
        </div>
        {heatQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {months.map(({ y: year, m }) => (
              <div key={`${year}-${m}`} className="space-y-1">
                <p className="text-sm font-medium">{MONTHS[m]} {year}</p>
                <div className="grid grid-cols-7 gap-[2px] text-[10px] text-muted-foreground">
                  {WEEKDAYS.map((w, i) => (
                    <span key={i} className="text-center">{w}</span>
                  ))}
                  {Array.from({ length: firstWeekday(year, m) }).map((_, i) => (
                    <span key={`b${i}`} />
                  ))}
                  {Array.from({ length: daysInMonth(year, m) }).map((_, i) => {
                    const date = iso(year, m, i + 1);
                    const past = date < todayIso;
                    const cell = byDate[date];
                    const rule = ruleForDate(date);
                    const selected = form.date_from && form.date_to && date >= form.date_from && date <= form.date_to;
                    return (
                      <button
                        type="button"
                        key={date}
                        disabled={past}
                        onClick={() => onDayClick(date)}
                        title={
                          (cell
                            ? `${date} · ${formatNumber(cell.price, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur} · occupancy ${cell.occupancy}%`
                            : date) + (rule ? ` · ${rule.label}` : "")
                        }
                        className={`relative flex h-6 items-center justify-center overflow-hidden rounded-sm border text-[10px] text-foreground disabled:cursor-not-allowed disabled:opacity-30 ${
                          selected ? "ring-2 ring-primary ring-offset-1" : ""
                        }`}
                        style={cell ? { backgroundColor: heatColor(cell.ratio) } : undefined}
                      >
                        {i + 1}
                        {rule ? (
                          <span
                            className="absolute inset-x-[2px] bottom-[1px] h-[3px] rounded-full"
                            style={{ backgroundColor: rule.color ?? "#f59e0b" }}
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* New rule */}
      <section className="space-y-4 rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold">New pricing rule</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="pr-label">Name</Label>
            <Input id="pr-label" value={form.label} placeholder="e.g., Summer season" onChange={(e) => setForm({ ...form, label: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pr-kind">Type</Label>
            <select
              id="pr-kind"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={form.kind}
              onChange={(e) => {
                const k = e.target.value as Kind;
                setForm({ ...form, kind: k, priority: String(KIND_PRIORITY[k]) });
              }}
            >
              {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
                <option key={k} value={k}>{KIND_LABEL[k]}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="pr-from">From</Label>
            <Input id="pr-from" type="date" value={form.date_from} onChange={(e) => setForm({ ...form, date_from: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pr-to">To and including</Label>
            <Input id="pr-to" type="date" value={form.date_to} onChange={(e) => setForm({ ...form, date_to: e.target.value })} />
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="pr-mode" checked={form.mode === "multiplier"} onChange={() => setForm({ ...form, mode: "multiplier" })} />
              Multiplier (%)
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="pr-mode" checked={form.mode === "fixed"} onChange={() => setForm({ ...form, mode: "fixed" })} />
              Fixed price ({cur})
            </label>
          </div>
          {form.mode === "multiplier" ? (
            <div className="space-y-1">
              <Label htmlFor="pr-mult">Multiplier</Label>
              <Input id="pr-mult" className="w-32" type="number" step="0.01" min={0} value={form.multiplier} onChange={(e) => setForm({ ...form, multiplier: e.target.value })} />
            </div>
          ) : (
            <div className="space-y-1">
              <Label htmlFor="pr-fixed">Price per night ({cur})</Label>
              <Input id="pr-fixed" className="w-32" type="number" step="0.01" min={0} value={form.fixed_price} onChange={(e) => setForm({ ...form, fixed_price: e.target.value })} />
            </div>
          )}
          <div className="space-y-1">
            <Label>Color</Label>
            <div className="flex items-center gap-1">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Color ${c}`}
                  onClick={() => setForm({ ...form, color: c })}
                  className={`h-7 w-7 rounded-full border-2 ${form.color === c ? "border-foreground" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input type="color" aria-label="Other color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-7 w-9 cursor-pointer rounded border bg-background" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="pr-prio">Priority</Label>
            <Input id="pr-prio" className="w-24" type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} />
          </div>
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={applyAll} onChange={(e) => setApplyAll(e.target.checked)} />
            Apply to all properties ({properties.length})
          </label>
          {!applyAll && (
            <div className="flex flex-wrap gap-2">
              {properties.map((p) => {
                const on = targets.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setTargets((t) => (on ? t.filter((x) => x !== p.id) : [...t, p.id]))}
                    className={`rounded-full border px-3 py-1 text-xs ${on ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <Button disabled={!formValid || saveBulk.isPending} onClick={() => saveBulk.mutate()}>
          <Plus className="mr-1 h-4 w-4" />
          {saveBulk.isPending ? "Saving…" : "Add rule"}
        </Button>
      </section>

      {/* Rules list */}
      <section className="space-y-3 rounded-xl border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            Rules {propertyId ? `— ${propName(propertyId)}` : "— all properties"}
          </h2>
          {rules.length > 0 && (
            <Button variant="outline" size="sm" className="text-destructive" disabled={delAll.isPending} onClick={() => setConfirmAll(true)}>
              <Trash2 className="mr-1 h-4 w-4" />
              {delAll.isPending ? "Deleting…" : `Delete all (${rules.length})`}
            </Button>
          )}
        </div>
        {rulesQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rules yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-2">Name</th>
                  <th className="p-2">Property</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">From – to</th>
                  <th className="p-2">Change</th>
                  <th className="p-2">Priority</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2 font-medium">
                      <span className="flex items-center gap-2">
                        <span className="h-3 w-3 shrink-0 rounded-full border" style={{ backgroundColor: r.color ?? "#f59e0b" }} />
                        {r.label}
                      </span>
                    </td>
                    <td className="p-2">{propName(r.property_id)}</td>
                    <td className="p-2">{KIND_LABEL[r.kind as Kind]}</td>
                    <td className="p-2 whitespace-nowrap">{r.date_from} – {r.date_to}</td>
                    <td className="p-2 whitespace-nowrap">
                      {r.fixed_price != null ? `${formatNumber(Number(r.fixed_price), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur}` : `×${Number(r.multiplier).toFixed(2)}`}
                    </td>
                    <td className="p-2">{r.priority}</td>
                    <td className="p-2 text-right">
                      <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => setToDelete(r)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Property status */}
      <section className="space-y-3 rounded-xl border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Property status</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={toggle.isPending || !properties.length}
              onClick={() => toggle.mutate({ ids: properties.map((p) => p.id), enabled: true })}
            >
              Enable for all
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={toggle.isPending || !properties.length}
              onClick={() => toggle.mutate({ ids: properties.map((p) => p.id), enabled: false })}
            >
              Disable for all
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-2">Property</th>
                <th className="p-2">Base price</th>
                <th className="p-2">Min.</th>
                <th className="p-2">Max.</th>
                <th className="p-2">Occupancy rules</th>
                <th className="p-2">Dynamic pricing</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-2 font-medium">{p.name}</td>
                  <td className="p-2">
                    <Input
                      key={`base-${p.id}-${p.base}`}
                      type="text"
                      inputMode="decimal"
                      className="h-8 w-24"
                      defaultValue={p.base != null ? String(p.base) : ""}
                      placeholder="—"
                      aria-label={`Base price: ${p.name}`}
                      onBlur={(e) => savePrice(p, "base", e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      key={`min-${p.id}-${p.min}`}
                      type="text"
                      inputMode="decimal"
                      className="h-8 w-24"
                      defaultValue={p.min != null ? String(p.min) : ""}
                      placeholder="—"
                      aria-label={`Min. price: ${p.name}`}
                      onBlur={(e) => savePrice(p, "min", e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      key={`max-${p.id}-${p.max}`}
                      type="text"
                      inputMode="decimal"
                      className="h-8 w-24"
                      defaultValue={p.max != null ? String(p.max) : ""}
                      placeholder="—"
                      aria-label={`Max. price: ${p.name}`}
                      onBlur={(e) => savePrice(p, "max", e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                    />
                  </td>
                  <td className="p-2">{p.tiers.length || "—"}</td>
                  <td className="p-2">
                    <Switch
                      checked={p.enabled}
                      disabled={toggle.isPending}
                      onCheckedChange={(c) => toggle.mutate({ ids: [p.id], enabled: c })}
                      aria-label={`Dynamic pricing: ${p.name}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          You can edit prices (per night, {cur}) directly in the table — saved when you leave the field or press Enter. An empty min./max. field means "no limit". Select a property above for occupancy rules.
        </p>
      </section>

      {propertyId && (
        <section className="rounded-xl border bg-card p-6">
          <h2 className="mb-2 text-lg font-semibold">Property settings — {propName(propertyId)}</h2>
          <DynamicPricingPanel key={propertyId} propertyId={propertyId} />
        </section>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete rule?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete ? `"${toDelete.label}" (${toDelete.date_from} – ${toDelete.date_to}) will be removed.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toDelete) delRow.mutate(toDelete.id);
                setToDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={confirmAll} onOpenChange={setConfirmAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all rules?</AlertDialogTitle>
            <AlertDialogDescription>
              {rules.length} rules will be removed {propertyId ? `for property "${propName(propertyId)}"` : "for all properties"}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                delAll.mutate(rules.map((r) => r.id));
                setConfirmAll(false);
              }}
            >
              Delete all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
