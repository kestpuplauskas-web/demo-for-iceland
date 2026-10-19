import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, ExternalLink, Globe, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getWebsiteDomain, saveCustomDomain, verifyCustomDomain } from "@/lib/website-domain.functions";

const SERVER_IP = "185.158.133.1";

export function WebsiteDomainSection({ canEdit }: { canEdit: boolean }) {
  const fetchDomain = useServerFn(getWebsiteDomain);
  const save = useServerFn(saveCustomDomain);
  const verify = useServerFn(verifyCustomDomain);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["website-domain"], queryFn: () => fetchDomain() });
  const [domain, setDomain] = useState("");
  const [check, setCheck] = useState<null | { found: boolean; ok: boolean }>(null);

  useEffect(() => {
    if (data) setDomain(data.customDomain);
  }, [data?.customDomain]);

  const saveM = useMutation({
    mutationFn: () => save({ data: { domain } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["website-domain"] });
      setCheck(null);
      toast.success("Domain saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const verifyM = useMutation({
    mutationFn: () => verify({ data: { domain: data!.customDomain } }),
    onSuccess: (r) => setCheck({ found: r.found, ok: r.a.includes(SERVER_IP) }),
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center gap-2 rounded-lg border p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  const freeUrl = `/site/${data.subdomain}`;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5 text-primary" /> Your free website address
          </CardTitle>
          <CardDescription>Ready to use. Guests can book directly on this address.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <code className="rounded-md border bg-muted px-3 py-2 text-sm">app.revoostay.com/site/{data.subdomain}</code>
          <Button variant="outline" asChild>
            <a href={freeUrl} target="_blank" rel="noopener noreferrer">
              View website <ExternalLink className="ml-1 h-4 w-4" />
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your own domain</CardTitle>
          <CardDescription>Use an address you already own, e.g. stay.myhotel.com.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-md space-y-2">
            <Label htmlFor="custom-domain">Domain</Label>
            <Input
              id="custom-domain"
              placeholder="stay.myhotel.com"
              inputMode="url"
              autoComplete="off"
              value={domain}
              disabled={!canEdit}
              onChange={(e) => setDomain(e.target.value)}
            />
          </div>
          <Button onClick={() => saveM.mutate()} disabled={!canEdit || saveM.isPending || domain.trim() === data.customDomain}>
            {saveM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {domain.trim() === "" && data.customDomain ? "Remove domain" : "Save domain"}
          </Button>

          {data.customDomain && (
            <div className="space-y-3 rounded-lg border p-4 text-sm">
              <p className="font-medium">Step 2 — add this record at your domain provider:</p>
              <div className="grid grid-cols-3 gap-2 rounded-md bg-muted p-3 font-mono text-xs">
                <span className="text-muted-foreground">Type</span>
                <span className="text-muted-foreground">Name</span>
                <span className="text-muted-foreground">Value</span>
                <span>A</span>
                <span>{data.customDomain.split(".").length > 2 ? data.customDomain.split(".")[0] : "@"}</span>
                <span>{SERVER_IP}</span>
              </div>
              <p className="text-muted-foreground">
                Step 3 — after adding the record, press “Check DNS”. Changes can take up to a few hours. Then we activate
                the secure (https) connection for you.
              </p>
              <Button variant="outline" onClick={() => verifyM.mutate()} disabled={verifyM.isPending}>
                {verifyM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Check DNS
              </Button>
              {check && (
                <p className={`flex items-center gap-2 ${check.ok ? "text-primary" : "text-destructive"}`}>
                  {check.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  {check.ok
                    ? "Record found. Your domain will be activated shortly."
                    : check.found
                      ? `The domain points elsewhere. Set the A record to ${SERVER_IP}.`
                      : "Record not found yet. Check the record or wait a little longer."}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
