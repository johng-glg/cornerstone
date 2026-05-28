import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { GraduationCap } from 'lucide-react';
import { useGraduationConfig, useUpsertGraduationConfig } from '@/hooks/useGraduationConfig';

export function GraduationAutomationSettings() {
  const { data: config, isLoading } = useGraduationConfig();
  const upsert = useUpsertGraduationConfig();

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  const enabled = config?.enabled ?? false;
  const requireAll = config?.require_all_liabilities_resolved ?? true;
  const closeContact = config?.fire_contact_close ?? true;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" /> Service Graduation Automation
        </CardTitle>
        <CardDescription>
          Automatically transition a client service to <strong>graduated</strong> when its liabilities are all
          resolved. Optionally close the PLSA contact and send a graduation notification.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <Label className="font-medium">Enable auto-graduation</Label>
            <p className="text-sm text-muted-foreground">
              When a liability flips to a terminal state, the service is checked for graduation eligibility.
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={(v) => upsert.mutate({ enabled: v })} />
        </div>

        <div className="flex items-center justify-between rounded-md border p-3 opacity-100">
          <div>
            <Label className="font-medium">Require ALL liabilities resolved</Label>
            <p className="text-sm text-muted-foreground">
              Resolved = <code>settled</code>, <code>dismissed</code>, or <code>cancelled</code>.
            </p>
          </div>
          <Switch
            checked={requireAll}
            onCheckedChange={(v) => upsert.mutate({ require_all_liabilities_resolved: v })}
            disabled={!enabled}
          />
        </div>

        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <Label className="font-medium">Close PLSA contact on graduation</Label>
            <p className="text-sm text-muted-foreground">
              Fires <code>plsa-routing</code> → <code>close_account</code> for the assigned processor.
            </p>
          </div>
          <Switch
            checked={closeContact}
            onCheckedChange={(v) => upsert.mutate({ fire_contact_close: v })}
            disabled={!enabled}
          />
        </div>
      </CardContent>
    </Card>
  );
}
