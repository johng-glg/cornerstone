import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIntegrationProviders, useCompanyIntegrations } from "@/hooks/useModules";
import { useSetIntegration } from "@/hooks/useModuleMutations";
import { useAuth } from "@/lib/auth";
import { QueryState } from "@/components/common/QueryState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { titleCase } from "@/lib/format";

// Maps a provider to its test-connection edge function (when one exists).
function testFnFor(providerKey: string): string | null {
  if (providerKey.includes("forth")) return "forth-test-connection";
  if (providerKey.includes("dialpad")) return "dialpad-test-connection";
  if (providerKey.includes("docuseal")) return "docuseal-test";
  return null;
}

// One-tap Dialpad webhook registration (replaces the manual curl). Uses the caller's session
// token via supabase.functions.invoke, so no token handling is needed.
function RegisterDialpadWebhookButton({ providerKey }: { providerKey: string }) {
  const [pending, setPending] = useState(false);
  if (!providerKey.includes("dialpad")) return null;
  const run = async () => {
    setPending(true);
    const { data, error } = await supabase.functions.invoke("dialpad-register-webhook", {
      body: {},
    });
    setPending(false);
    if (error) {
      toast.error(
        error.message.includes("not found") || error.message.includes("404")
          ? "Function not deployed yet — deploy edge functions first."
          : error.message,
      );
      return;
    }
    const d = data as { success?: boolean; error?: string; webhook_id?: string };
    if (d?.success === false) {
      toast.error(d.error ?? "Registration failed.");
      return;
    }
    toast.success(
      d?.webhook_id ? `Webhook registered (id ${d.webhook_id}).` : "Webhook registered.",
    );
  };
  return (
    <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={pending} onClick={run}>
      {pending ? "Registering…" : "Register webhook"}
    </Button>
  );
}

function TestButton({ providerKey }: { providerKey: string }) {
  const fn = testFnFor(providerKey);
  const [pending, setPending] = useState(false);
  if (!fn) return null;
  const run = async () => {
    setPending(true);
    const { data, error } = await supabase.functions.invoke(fn, { body: {} });
    setPending(false);
    if (error) {
      toast.error(
        error.message.includes("not found") || error.message.includes("404")
          ? "Function not deployed yet — see the edge-functions runbook."
          : error.message,
      );
      return;
    }
    if (data && (data as { success?: boolean }).success === false) {
      toast.error((data as { error?: string }).error ?? "Connection failed.");
      return;
    }
    toast.success("Connection OK.");
  };
  return (
    <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={pending} onClick={run}>
      {pending ? "Testing…" : "Test"}
    </Button>
  );
}

export default function Integrations() {
  const providers = useIntegrationProviders();
  const company = useCompanyIntegrations();
  const setIntegration = useSetIntegration();
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");

  const enabledMap = useMemo(
    () => Object.fromEntries((company.data ?? []).map((c) => [c.provider_key, c.is_enabled])),
    [company.data],
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          Enable connectors for your firm. Credential setup + live data arrive with the
          edge-function deployment.
        </p>
      </div>

      <QueryState
        isLoading={providers.isLoading}
        error={providers.error}
        isEmpty={(providers.data ?? []).length === 0}
        emptyMessage="No integration providers."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {(providers.data ?? []).map((p) => {
            const enabled = enabledMap[p.provider_key] ?? false;
            return (
              <Card key={p.id}>
                <CardContent className="flex items-start justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <p className="font-medium">{p.display_name}</p>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {titleCase(p.category)}
                    </p>
                    {p.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {enabled && isAdmin && (
                      <RegisterDialpadWebhookButton providerKey={p.provider_key} />
                    )}
                    {enabled && <TestButton providerKey={p.provider_key} />}
                    <label className="flex cursor-pointer items-center gap-2 text-xs">
                      <span className={enabled ? "text-green-700" : "text-muted-foreground"}>
                        {enabled ? "On" : "Off"}
                      </span>
                      <input
                        type="checkbox"
                        className="h-5 w-5"
                        checked={enabled}
                        disabled={!isAdmin || setIntegration.isPending}
                        onChange={(e) =>
                          setIntegration.mutate(
                            { providerKey: p.provider_key, enabled: e.target.checked },
                            {
                              onSuccess: () =>
                                toast.success(
                                  `${p.display_name} ${e.target.checked ? "enabled" : "disabled"}.`,
                                ),
                              onError: (err) => toast.error(err.message),
                            },
                          )
                        }
                      />
                    </label>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </QueryState>
      {!isAdmin && (
        <p className="text-xs text-muted-foreground">Only admins can change integrations.</p>
      )}
    </div>
  );
}
