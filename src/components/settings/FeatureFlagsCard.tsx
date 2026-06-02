import { useMemo } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  useFeatureFlagCatalog,
  useTenantFeatureFlags,
  useSetTenantFeatureFlag,
} from "@/hooks/useTenantAdmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QueryState } from "@/components/common/QueryState";
import { titleCase } from "@/lib/format";

export function FeatureFlagsCard() {
  const { staff, roles } = useAuth();
  const companyId = staff?.company_id ?? "";
  const catalog = useFeatureFlagCatalog();
  const overrides = useTenantFeatureFlags(companyId);
  const setFlag = useSetTenantFeatureFlag();

  const overrideMap = useMemo(
    () => Object.fromEntries((overrides.data ?? []).map((o) => [o.flag_key, o.enabled])),
    [overrides.data],
  );

  const isAdmin = roles.includes("admin");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Feature Flags</CardTitle>
        <CardDescription>
          Toggle optional modules for your firm. {!isAdmin && "Only admins can change these."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <QueryState
          isLoading={catalog.isLoading}
          error={catalog.error}
          isEmpty={(catalog.data ?? []).length === 0}
          emptyMessage="No feature flags defined."
        >
          <ul className="divide-y">
            {(catalog.data ?? []).map((f) => {
              const effective = overrideMap[f.flag_key] ?? f.default_enabled;
              return (
                <li key={f.flag_key} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{f.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.description} · <span className="uppercase">{titleCase(f.category)}</span>
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-5 w-5 shrink-0"
                    checked={effective}
                    disabled={!isAdmin || setFlag.isPending}
                    onChange={(e) =>
                      setFlag.mutate(
                        { companyId, flagKey: f.flag_key, enabled: e.target.checked },
                        {
                          onSuccess: () =>
                            toast.success(
                              `${f.label} ${e.target.checked ? "enabled" : "disabled"}.`,
                            ),
                          onError: (err) => toast.error(err.message),
                        },
                      )
                    }
                  />
                </li>
              );
            })}
          </ul>
        </QueryState>
      </CardContent>
    </Card>
  );
}
