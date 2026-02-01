import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase, TrendingUp, Clock, CheckCircle, ChevronRight, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ServiceSummaryCard } from './ServiceSummaryCard';
import { useClientServicesForClient, useLiabilitiesForClient, useTasksForClient, type ClientActivitySummary } from '@/hooks/useClientData';

interface ClientOverviewTabProps {
  clientId: string;
  onViewServices: () => void;
  onViewTasks: () => void;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

export function ClientOverviewTab({ clientId, onViewServices, onViewTasks }: ClientOverviewTabProps) {
  const { data: services, isLoading: servicesLoading } = useClientServicesForClient(clientId);
  const { data: liabilities, isLoading: liabilitiesLoading } = useLiabilitiesForClient(clientId);
  const { data: tasks, isLoading: tasksLoading } = useTasksForClient(clientId);

  const isLoading = servicesLoading || liabilitiesLoading || tasksLoading;

  // Calculate summary stats
  const activeServices = services?.filter(s => s.status === 'active') || [];
  const totalEnrolledDebt = services?.reduce((sum, s) => sum + (s.total_enrolled_debt || 0), 0) || 0;
  const settledLiabilities = liabilities?.filter(l => l.status === 'settled') || [];
  const totalSettledAmount = settledLiabilities.reduce((sum, l) => sum + (l.enrolled_balance || 0), 0);
  const settlementPercentage = totalEnrolledDebt > 0 
    ? Math.round((totalSettledAmount / totalEnrolledDebt) * 100) 
    : 0;

  // Liabilities by status
  const liabilitiesByStatus: Record<string, number> = {};
  liabilities?.forEach(l => {
    liabilitiesByStatus[l.status] = (liabilitiesByStatus[l.status] || 0) + 1;
  });

  // Upcoming tasks
  const upcomingTasks = tasks
    ?.filter(t => t.status !== 'completed' && t.status !== 'cancelled')
    .slice(0, 3) || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{services?.length || 0}</p>
                <p className="text-xs text-muted-foreground">
                  {activeServices.length} active
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totalEnrolledDebt)}</p>
                <p className="text-xs text-muted-foreground">Total Enrolled</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totalSettledAmount)}</p>
                <p className="text-xs text-muted-foreground">{settlementPercentage}% Settled</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{liabilities?.length || 0}</p>
                <p className="text-xs text-muted-foreground">
                  {liabilitiesByStatus['in_negotiation'] || 0} in negotiation
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Services Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Services ({services?.length || 0})
          </CardTitle>
          {services && services.length > 2 && (
            <Button variant="ghost" size="sm" onClick={onViewServices}>
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {services && services.length > 0 ? (
            services.slice(0, 3).map((service) => (
              <ServiceSummaryCard 
                key={service.id} 
                service={service}
                onClick={onViewServices}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No services yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Two Column: Liabilities Summary + Upcoming */}
      <div className="grid grid-cols-2 gap-6">
        {/* Liabilities Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Liabilities Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {liabilities && liabilities.length > 0 ? (
              <div className="space-y-2">
                {Object.entries(liabilitiesByStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{status.replace('_', ' ')}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No liabilities enrolled
              </p>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Upcoming Tasks</CardTitle>
            {tasks && tasks.length > 3 && (
              <Button variant="ghost" size="sm" onClick={onViewTasks}>
                View All
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {upcomingTasks.length > 0 ? (
              <div className="space-y-3">
                {upcomingTasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{task.title}</p>
                      {task.due_date && (
                        <p className="text-xs text-muted-foreground">
                          Due: {format(new Date(task.due_date), 'MMM d')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No upcoming tasks
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
