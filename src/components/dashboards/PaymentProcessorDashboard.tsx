import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, DollarSign, Clock, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardMetricCard } from './DashboardMetricCard';
import { RecentActivityFeed, type Activity } from './RecentActivityFeed';
import { usePaymentProcessorStats } from '@/hooks/useDashboardStats';
import { useTransactions } from '@/hooks/useTransactions';
import { useScheduledTransactions } from '@/hooks/useScheduledTransactions';
import { format } from 'date-fns';

export function PaymentProcessorDashboard() {
  const { data: stats, isLoading: statsLoading } = usePaymentProcessorStats();
  const { data: transactionsResult, isLoading: transactionsLoading } = useTransactions();
  const { data: scheduledTransactions, isLoading: scheduledLoading } = useScheduledTransactions(undefined);

  const today = format(new Date(), 'yyyy-MM-dd');

  // Transactions due today
  const dueToday = useMemo(() => {
    if (!scheduledTransactions) return [];
    return scheduledTransactions
      .filter(t => t.scheduled_date === today && t.status === 'open')
      .slice(0, 5);
  }, [scheduledTransactions, today]);

  // Recently cleared
  const recentlyCleared = useMemo(() => {
    if (!transactionsResult?.data) return [];
    return transactionsResult.data
      .filter(t => t.status === 'cleared')
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5);
  }, [transactionsResult]);

  // Failed transactions
  const failedTransactions = useMemo(() => {
    if (!transactionsResult?.data) return [];
    return transactionsResult.data
      .filter(t => t.status === 'cancelled')
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5);
  }, [transactionsResult]);

  // Build recent activity
  const recentActivities = useMemo(() => {
    if (!transactionsResult?.data) return [];
    
    return transactionsResult.data
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 10)
      .map((t): Activity => ({
        id: t.id,
        type: t.status === 'cleared' ? 'settlement' : 'activity',
        message: `${t.transaction_type} - $${t.amount.toLocaleString()} (${t.status})`,
        timestamp: t.updated_at,
        entityId: t.id,
        entityType: 'transaction',
      }));
  }, [transactionsResult]);

  const isLoading = statsLoading || transactionsLoading || scheduledLoading;

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
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Payment Processor Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Transaction processing and payment status
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/payments">
              <DollarSign className="h-4 w-4 mr-2" />
              All Payments
            </Link>
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardMetricCard
          title="Due Today"
          value={stats?.dueToday || 0}
          subtitle="Transactions to process"
          icon={<Clock className="h-4 w-4" />}
          href="/payments"
          variant={(stats?.dueToday || 0) > 10 ? 'warning' : 'default'}
        />
        <DashboardMetricCard
          title="Pending"
          value={stats?.pendingTransactions || 0}
          subtitle="Awaiting clearing"
          icon={<CreditCard className="h-4 w-4" />}
          href="/payments"
        />
        <DashboardMetricCard
          title="Cleared This Month"
          value={`$${((stats?.clearedVolume || 0) / 1000).toFixed(0)}k`}
          subtitle="Total volume"
          icon={<TrendingUp className="h-4 w-4" />}
          variant={(stats?.clearedVolume || 0) > 0 ? 'success' : 'default'}
        />
        <DashboardMetricCard
          title="Failed (This Week)"
          value={stats?.failedTransactions || 0}
          subtitle="NSF / Returned"
          icon={<AlertTriangle className="h-4 w-4" />}
          variant={(stats?.failedTransactions || 0) > 0 ? 'destructive' : 'default'}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Due Today */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Due Today
            </CardTitle>
            <CardDescription>Transactions scheduled for today</CardDescription>
          </CardHeader>
          <CardContent>
            {dueToday.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No transactions due today
              </p>
            ) : (
              <div className="space-y-3">
                {dueToday.map(transaction => (
                  <div
                    key={transaction.id}
                    className="flex items-start justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        ${transaction.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {transaction.transaction_type} • {transaction.client_service?.service_number || 'Unknown'}
                      </p>
                    </div>
                    <Badge variant="outline">{transaction.status}</Badge>
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link to="/payments">View All</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recently Cleared */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4" />
              Recently Cleared
            </CardTitle>
            <CardDescription>Successfully processed transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {recentlyCleared.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recently cleared transactions
              </p>
            ) : (
              <div className="space-y-3">
                {recentlyCleared.map(transaction => (
                  <div
                    key={transaction.id}
                    className="flex items-start justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        ${transaction.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Cleared: {format(new Date(transaction.updated_at), 'MMM d')}
                      </p>
                    </div>
                    <Badge variant="secondary">Cleared</Badge>
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link to="/payments">View All</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Failed and Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Failed Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4" />
              Failed Transactions
            </CardTitle>
            <CardDescription>Require attention</CardDescription>
          </CardHeader>
          <CardContent>
            {failedTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No failed transactions 🎉
              </p>
            ) : (
              <div className="space-y-3">
                {failedTransactions.map(transaction => (
                  <div
                    key={transaction.id}
                    className="flex items-start justify-between p-3 rounded-lg bg-destructive/5 border-l-4 border-l-destructive"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        ${transaction.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {transaction.description || 'No details'}
                      </p>
                    </div>
                    <Badge variant="destructive">Failed</Badge>
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link to="/payments">View All</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <RecentActivityFeed
          title="Recent Transaction Activity"
          description="Latest payment updates"
          activities={recentActivities}
          viewAllHref="/payments"
          emptyMessage="No recent activity"
        />
      </div>
    </div>
  );
}
