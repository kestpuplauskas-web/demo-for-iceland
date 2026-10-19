import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { getPlatformAccess, listOrganizations, setOrganizationStatus } from "@/lib/platform.functions";

export const Route = createFileRoute("/_authenticated/admin/platform")({
  head: () => ({ meta: [{ title: "Platform | RevooStay" }] }),
  component: PlatformPage,
});

function PlatformPage() {
  const qc = useQueryClient();
  const access = useServerFn(getPlatformAccess);
  const list = useServerFn(listOrganizations);
  const setStatus = useServerFn(setOrganizationStatus);
  const { data: acc, isLoading: accLoading } = useQuery({ queryKey: ["platform-access"], queryFn: () => access() });
  const { data, isLoading } = useQuery({
    queryKey: ["platform-orgs"],
    queryFn: () => list(),
    enabled: acc?.isPlatformAdmin === true,
  });
  const mut = useMutation({
    mutationFn: (v: { id: string; status: "active" | "blocked" }) => setStatus({ data: v }),
    onSuccess: (_r, v) => {
      toast.success(v.status === "blocked" ? "Organization blocked" : "Organization activated");
      qc.invalidateQueries({ queryKey: ["platform-orgs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (accLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!acc?.isPlatformAdmin) return <div className="p-8">You do not have access to this page.</div>;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="font-display text-3xl">Platform</h1>
        <p className="text-sm text-muted-foreground">All hotels registered on RevooStay.</p>
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hotel</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Properties</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={7} className="text-muted-foreground">Loading…</TableCell></TableRow>
            )}
            {data?.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">{o.name}<div className="text-xs text-muted-foreground">{o.contact_email}</div></TableCell>
                <TableCell>{o.subdomain}.revoostay.com</TableCell>
                <TableCell className="capitalize">{o.plan}</TableCell>
                <TableCell>{o.properties}</TableCell>
                <TableCell>{o.members}</TableCell>
                <TableCell>
                  <Badge variant={o.status === "active" ? "default" : "destructive"} className="capitalize">{o.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant={o.status === "active" ? "outline" : "default"}
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
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
