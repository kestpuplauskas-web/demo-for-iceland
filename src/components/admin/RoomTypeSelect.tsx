import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Settings2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PROPERTY_TYPES } from "@/lib/properties";

const QK = ["room-types"];

/** Room type picker with hotel-defined custom types (add / remove inline). */
export function RoomTypeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [manage, setManage] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: custom = [] } = useQuery({
    queryKey: QK,
    queryFn: async () => {
      const { data, error } = await supabase.from("room_types").select("id, name").order("sort_order").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const builtIn = PROPERTY_TYPES.map((p) => ({ value: p.value as string, label: t(p.labelKey) }));
  const options = [...builtIn, ...custom.map((c) => ({ value: c.name, label: c.name }))];
  if (value && !options.some((o) => o.value === value)) options.push({ value, label: value });

  const add = async () => {
    const n = name.trim();
    if (!n) return;
    if (options.some((o) => o.label.toLowerCase() === n.toLowerCase())) {
      toast.error("This room type already exists.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("room_types").insert({ name: n, sort_order: custom.length });
    setBusy(false);
    if (error) return toast.error("Could not add the room type. Please try again.");
    setName("");
    await qc.invalidateQueries({ queryKey: QK });
    onChange(n);
    toast.success(`Room type "${n}" added`);
  };

  const remove = async (id: string, n: string) => {
    if (!confirm(`Remove room type "${n}"? Rooms already using it keep the label.`)) return;
    const { error } = await supabase.from("room_types").delete().eq("id", id);
    if (error) return toast.error("Could not remove the room type.");
    await qc.invalidateQueries({ queryKey: QK });
    toast.success("Room type removed");
  };

  return (
    <div className="mt-1 space-y-2">
      <div className="flex gap-2">
        <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded border px-2 py-1">
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setManage((m) => !m)}
          aria-label="Manage room types"
          title="Manage room types"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded border hover:bg-muted"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </div>
      {manage && (
        <div className="space-y-2 rounded border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Create your own room types and assign them to any room.</p>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void add();
                }
              }}
              placeholder="e.g. Deluxe Suite"
              aria-label="New room type name"
              className="w-full rounded border px-2 py-1"
            />
            <button
              type="button"
              disabled={!name.trim() || busy}
              onClick={() => void add()}
              className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1 text-sm text-primary-foreground disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
          {custom.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {custom.map((c) => (
                <li key={c.id} className="inline-flex items-center gap-1 rounded-full border bg-background px-3 py-1 text-xs">
                  {c.name}
                  <button type="button" aria-label={`Remove ${c.name}`} onClick={() => void remove(c.id, c.name)} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
