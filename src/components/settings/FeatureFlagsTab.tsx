import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth';
import {
  FEATURE_FLAG_REGISTRY,
  useTenantFeatureFlags,
  useSetFeatureFlag,
} from '@/hooks/useFeatureFlags';

export function FeatureFlagsTab() {
  const { isAdmin } = useAuth();
  const { data: flags, isLoading } = useTenantFeatureFlags();
  const setFlag = useSetFeatureFlag();

  const isOn = (key: string) => {
    const row = flags?.find((f) => f.flag_key === key);
    if (row) return row.enabled;
    return FEATURE_FLAG_REGISTRY.find((f) => f.key === key)?.defaultEnabled ?? false;
  };

  if (!isAdmin()) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Only admins can manage feature flags.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feature Flags</CardTitle>
        <CardDescription>
          Per-tenant toggles. Changes take effect immediately for all users in this company.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </>
        ) : (
          FEATURE_FLAG_REGISTRY.map((flag) => (
            <div
              key={flag.key}
              className="flex items-start justify-between gap-4 rounded-md border p-4"
            >
              <div className="space-y-1">
                <Label htmlFor={flag.key} className="font-medium">
                  {flag.label}
                </Label>
                <p className="text-sm text-muted-foreground">{flag.description}</p>
                <code className="text-xs text-muted-foreground">{flag.key}</code>
              </div>
              <Switch
                id={flag.key}
                checked={isOn(flag.key)}
                disabled={setFlag.isPending}
                onCheckedChange={(checked) =>
                  setFlag.mutate({
                    flagKey: flag.key,
                    enabled: checked,
                    description: flag.description,
                  })
                }
              />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
