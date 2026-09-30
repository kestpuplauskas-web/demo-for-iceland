import { formatNumber } from "@/lib/utils";
import { useAdminCurrency } from "@/lib/use-admin-currency";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Info } from "lucide-react";
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
  deleteRateCalendarRow,
  getPricingSettings,
  listRateCalendar,
  previewDynamicPrice,
  saveOccupancyPricing,
  saveRateCalendarRow,
} from "@/lib/pricing-rules.functions";
import { rateCalendarRowFor, type RateCalendarRow } from "@/lib/booking-pricing";

type Kind = "season" | "event" | "manual";
type CalRow = RateCalendarRow & { id: string; label: string; created_at: string };

const KIND_LABEL: Record<Kind, string> = { season: "Season", event: "Holiday", manual: "Manual" };
const KIND_PRIORITY: Record<Kind, number> = { season: 0, event: 10, manual: 100 };
const SOURCE_LABEL: Record<string, string> = {
  base: "—",
  season: "Season",
  event: "Holiday",
  manual: "Fixed price",
  occupancy: "Occupancy",
};

/** Converts a server (zod) error into human-readable text. */
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

function pctLabel(m: number) {
  const p = Math.round((m - 1) * 1000) / 10;
  return `${p >= 0 ? "+" : ""}${p}% off the base price`;
}

function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Which row loses during an overlap — and to whom. */
function losingInfo(row: CalRow, all: CalRow[]): string | null {
  for (const other of all) {
    if (other.id === row.id) continue;
    const from = row.date_from > other.date_from ? row.date_from : other.date_from;
    const to = row.date_to < other.date_to ? row.date_to : other.date_to;
    if (from > to) continue;
    const winner = rateCalendarRowFor([row, other], from) as CalRow | null;
    if (winner && winner.id === other.id) {
      return `Overlaps with "${other.label}" — this row is not used for the ${from} – ${to} period.`;
    }
  }
  return null;
}

const emptyRow = {
  id: undefined as string | undefined,
  label: "",
  kind: "season" as Kind,
  date_from: "",
  date_to: "",
  mode: "multiplier" as "multiplier" | "fixed",
  multiplier: "1.30",
  fixed_price: "",
  priority: "0",
};

export function DynamicPricingPanel({ propertyId }: { propertyId: string }) {
  const { symbol: cur } = useAdminCurrency();
  const qc = useQueryClient();
  const fetchSettings = useServerFn(getPricingSettings);
  const fetchCal = useServerFn(listRateCalendar);
  const saveSettingsFn = useServerFn(saveOccupancyPricing);
  const saveRowFn = useServerFn(saveRateCalendarRow);
  const deleteRowFn = useServerFn(deleteRateCalendarRow);
  const previewFn = useServerFn(previewDynamicPrice);

  const settingsQ = useQuery({
    queryKey: ["pricing-settings", propertyId],
    queryFn: () => fetchSettings({ data: { property_id: propertyId } }),
  });
  const calQ = useQuery({
    queryKey: ["rate-calendar", propertyId],
    queryFn: () => fetchCal({ data: { property_id: propertyId } }),
  });
  const rows = (calQ.data ?? []) as unknown as CalRow[];

  // --- Switch, bounds, occupancy ---
  const [enabled, setEnabled] = useState(false);
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [tiers, setTiers] = useState<Array<{ pct: string; mult: string }>>([]);
  useEffect(() => {
    const s = settingsQ.data;
    if (!s) return;
    setEnabled(s.enabled);
    setMin(s.min != null ? String(s.min) : "");
    setMax(s.max != null ? String(s.max) : "");
    setTiers(s.tiers.map((t) => ({ pct: String(t.minOccupancyPct), mult: String(t.multiplier) })));
  }, [settingsQ.data]);

  const tiersError = useMemo(() => {
    for (let i = 0; i < tiers.length; i++) {
      const p = Number(tiers[i].pct);
      const m = Number(tiers[i].mult);
      if (tiers[i].pct === "" || Number.isNaN(p) || p < 0 || p > 100) return `Row ${i + 1}: occupancy must be 0–100%.`;
      if (!(m > 0)) return `Row ${i + 1}: multiplier must be greater than 0.`;
      if (i > 0 && p <= Number(tiers[i - 1].pct))
        return `Occupancy thresholds must increase in sequence — threshold ${p}% is repeated or lower than the previous one.`;
    }
    return null;
  }, [tiers]);
  const boundsError =
    min !== "" && max !== "" && Number(max) < Number(min)
      ? "Maximum price cannot be lower than the minimum."
      : null;

  const saveSettings = useMutation({
    mutationFn: (next: { enabled: boolean }) =>
      saveSettingsFn({
        data: {
          property_id: propertyId,
          dynamic_pricing_enabled: next.enabled,
          min_nightly_rate: min === "" ? null : Number(min),
          max_nightly_rate: max === "" ? null : Number(max),
          tiers: tiers.map((t) => ({ minOccupancyPct: Number(t.pct), multiplier: Number(t.mult) })),
        },
      }),
    onSuccess: (_d, vars) => {
      toast.success(
        vars.enabled !== settingsQ.data?.enabled
          ? vars.enabled
            ? "Dynamic pricing enabled"
            : "Dynamic pricing disabled"
          : "Occupancy rules and bounds saved",
      );
      qc.invalidateQueries({ queryKey: ["pricing-settings", propertyId] });
      qc.invalidateQueries({ queryKey: ["dyn-pricing"] });
    },
    onError: (e) => toast.error(errText(e)),
  });

  // --- Calendar row form ---
  const [form, setForm] = useState(emptyRow);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const fErrors = {
    label: !form.label.trim() ? "Enter a name." : null,
    date_from: !form.date_from ? "Select a start date." : null,
    date_to: !form.date_to
      ? "Select an end date."
      : form.date_from && form.date_to < form.date_from
        ? "End date cannot be earlier than the start date."
        : null,
    value:
      form.mode === "multiplier"
        ? !(Number(form.multiplier) > 0)
          ? "Multiplier must be greater than 0 (e.g., 1.30)."
          : null
        : form.fixed_price === "" || !(Number(form.fixed_price) >= 0)
          ? "Enter the exact nightly price."
          : null,
  };
  const formValid = Object.values(fErrors).every((e) => !e);
  const showErr = (k: keyof typeof fErrors) => (touched[k] ? fErrors[k] : null);

  const saveRow = useMutation({
    mutationFn: () =>
      saveRowFn({
        data: {
          ...(form.id ? { id: form.id } : {}),
          property_id: propertyId,
          label: form.label.trim(),
          kind: form.kind,
          date_from: form.date_from,
          date_to: form.date_to,
          multiplier: form.mode === "multiplier" ? Number(form.multiplier) : null,
          fixed_price: form.mode === "fixed" ? Number(form.fixed_price) : null,
          priority: Number(form.priority) || 0,
        },
      }),
    onSuccess: () => {
      toast.success(form.id ? "Period updated" : "Period added");
      setForm(emptyRow);
      setTouched({});
      qc.invalidateQueries({ queryKey: ["rate-calendar", propertyId] });
      qc.invalidateQueries({ queryKey: ["dyn-pricing"] });
    },
    onError: (e) => toast.error(errText(e)),
  });

  const [toDelete, setToDelete] = useState<CalRow | null>(null);
  const delRow = useMutation({
    mutationFn: (id: string) => deleteRowFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["rate-calendar", propertyId] });
      qc.invalidateQueries({ queryKey: ["dyn-pricing"] });
    },
    onError: (e) => toast.error(errText(e)),
  });

  // --- Preview ---
  const today = new Date().toISOString().slice(0, 10);
  const [pFrom, setPFrom] = useState(today);
  const [pTo, setPTo] = useState(addDays(today, 7));
  const preview = useMutation({
    mutationFn: () => previewFn({ data: { property_id: propertyId, date_from: pFrom, date_to: pTo } }),
    onError: (e) => toast.error(errText(e)),
  });

  const disabledCls = enabled ? "" : "pointer-events-none opacity-50";

  return (
    <section className="mt-8 space-y-6 rounded-xl border bg-card p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Dynamic pricing</h2>
          <p className="text-sm text-muted-foreground">
            The nightly price changes based on season, holidays, and occupancy. Data is kept when disabled.
          </p>
        </div>
        <label className="flex items-center gap-3 text-sm font-medium">
          <Switch
            checked={enabled}
            disabled={saveSettings.isPending || settingsQ.isLoading || !!tiersError || !!boundsError}
            onCheckedChange={(c) => {
              setEnabled(c);
              saveSettings.mutate({ enabled: c });
            }}
          />
          {enabled ? "Enabled" : "Disabled"}
        </label>
      </header>

      {/* 1. Ribos */}
      <div className={`space-y-3 ${disabledCls}`}>
        <h3 className="font-semibold">Price bounds</h3>
        <div className="grid max-w-md gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="dp-min">Minimum nightly price ({cur})</Label>
            <Input id="dp-min" type="number" inputMode="decimal" min={0} value={min} onChange={(e) => setMin(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dp-max">Maximum nightly price ({cur})</Label>
            <Input id="dp-max" type="number" inputMode="decimal" min={0} value={max} onChange={(e) => setMax(e.target.value)} aria-invalid={!!boundsError} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          The price will never fall below or rise above this bound, regardless of season or occupancy.
        </p>
        {boundsError && <p role="alert" className="text-sm font-medium text-destructive">{boundsError}</p>}
      </div>

      {/* 3. Occupancy */}
      <div className={`space-y-3 ${disabledCls}`}>
        <h3 className="font-semibold">Occupancy rules</h3>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5" /> Occupancy is calculated for the entire property, not just this specific room.
        </p>
        <div className="max-w-md space-y-2">
          {tiers.length > 0 && (
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-medium text-muted-foreground">
              <span>From occupancy %</span>
              <span>Multiplier</span>
              <span className="w-10" />
            </div>
          )}
          {tiers.map((t, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
              <Input type="number" inputMode="numeric" min={0} max={100} value={t.pct} aria-label="From occupancy %"
                onChange={(e) => setTiers((a) => a.map((x, j) => (j === i ? { ...x, pct: e.target.value } : x)))} />
              <div>
                <Input type="number" inputMode="decimal" step="0.01" min={0} value={t.mult} aria-label="Multiplier"
                  onChange={(e) => setTiers((a) => a.map((x, j) => (j === i ? { ...x, mult: e.target.value } : x)))} />
                {Number(t.mult) > 0 && <span className="text-xs text-muted-foreground">= {pctLabel(Number(t.mult))}</span>}
              </div>
              <Button variant="ghost" size="icon" aria-label="Remove threshold" onClick={() => setTiers((a) => a.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setTiers((a) => [...a, { pct: "", mult: "1.10" }])}>
            <Plus className="mr-1 h-4 w-4" /> Add threshold
          </Button>
          {tiersError && <p role="alert" className="text-sm font-medium text-destructive">{tiersError}</p>}
        </div>
        <Button
          disabled={!!tiersError || !!boundsError || saveSettings.isPending}
          onClick={() => saveSettings.mutate({ enabled })}
        >
          {saveSettings.isPending ? "Saving…" : "Save bounds and occupancy"}
        </Button>
      </div>

      {/* 2. Kalendorius */}
      <div className={`space-y-3 ${disabledCls}`}>
        <h3 className="font-semibold">Price calendar</h3>
        {calQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No periods yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-2">Name</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">From – to (inclusive)</th>
                  <th className="p-2">Change</th>
                  <th className="p-2">Priority</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const lose = losingInfo(r, rows);
                  return (
                    <tr key={r.id} className={`border-t ${lose ? "text-muted-foreground" : ""}`}>
                      <td className="p-2">
                        <div className="font-medium">{r.label}</div>
                        {lose && <div className="text-xs">{lose}</div>}
                      </td>
                      <td className="p-2">{KIND_LABEL[r.kind]}</td>
                      <td className="p-2 whitespace-nowrap">{r.date_from} – {r.date_to}</td>
                      <td className="p-2 whitespace-nowrap">
                        {r.fixed_price != null ? `${formatNumber(Number(r.fixed_price), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur}` : `×${Number(r.multiplier).toFixed(2)}`}
                      </td>
                      <td className="p-2">{r.priority}</td>
                      <td className="p-2">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" aria-label="Edit"
                            onClick={() => {
                              setForm({
                                id: r.id,
                                label: r.label,
                                kind: r.kind,
                                date_from: r.date_from,
                                date_to: r.date_to,
                                mode: r.fixed_price != null ? "fixed" : "multiplier",
                                multiplier: r.multiplier != null ? String(r.multiplier) : "1.30",
                                fixed_price: r.fixed_price != null ? String(r.fixed_price) : "",
                                priority: String(r.priority),
                              });
                              setTouched({});
                            }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => setToDelete(r)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="max-w-md space-y-3 rounded-lg border p-4">
          <h4 className="font-medium">{form.id ? "Edit period" : "Add period"}</h4>
          <div className="space-y-1">
            <Label htmlFor="dp-label">Name</Label>
            <Input id="dp-label" value={form.label} placeholder="e.g., Summer season"
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              onBlur={() => setTouched((t) => ({ ...t, label: true }))} aria-invalid={!!showErr("label")} />
            {showErr("label") && <p className="text-sm text-destructive">{showErr("label")}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="dp-kind">Type</Label>
            <select id="dp-kind" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.kind}
              onChange={(e) => {
                const k = e.target.value as Kind;
                setForm({ ...form, kind: k, priority: String(KIND_PRIORITY[k]) });
              }}>
              {(Object.keys(KIND_LABEL) as Kind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="dp-from">From</Label>
            <Input id="dp-from" type="date" value={form.date_from}
              onChange={(e) => setForm({ ...form, date_from: e.target.value })}
              onBlur={() => setTouched((t) => ({ ...t, date_from: true }))} />
            {showErr("date_from") && <p className="text-sm text-destructive">{showErr("date_from")}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="dp-to">To and including</Label>
            <Input id="dp-to" type="date" value={form.date_to}
              onChange={(e) => setForm({ ...form, date_to: e.target.value })}
              onBlur={() => setTouched((t) => ({ ...t, date_to: true }))} />
            {showErr("date_to") && <p className="text-sm text-destructive">{showErr("date_to")}</p>}
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Price change</legend>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" name="dp-mode" checked={form.mode === "multiplier"} onChange={() => setForm({ ...form, mode: "multiplier" })} />
                Multiplier (%)
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="dp-mode" checked={form.mode === "fixed"} onChange={() => setForm({ ...form, mode: "fixed" })} />
                Fixed price ({cur})
              </label>
            </div>
            {form.mode === "multiplier" ? (
              <div className="space-y-1">
                <Input type="number" inputMode="decimal" step="0.01" min={0} value={form.multiplier} aria-label="Multiplier"
                  onChange={(e) => setForm({ ...form, multiplier: e.target.value })}
                  onBlur={() => setTouched((t) => ({ ...t, value: true }))} />
                {Number(form.multiplier) > 0 && <p className="text-xs text-muted-foreground">= {pctLabel(Number(form.multiplier))}. Also applies to extra services.</p>}
              </div>
            ) : (
              <div className="space-y-1">
                <Input type="number" inputMode="decimal" step="0.01" min={0} value={form.fixed_price} aria-label="Fixed price"
                  onChange={(e) => setForm({ ...form, fixed_price: e.target.value })}
                  onBlur={() => setTouched((t) => ({ ...t, value: true }))} />
                <p className="text-xs text-muted-foreground">Final nightly price; occupancy is not applied, extra services do not get more expensive.</p>
              </div>
            )}
            {showErr("value") && <p className="text-sm text-destructive">{showErr("value")}</p>}
          </fieldset>
          <div className="space-y-1">
            <Label htmlFor="dp-prio">Priority</Label>
            <Input id="dp-prio" type="number" inputMode="numeric" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} />
            <p className="text-xs text-muted-foreground">When two periods overlap, the higher number wins.</p>
          </div>
          <div className="flex gap-2">
            <Button disabled={!formValid || saveRow.isPending} onClick={() => saveRow.mutate()}>
              {saveRow.isPending ? "Saving…" : form.id ? "Save" : "Add period"}
            </Button>
            {form.id && (
              <Button variant="ghost" onClick={() => { setForm(emptyRow); setTouched({}); }}>Cancel</Button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Preview */}
      <div className="space-y-3">
        <h3 className="font-semibold">Preview — what the guest would see</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="dp-pfrom">Check-in</Label>
            <Input id="dp-pfrom" type="date" value={pFrom} onChange={(e) => setPFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dp-pto">Check-out</Label>
            <Input id="dp-pto" type="date" value={pTo} onChange={(e) => setPTo(e.target.value)} />
          </div>
          <Button variant="outline" disabled={preview.isPending || !(pTo > pFrom)} onClick={() => preview.mutate()}>
            {preview.isPending ? "Calculating…" : "Preview price"}
          </Button>
        </div>
        {preview.data && (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-2">Night</th>
                  <th className="p-2">Base</th>
                  <th className="p-2">Rule</th>
                  <th className="p-2">Occupancy</th>
                  <th className="p-2">Final</th>
                  <th className="p-2">Impact on services</th>
                </tr>
              </thead>
              <tbody>
                {preview.data.nights_breakdown.map((n) => (
                  <tr key={n.date} className="border-t">
                    <td className="p-2">{n.date}</td>
                    <td className="p-2">{formatNumber(n.base, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {cur}</td>
                    <td className="p-2">{SOURCE_LABEL[n.source]}</td>
                    <td className="p-2">{Math.round(preview.data.occupancyByDate[n.date] ?? 0)} %</td>
                    <td className="p-2 font-medium">{formatNumber(n.price, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {cur}</td>
                    <td className="p-2">×{(n.source === "manual" ? 1 : n.multiplier).toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="border-t font-semibold">
                  <td className="p-2" colSpan={4}>Total for stay</td>
                  <td className="p-2" colSpan={2}>{formatNumber(preview.data.stay_total, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {cur}</td>
                </tr>
              </tbody>
            </table>
            {!enabled && <p className="p-2 text-xs text-muted-foreground">Dynamic pricing is disabled — showing base price.</p>}
          </div>
        )}
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete period?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete && `Delete "${toDelete.label}" (${toDelete.date_from} – ${toDelete.date_to})? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => toDelete && delRow.mutate(toDelete.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
