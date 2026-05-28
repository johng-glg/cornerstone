import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle2, AlertCircle, Power, PowerOff, ExternalLink, Activity, Settings2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import {
  useIntegrationProviders,
  useCompanyIntegrations,
  useUpsertCompanyIntegration,
  useIntegrationEvents,
  type IntegrationProvider,
  type CompanyIntegration,
} from "@/hooks/useIntegrations";

// Map of provider_key → list of credential env-var names exposed in the configure sheet.
const PROVIDER_CREDENTIAL_FIELDS: Record<string, { label: string; env: string }[]> = {
  docuseal: [
    { label: "DocuSeal API Key", env: "DOCUSEAL_API_KEY" },
    { label: "DocuSeal API URL", env: "DOCUSEAL_API_URL" },
  ],
  forth_pay: [
    { label: "Forth Client ID", env: "FORTH_CLIENT_ID" },
    { label: "Forth API Key", env: "FORTH_API_KEY" },
  ],
  forth_crm: [
    { label: "Forth Client ID", env: "FORTH_CLIENT_ID" },
    { label: "Forth API Key", env: "FORTH_API_KEY" },
  ],
  dialpad: [
    { label: "Dialpad API Token", env: "DIALPAD_API_TOKEN" },
    { label: "Dialpad Webhook Secret", env: "DIALPAD_WEBHOOK_SECRET" },
  ],
};

// Per-provider test edge function name.
const TEST_FUNCTIONS: Record<string, string> = {
  docuseal: "docuseal-test",
  dialpad: "dialpad-test-connection",
  forth_pay: "forth-test-connection",
  forth_crm: "forth-test-connection",
};

function StatusPill({ ci }: { ci?: CompanyIntegration }) {
  if (!ci) return <Badge variant="outline">Not configured</Badge>;
  if (!ci.is_enabled) return <Badge variant="secondary">Disabled</Badge>;
  if (ci.last_connection_error) return <Badge variant="destructive">Error</Badge>;
  if (ci.last_connected_at) return <Badge className="bg-green-600 hover:bg-green-700">Connected</Badge>;
  return <Badge variant="outline">Enabled</Badge>;
}

export function IntegrationsSettingsTab() {
  const providers = useIntegrationProviders();
  const integrations = useCompanyIntegrations();
  const upsert = useUpsertCompanyIntegration();

  const [configureOpen, setConfigureOpen] = useState<IntegrationProvider | null>(null);
  const [activityOpen, setActivityOpen] = useState<IntegrationProvider | null>(null);
  const [testingKey, setTestingKey] = useState<string | null>(null);

  const byKey = useMemo(() => {
    const m = new Map<string, CompanyIntegration>();
    (integrations.data ?? []).forEach((i) => m.set(i.provider_key, i));
    return m;
  }, [integrations.data]);

  const handleToggle = async (p: IntegrationProvider, enabled: boolean) => {
    try {
      const existing = byKey.get(p.provider_key);
      await upsert.mutateAsync({
        provider_key: p.provider_key,
        is_enabled: enabled,
        credentials_vault_ref:
          existing?.credentials_vault_ref ??
          (PROVIDER_CREDENTIAL_FIELDS[p.provider_key]?.map((f) => f.env).join(",") ?? null),
        config: (existing?.config as Record<string, unknown>) ?? {},
      });
      toast({ title: enabled ? "Integration enabled" : "Integration disabled" });
    } catch (e: unknown) {
      toast({ title: "Failed to update", description: e instanceof Error ? e.message : "Unknown", variant: "destructive" });
    }
  };

  const handleTest = async (p: IntegrationProvider) => {
    const fn = TEST_FUNCTIONS[p.provider_key];
    if (!fn) {
      toast({ title: "No test available", description: `No test function registered for ${p.display_name}` });
      return;
    }
    setTestingKey(p.provider_key);
    try {
      const { data, error } = await supabase.functions.invoke(fn);
      if (error) throw error;
      if (data?.success === false) {
        toast({ title: "Test failed", description: data.error ?? "Connection rejected", variant: "destructive" });
      } else {
        toast({ title: "Test passed", description: data?.message ?? "Connection verified" });
      }
    } catch (e: unknown) {
      toast({ title: "Test failed", description: e instanceof Error ? e.message : "Unknown", variant: "destructive" });
    } finally {
      setTestingKey(null);
    }
  };

  const isLoading = providers.isLoading || integrations.isLoading;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">External Integrations</h2>
        <p className="text-sm text-muted-foreground">
          Configure, enable, and monitor every external service connected to your company.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(providers.data ?? []).map((p) => {
            const ci = byKey.get(p.provider_key);
            return (
              <Card key={p.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{p.display_name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{p.category}</Badge>
                        <StatusPill ci={ci} />
                      </div>
                    </div>
                    <Switch
                      checked={ci?.is_enabled ?? false}
                      onCheckedChange={(v) => handleToggle(p, v)}
                    />
                  </div>
                  {p.description && (
                    <CardDescription className="pt-2">{p.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    {ci?.last_connected_at
                      ? <>Last connected {formatDistanceToNow(new Date(ci.last_connected_at), { addSuffix: true })}</>
                      : "Never connected"}
                  </div>
                  {ci?.last_connection_error && (
                    <div className="flex items-start gap-1.5 text-xs text-destructive">
                      <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>{ci.last_connection_error}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setConfigureOpen(p)}>
                      <Settings2 className="h-3.5 w-3.5 mr-1.5" /> Configure
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={testingKey === p.provider_key || !ci?.is_enabled}
                      onClick={() => handleTest(p)}
                    >
                      {testingKey === p.provider_key ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Test
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setActivityOpen(p)}>
                      <Activity className="h-3.5 w-3.5 mr-1.5" /> Activity
                    </Button>
                    {p.docs_url && (
                      <Button size="sm" variant="ghost" asChild>
                        <a href={p.docs_url} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Docs
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ConfigureSheet
        provider={configureOpen}
        integration={configureOpen ? byKey.get(configureOpen.provider_key) : undefined}
        onClose={() => setConfigureOpen(null)}
      />
      <ActivitySheet
        provider={activityOpen}
        onClose={() => setActivityOpen(null)}
      />
    </div>
  );
}

function ConfigureSheet({
  provider,
  integration,
  onClose,
}: {
  provider: IntegrationProvider | null;
  integration?: CompanyIntegration;
  onClose: () => void;
}) {
  const upsert = useUpsertCompanyIntegration();
  const fields = provider ? (PROVIDER_CREDENTIAL_FIELDS[provider.provider_key] ?? []) : [];
  const [ref, setRef] = useState("");

  if (!provider) return null;
  const currentRef = integration?.credentials_vault_ref ?? fields.map((f) => f.env).join(",");

  const save = async () => {
    try {
      await upsert.mutateAsync({
        provider_key: provider.provider_key,
        is_enabled: integration?.is_enabled ?? false,
        credentials_vault_ref: ref || currentRef,
        config: (integration?.config as Record<string, unknown>) ?? {},
      });
      toast({ title: "Saved" });
      onClose();
    } catch (e: unknown) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "Unknown", variant: "destructive" });
    }
  };

  return (
    <Sheet open={!!provider} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Configure {provider.display_name}</SheetTitle>
          <SheetDescription>
            Credentials are stored as references to secrets managed in your backend. Values themselves are never stored here.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-6">
          <div>
            <Label className="text-xs uppercase text-muted-foreground">Credentials referenced</Label>
            <ul className="mt-2 space-y-1 text-sm">
              {fields.map((f) => (
                <li key={f.env} className="flex justify-between border-b pb-1">
                  <span>{f.label}</span>
                  <code className="text-xs text-muted-foreground">{f.env}</code>
                </li>
              ))}
              {fields.length === 0 && (
                <li className="text-sm text-muted-foreground">No credentials required.</li>
              )}
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vault-ref">Credentials reference (comma-separated env var names)</Label>
            <Input
              id="vault-ref"
              value={ref}
              placeholder={currentRef}
              onChange={(e) => setRef(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to keep the current reference. Values are managed via your backend secrets store.
            </p>
          </div>

          {integration && (
            <div className="rounded-md bg-muted p-3 text-xs space-y-1">
              <div className="flex items-center gap-2">
                {integration.is_enabled ? <Power className="h-3 w-3 text-green-600" /> : <PowerOff className="h-3 w-3 text-muted-foreground" />}
                <span>{integration.is_enabled ? "Enabled" : "Disabled"}</span>
              </div>
              {integration.last_connected_at && (
                <div>Last connected {formatDistanceToNow(new Date(integration.last_connected_at), { addSuffix: true })}</div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={save} disabled={upsert.isPending}>
              {upsert.isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}Save
            </Button>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ActivitySheet({ provider, onClose }: { provider: IntegrationProvider | null; onClose: () => void }) {
  const events = useIntegrationEvents(provider?.provider_key, 50);
  if (!provider) return null;
  return (
    <Sheet open={!!provider} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{provider.display_name} activity</SheetTitle>
          <SheetDescription>Most recent {events.data?.length ?? 0} events for this integration.</SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)] mt-4 pr-4">
          {events.isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
          ) : (events.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">No events yet.</p>
          ) : (
            <ul className="space-y-2">
              {events.data!.map((e) => (
                <li key={e.id} className="rounded-md border p-3 text-sm">
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-medium">{e.event_type}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1 text-xs text-muted-foreground">
                    {e.direction && <Badge variant="outline" className="text-[10px]">{e.direction}</Badge>}
                    {e.entity_type && <span>{e.entity_type}</span>}
                    {e.latency_ms != null && <span>{e.latency_ms}ms</span>}
                    {e.success === true && <Badge className="bg-green-600 text-[10px]">ok</Badge>}
                    {e.success === false && <Badge variant="destructive" className="text-[10px]">error</Badge>}
                  </div>
                  {e.error_message && (
                    <div className="text-xs text-destructive mt-1">{e.error_message}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
