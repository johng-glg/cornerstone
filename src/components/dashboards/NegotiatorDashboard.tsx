import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Handshake, DollarSign, Clock, AlertTriangle, CheckSquare, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardMetricCard } from './DashboardMetricCard';
import { RecentActivityFeed, type Activity } from './RecentActivityFeed';
import { useNegotiatorStats } from '@/hooks/useDashboardStats';
import { useLiabilities } from '@/hooks/useLiabilities';
import { useSettlements } from '@/hooks/useSettlements';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/lib/auth';
import { format, isPast } from 'date-fns';

export function NegotiatorDashboard() {
  const { staff } = useAuth();
  const { data: stats, isLoading: statsLoading } = useNegotiatorStats();
  const { data: liabilitiesResult, isLoading: liabilitiesLoading } = useLiabilities();
  const { data: settlements, isLoading: settlementsLoading } = useSettlements();
  const { data: tasks, isLoading: tasksLoading } = useTasks();

  const liabilities = liabilitiesResult?.data;

  // Liabilities in negotiation
  const inNegotiationLiabilities = useMemo(() => {
    if (!liabilities) return [];
    return liabilities.filter(l => l.status === 'in_negotiation').slice(0, 5);
  }, [liabilities]);

  // Ready for negotiation (enrolled, no active settlement)
  const readyForNegotiation = useMemo(() => {
    if (!liabilities || !settlements) return [];
    const liabilityIdsWithSettlements = new Set(
      settlements
        .filter(s => s.status === 'offered' || s.status === 'accepted')
        .map(s => s.liability_id)
    );
    return liabilities
      .filter(l => l.status === 'enrolled' && !liabilityIdsWithSettlements.has(l.id))
      .slice(0, 5);
  }, [liabilities, settlements]);

  // Pending settlements (offered)
  const pendingSettlements = useMemo(() => {
    if (!settlements) return [];
    return settlements.filter(s => s.status === 'offered').slice(0, 5);
  }, [settlements]);

  // Awaiting approval
  const awaitingApproval = useMemo(() => {
    if (!settlements) return [];
    return settlements.filter(s => s.status === 'accepted' && !s.attorney_approved).slice(0, 5);
  }, [settlements]);

  // My tasks
  const myTasks = useMemo(() => {
    if (!tasks || !staff) return [];
    return tasks.filter(t => 
      t.assigned_to === staff.id && 
      t.status !== 'completed' && 
      t.status !== 'cancelled'
    ).slice(0, 5);
  }, [tasks, staff]);

  // Build recent activity
  const recentActivities = useMemo(() => {
    const activities: Activity[] = [];
    
    settlements?.slice(0, 5).forEach(settlement => {
      activities.push({
        id: settlement.id,
        type: 'settlement',
        message: `Settlement ${settlement.status}: $${settlement.offer_amount.toLocaleString()}`,
        timestamp: settlement.updated_at,
        entityId: settlement.id,
        entityType: 'settlement',
      });
    });
    
    return activities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [settlements]);

  const isLoading = statsLoading || liabilitiesLoading || settlementsLoading || tasksLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Handshake className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Negotiator Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Settlement workflow and liability management
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/liabilities">
              <DollarSign className="h-4 w-4 mr-2" />
              All Liabilities
            </Link>
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardMetricCard
          title="In Negotiation"
          value={stats?.inNegotiation || 0}
          subtitle="Active negotiations"
          icon={<Handshake className="h-4 w-4" />}
          href="/liabilities?status=in_negotiation"
        />
        <DashboardMetricCard
          title="Pending Settlements"
          value={stats?.pendingSettlements || 0}
          subtitle="Offers awaiting response"
          icon={<Clock className="h-4 w-4" />}
          variant={(stats?.pendingSettlements || 0) > 5 ? 'warning' : 'default'}
        />
        <DashboardMetricCard
          title="Awaiting Approval"
          value={stats?.awaitingApproval || 0}
          subtitle="Need attorney sign-off"
          icon={<AlertTriangle className="h-4 w-4" />}
          variant={(stats?.awaitingApproval || 0) > 0 ? 'warning' : 'default'}
        />
        <DashboardMetricCard
          title="Settlement Value"
          value={`$${((stats?.settlementValueThisMonth || 0) / 1000).toFixed(0)}k`}
          subtitle="This month"
          icon={<TrendingUp className="h-4 w-4" />}
          variant={(stats?.settlementValueThisMonth || 0) > 0 ? 'success' : 'default'}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Liabilities in Negotiation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Handshake className="h-4 w-4" />
              In Negotiation
            </CardTitle>
            <CardDescription>Active negotiations</CardDescription>
          </CardHeader>
          <CardContent>
            {inNegotiationLiabilities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No liabilities currently in negotiation
              </p>
            ) : (
              <div className="space-y-3">
                {inNegotiationLiabilities.map(liability => (
                  <div
                    key={liability.id}
                    className="flex items-start justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {liability.original_creditor?.name || liability.current_creditor?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Balance: ${(liability.current_balance || 0).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="default">In Negotiation</Badge>
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link to="/liabilities?status=in_negotiation">View All</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Ready for Negotiation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4" />
              Ready for Negotiation
            </CardTitle>
            <CardDescription>Enrolled without active offers</CardDescription>
          </CardHeader>
          <CardContent>
            {readyForNegotiation.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No liabilities ready for negotiation
              </p>
            ) : (
              <div className="space-y-3">
                {readyForNegotiation.map(liability => (
                  <div
                    key={liability.id}
                    className="flex items-start justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {liability.original_creditor?.name || liability.current_creditor?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Enrolled: ${(liability.enrolled_balance || 0).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="secondary">Ready</Badge>
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link to="/liabilities?status=enrolled">View All</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Settlements and Tasks */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Settlements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Pending Settlements
            </CardTitle>
            <CardDescription>Offers awaiting response</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingSettlements.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No pending settlements
              </p>
            ) : (
              <div className="space-y-3">
                {pendingSettlements.map(settlement => (
                  <div
                    key={settlement.id}
                    className="flex items-start justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        ${settlement.offer_amount.toLocaleString()} ({settlement.offer_percentage || 0}%)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Offered: {format(new Date(settlement.offered_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Badge variant="outline">{settlement.payment_type}</Badge>
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link to="/liabilities">View All</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <RecentActivityFeed
          title="Recent Settlement Activity"
          description="Latest settlement updates"
          activities={recentActivities}
          viewAllHref="/liabilities"
          emptyMessage="No recent activity"
        />
      </div>
    </div>
  );
}
