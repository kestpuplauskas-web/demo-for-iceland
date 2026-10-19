import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ExternalLink, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { getPlatformAccess, listOrganizations, setManagedOrganization, setOrganizationStatus } from "@/lib/platform.functions";

export const Route = createFileRoute("/_authenticated/admin/platform")({
  head: () => ({ meta: [{ title: "Platform | RevooStay" }] }),
  component: PlatformPage,
});

const money = (n: number) => `$${Math.round(n)}`;

function PlatformPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const access = useServerFn(getPlatformAccess);
  const list = useServerFn(listOrganizations);
  const setStatus = useServerFn(setOrganizationStatus);
  const manage = useServerFn(setManagedOrganization);
  const { data: acc, isLoading: accLoading } = useQuery({ queryKey: ["platform-access"], queryFn: () => access() });
  const { data, isLoading } = useQuery({
    queryKey: ["platform-orgs"],
    queryFn: () => list(),
    enabled: acc?.isPlatformAdmin === true,
  });
  const mut = useMutation({
    mutationFn: (v: { id: string; status: "active" | "blocked" }) => setStatus({ data: v }),
    onSuccess: (_r, v) => {
      toast.success(v.status === "blocked" ? "Hotel blocked" : "Hotel activated");
      qc.invalidateQueries({ queryKey: ["platform-orgs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const enter = useMutation({
    mutationFn: (id: string) => manage({ data: { id } }),
    onSuccess: async () => {
      await qc.invalidateQueries();
      navigate({ to: "/admin" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (accLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!acc?.isPlatformAdmin) return <div className="p-8">You do not have access to this page.</div>;

  const k = data?.kpis;
  const now = Date.now();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Platform overview</h1>
        <p className="text-sm text-muted-foreground">All hotels on RevooStay. Bookings and revenue for this month.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Monthly subscriptions (MRR)" value={k ? money(k.mrr) : "…"} hint="Paid plans only" />
        <Kpi label="Commission 2 %" value={k ? money(k.commission) : "…"} hint="From website bookings" />
        <Kpi label="Booking value (GMV)" value={k ? money(k.gmv) : "…"} hint="All bookings this month" />
        <Kpi
          label="Hotels"
          value={k ? String(k.total) : "…"}
          hint={k ? `${k.active} paid · ${k.trial} trial · ${k.blocked} blocked` : ""}
        />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hotel</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Rooms</TableHead>
              <TableHead>Bookings</TableHead>
              <TableHead>GMV</TableHead>
              <TableHead>Verification</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={9} className="text-muted-foreground">Loading…</TableCell></TableRow>
            )}
            {data?.rows.map((o: any) => {
              const trialDays =
                o.trial_ends_at && new Date(o.trial_ends_at).getTime() > now
                  ? Math.ceil((new Date(o.trial_ends_at).getTime() - now) / 86400000)
                  : null;
              return (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">
                    {o.name}
                    <div className="text-xs text-muted-foreground">{o.contact_email}</div>
                    <div className="text-xs text-muted-foreground">Joined {new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                  </TableCell>
                  <TableCell>
                    <a href={`/site/${o.subdomain}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      /site/{o.subdomain}
                    </a>
                    {o.custom_domain && <div className="text-xs text-muted-foreground">{o.custom_domain}</div>}
                  </TableCell>
                  <TableCell className="capitalize">
                    {o.plan}
                    {trialDays !== null && <div className="text-xs text-muted-foreground">Trial: {trialDays} d left</div>}
                  </TableCell>
                  <TableCell>{o.properties}</TableCell>
                  <TableCell>{o.bookingsMonth}</TableCell>
                  <TableCell>{money(o.gmv)}</TableCell>
                  <TableCell>
                    {o.verification_url ? (
                      <a href={o.verification_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                        Open <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={o.status === "active" ? "default" : "destructive"} className="capitalize">{o.status}</Badge>
                  </TableCell>
                  <TableCell className="space-x-2 whitespace-nowrap text-right">
                    <Button size="sm" disabled={enter.isPending} onClick={() => enter.mutate(o.id)}>
                      <LogIn className="mr-1 h-4 w-4" /> Manage
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={mut.isPending}
                      onClick={() => {
                        const next = o.status === "active" ? "blocked" : "active";
                        if (next === "blocked" && !confirm(`Block ${o.name}? Its users will lose access.`)) return;
                        mut.mutate({ id: o.id, status: next });
                      }}
                    >
                      {o.status === "active" ? "Block" : "Activate"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
