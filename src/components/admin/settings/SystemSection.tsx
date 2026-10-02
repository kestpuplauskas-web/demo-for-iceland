import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { History, RotateCcw, Save, Trash2 } from "lucide-react";
import {
  createSystemSnapshot,
  deleteSystemSnapshot,
  listSystemSnapshots,
  restoreSystemSnapshot,
} from "@/lib/system-snapshots.functions";
import { clearDemoBookings } from "@/lib/setup.functions";

export function SystemSection() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const fetchList = useServerFn(listSystemSnapshots);
  const create = useServerFn(createSystemSnapshot);
  const restore = useServerFn(restoreSystemSnapshot);
  const remove = useServerFn(deleteSystemSnapshot);
  const [name, setName] = useState("");

  const { data: snapshots, isLoading } = useQuery({
    queryKey: ["system-snapshots"],
    queryFn: () => fetchList(),
  });

  const createM = useMutation({
    mutationFn: () => create({ data: { name: name.trim() || undefined } }),
    onSuccess: () => {
      toast.success(t("settings.system.saved"));
      setName("");
      qc.invalidateQueries({ queryKey: ["system-snapshots"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("settings.system.failed")),
  });

  const restoreM = useMutation({
    mutationFn: (snapshotId: string) => restore({ data: { snapshotId } }),
    onSuccess: () => {
      toast.success(t("settings.system.restored"));
      qc.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("settings.system.failed")),
  });

  const removeM = useMutation({
    mutationFn: (snapshotId: string) => remove({ data: { snapshotId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["system-snapshots"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : t("settings.system.failed")),
  });

  const latest = snapshots?.[0];
  const clearDemo = useServerFn(clearDemoBookings);
  const [confirmText, setConfirmText] = useState("");
  const clearM = useMutation({
    mutationFn: () => clearDemo({ data: { confirm: "DELETE" } }),
    onSuccess: (r) => {
      toast.success(`${r.deleted} bookings removed. A backup was saved first.`);
      setConfirmText("");
      qc.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Cleanup failed"),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trash2 className="h-4 w-4" /> Clear demo bookings
          </CardTitle>
          <CardDescription>
            Removes all bookings, invoices and payment records so a new hotel starts clean.
            Properties, prices and settings stay. A backup is saved automatically and can be restored below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="demo-confirm">Type DELETE to confirm</Label>
            <Input id="demo-confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
          </div>
          <Button
            variant="destructive"
            disabled={confirmText !== "DELETE" || clearM.isPending}
            onClick={() => clearM.mutate()}
          >
            {clearM.isPending ? "Clearing…" : "Clear all bookings"}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Save className="h-4 w-4" /> {t("settings.system.saveTitle")}
          </CardTitle>
          <CardDescription>{t("settings.system.saveDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              createM.mutate();
            }}
          >
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="snapshot-name">{t("settings.system.nameLabel")}</Label>
              <Input
                id="snapshot-name"
                value={name}
                placeholder={t("settings.system.namePlaceholder")}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={createM.isPending}>
              {createM.isPending ? t("settings.system.saving") : t("settings.system.saveButton")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RotateCcw className="h-4 w-4" /> {t("settings.system.restoreTitle")}
          </CardTitle>
          <CardDescription>{t("settings.system.restoreDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={!latest || restoreM.isPending}>
                {restoreM.isPending
                  ? t("settings.system.restoring")
                  : t("settings.system.backToDefault")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("settings.system.confirmTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("settings.system.confirmDesc", {
                    date: latest ? new Date(latest.createdAt).toLocaleString("lt-LT") : "",
                  })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={() => latest && restoreM.mutate(latest.id)}>
                  {t("settings.system.confirmButton")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {!latest && !isLoading ? (
            <p className="mt-3 text-xs text-muted-foreground">{t("settings.system.noSnapshot")}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" /> {t("settings.system.historyTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : (snapshots ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("settings.system.noSnapshot")}</p>
          ) : (
            <ul className="divide-y text-sm">
              {(snapshots ?? []).map((s, i) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">
                      {s.name || t("settings.system.unnamed")}
                      {i === 0 ? (
                        <span className="ml-2 rounded bg-accent px-1.5 py-0.5 text-xs font-normal text-accent-foreground">
                          {t("settings.system.current")}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(s.createdAt).toLocaleString("lt-LT")} ·{" "}
                      {t("settings.system.counts", {
                        properties: s.counts.properties ?? 0,
                        bookings: s.counts.bookings ?? 0,
                        templates:
                          (s.counts.content_templates ?? 0) + (s.counts.contract_templates ?? 0),
                        translations: s.counts.content_translations ?? 0,
                      })}
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" disabled={restoreM.isPending}>
                        <RotateCcw className="mr-1 h-3.5 w-3.5" /> {t("settings.system.restoreThis")}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("settings.system.confirmTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("settings.system.confirmDesc", {
                            date: new Date(s.createdAt).toLocaleString("lt-LT"),
                          })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => restoreM.mutate(s.id)}>
                          {t("settings.system.confirmButton")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("common.delete")}
                    disabled={removeM.isPending}
                    onClick={() => removeM.mutate(s.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
