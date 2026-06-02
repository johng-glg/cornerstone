import { useMemo } from "react";
import { toast } from "sonner";
import { useIntegrationProviders, useCompanyIntegrations } from "@/hooks/useModules";
import { useSetIntegration } from "@/hooks/useModuleMutations";
import { useAuth } from "@/lib/auth";
import { QueryState } from "@/components/common/QueryState";
import { Card, CardContent } from "@/components/ui/card";
import { titleCase } from "@/lib/format";

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
                  <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs">
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
