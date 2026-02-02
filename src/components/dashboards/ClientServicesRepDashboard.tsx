import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { HeartHandshake, Users, AlertTriangle, MessageSquare, CheckSquare, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardMetricCard } from './DashboardMetricCard';
import { RecentActivityFeed, type Activity } from './RecentActivityFeed';
import { useClientServicesStats } from '@/hooks/useDashboardStats';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format, isPast } from 'date-fns';

export function ClientServicesRepDashboard() {
  const { staff } = useAuth();
  const { data: stats, isLoading: statsLoading } = useClientServicesStats();
  const { data: tasks, isLoading: tasksLoading } = useTasks();

  // Fetch at-risk services
  const { data: atRiskServices, isLoading: servicesLoading } = useQuery({
    queryKey: ['at_risk_services', staff?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_services')
        .select(`
          *,
          primary_client:clients!engagements_primary_contact_id_fkey(id, first_name, last_name)
        `)
        .eq('retention_flag', true)
        .order('retention_date', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!staff?.id,
  });

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
    if (!tasks || !staff) return [];
    
    return tasks
      .filter(t => t.assigned_to === staff.id || t.created_by === staff.id)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 10)
      .map((t): Activity => ({
        id: t.id,
        type: 'activity',
        message: `${t.title} - ${t.status}`,
        timestamp: t.updated_at,
        entityId: t.id,
        entityType: 'task',
      }));
  }, [tasks, staff]);

  const isLoading = statsLoading || tasksLoading || servicesLoading;

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
            <HeartHandshake className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Client Services Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Client engagement and retention
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/clients">
              <Users className="h-4 w-4 mr-2" />
              All Clients
            </Link>
          </Button>
          <Button asChild>
            <Link to="/services">
              <Briefcase className="h-4 w-4 mr-2" />
              Services
            </Link>
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardMetricCard
          title="Active Services"
          value={stats?.activeServices || 0}
          subtitle="Enrolled & active"
          icon={<Briefcase className="h-4 w-4" />}
          href="/services"
        />
        <DashboardMetricCard
          title="At Risk"
          value={stats?.atRiskServices || 0}
          subtitle="Services flagged for retention"
          icon={<AlertTriangle className="h-4 w-4" />}
          href="/services?retention=true"
          variant={(stats?.atRiskServices || 0) > 0 ? 'destructive' : 'default'}
        />
        <DashboardMetricCard
          title="Communications"
          value={stats?.communicationsThisWeek || 0}
          subtitle="This week"
          icon={<MessageSquare className="h-4 w-4" />}
        />
        <DashboardMetricCard
          title="My Tasks"
          value={stats?.followUpTasks || 0}
          subtitle="Pending"
          icon={<CheckSquare className="h-4 w-4" />}
          href="/tasks"
          variant={(stats?.followUpTasks || 0) > 10 ? 'warning' : 'default'}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* At Risk Services */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4" />
              At Risk Services
            </CardTitle>
            <CardDescription>Services requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            {!atRiskServices || atRiskServices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No at-risk services 🎉
              </p>
            ) : (
              <div className="space-y-3">
                {atRiskServices.map(service => {
                  const clientName = service.primary_client
                    ? `${service.primary_client.first_name} ${service.primary_client.last_name}`
                    : 'Unknown';
                  return (
                    <div
                      key={service.id}
                      className="flex items-start justify-between p-3 rounded-lg bg-destructive/5 border-l-4 border-l-destructive"
                    >
                      <div>
                        <p className="font-medium text-sm">{clientName}</p>
                        <p className="text-xs text-muted-foreground">
                          {service.service_number}
                        </p>
                        {service.retention_reason && (
                          <p className="text-xs text-destructive mt-1">
                            {service.retention_reason}
                          </p>
                        )}
                      </div>
                      <Badge variant="destructive">
                        {service.retention_type || 'At Risk'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link to="/services">View All Services</Link>
            </Button>
          </CardContent>
        </Card>

        {/* My Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckSquare className="h-4 w-4" />
              My Tasks
            </CardTitle>
            <CardDescription>Tasks assigned to you</CardDescription>
          </CardHeader>
          <CardContent>
            {myTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No pending tasks
              </p>
            ) : (
              <div className="space-y-3">
                {myTasks.map(task => {
                  const isOverdue = task.due_date && isPast(new Date(task.due_date));
                  return (
                    <div
                      key={task.id}
                      className={`flex items-start justify-between p-3 rounded-lg ${
                        isOverdue ? 'bg-destructive/5 border-l-4 border-l-destructive' : 'bg-muted/50'
                      }`}
                    >
                      <div>
                        <p className="font-medium text-sm">{task.title}</p>
                        {task.due_date && (
                          <p className={`text-xs mt-1 ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {isOverdue ? 'Overdue: ' : 'Due: '}{format(new Date(task.due_date), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                      <Badge variant={task.priority === 'urgent' ? 'destructive' : 'secondary'}>
                        {task.priority}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link to="/tasks">View All Tasks</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Activity */}
      <div className="grid gap-6 lg:grid-cols-1">
        <RecentActivityFeed
          title="My Recent Activity"
          description="Your latest task updates"
          activities={recentActivities}
          viewAllHref="/tasks"
          emptyMessage="No recent activity"
        />
      </div>
    </div>
  );
}
