import { useMyPoolMembership, useToggleAvailability } from '@/hooks/useAssignmentPool';
import { useAuth } from '@/lib/auth';
import { useLeads } from '@/hooks/useLeads';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { UserCheck } from 'lucide-react';
import { useMemo } from 'react';

export function AvailabilityToggle() {
  const { staff } = useAuth();
  const { data: membership, isLoading: membershipLoading } = useMyPoolMembership();
  const toggleAvailability = useToggleAvailability();
  const { data: leadsResult, isLoading: leadsLoading } = useLeads();

  // Count active leads assigned to me
  const myActiveLeadCount = useMemo(() => {
    if (!leadsResult?.data || !staff) return 0;
    return leadsResult.data.filter(
      l => l.assigned_to === staff.id && l.status !== 'converted' && l.status !== 'lost'
    ).length;
  }, [leadsResult, staff]);

  const maxLeads = membership?.max_active_leads || 25;
  const progressPercent = Math.min((myActiveLeadCount / maxLeads) * 100, 100);

  if (membershipLoading || leadsLoading) {
    return <Skeleton className="h-40" />;
  }

  // If not in any pool, don't show the toggle
  if (!membership) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <UserCheck className="h-4 w-4" />
          My Availability
        </CardTitle>
        <CardDescription>Lead assignment status</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="availability" className="cursor-pointer">
            Available for new leads
          </Label>
          <Switch
            id="availability"
            checked={membership.is_available}
            onCheckedChange={(checked) => toggleAvailability.mutate({
              poolId: membership.id,
              available: checked,
            })}
            disabled={toggleAvailability.isPending}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Active Leads</span>
            <span className="font-medium">{myActiveLeadCount} / {maxLeads}</span>
          </div>
          <Progress 
            value={progressPercent} 
            className={progressPercent >= 90 ? '[&>div]:bg-destructive' : progressPercent >= 70 ? '[&>div]:bg-yellow-500' : ''}
          />
          {progressPercent >= 90 && (
            <p className="text-xs text-destructive">
              Near capacity - new leads may be assigned to others
            </p>
          )}
        </div>

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Total assignments: <span className="font-medium">{membership.assignment_count}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
