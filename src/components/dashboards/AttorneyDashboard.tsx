import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Scale, Gavel, Clock, AlertTriangle, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardMetricCard } from './DashboardMetricCard';
import { DeadlinesList, type Deadline } from './DeadlinesList';
import { RecentActivityFeed, type Activity } from './RecentActivityFeed';
import { useAssignedMatters, useAssignedMatterCounts, useStaffHearings } from '@/hooks/useAssignedMatters';
import { useLitigationActivities } from '@/hooks/useLitigationActivities';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/lib/auth';
import { format, addDays, isPast } from 'date-fns';

const statusLabels: Record<string, string> = {
  new: 'New',
  pre_response: 'Pre-Response',
  post_response: 'Post-Response',
  settled: 'Settled',
  dropped: 'Dropped',
  judgment: 'Judgment',
  declined: 'Declined',
  dismissed: 'Dismissed',
};

export function AttorneyDashboard() {
  const { staff } = useAuth();
  const { data: matters, isLoading: mattersLoading } = useAssignedMatters('litigation_attorney');
  const counts = useAssignedMatterCounts('litigation_attorney');
  const { data: hearings, isLoading: hearingsLoading } = useStaffHearings();
  const { data: tasks, isLoading: tasksLoading } = useTasks();

  // Filter tasks assigned to current staff, due within 14 days
  const myTasks = useMemo(() => {
    if (!tasks || !staff) return [];
    return tasks.filter(t => 
      t.assigned_to === staff.id && 
      t.status !== 'completed' && 
      t.status !== 'cancelled'
    ).slice(0, 5);
  }, [tasks, staff]);

  // Build deadlines list from response deadlines and hearings
  const deadlines = useMemo(() => {
    const items: Deadline[] = [];

    // Add response deadlines from matters
    matters?.forEach(matter => {
      if (matter.response_deadline) {
        const clientName = matter.client_service?.primary_client
          ? `${matter.client_service.primary_client.first_name} ${matter.client_service.primary_client.last_name}`
          : 'Unknown';
        items.push({
          id: `response-${matter.id}`,
          title: 'Response Deadline',
          subtitle: `${clientName} vs ${matter.opposing_party || 'Unknown'}`,
          date: matter.response_deadline,
          type: 'response',
          entityId: matter.id,
          entityType: 'litigation_matter',
        });
      }
    });

    // Add hearings
    hearings?.forEach(hearing => {
      const clientName = hearing.litigation_matter?.client_service?.primary_client
        ? `${hearing.litigation_matter.client_service.primary_client.first_name} ${hearing.litigation_matter.client_service.primary_client.last_name}`
        : 'Unknown';
      items.push({
        id: `hearing-${hearing.id}`,
        title: hearing.hearing_type,
        subtitle: `${clientName} vs ${hearing.litigation_matter?.opposing_party || 'Unknown'}`,
        date: hearing.scheduled_date,
        type: 'hearing',
        entityId: hearing.matter_id,
        entityType: 'litigation_matter',
      });
    });

    return items;
  }, [matters, hearings]);

  // Get matters needing action (missing outcomes on past hearings, pre-response with passed deadline)
  const mattersNeedingAction = useMemo(() => {
    if (!matters) return [];
    return matters.filter(m => {
      // Pre-response with passed deadline
      if (m.status === 'pre_response' && m.response_deadline && isPast(new Date(m.response_deadline))) {
        return true;
      }
      return false;
    });
  }, [matters]);

  // Build recent activity feed
  const recentActivities = useMemo(() => {
    const activities: Activity[] = [];
    
    // We'd need to fetch activities for assigned matters
    // For now, show matter status info
    matters?.slice(0, 5).forEach(matter => {
      const clientName = matter.client_service?.primary_client
        ? `${matter.client_service.primary_client.first_name} ${matter.client_service.primary_client.last_name}`
        : 'Unknown';
      activities.push({
        id: matter.id,
        type: 'status_change',
        message: `${clientName} vs ${matter.opposing_party || 'Unknown'} - ${statusLabels[matter.status] || matter.status}`,
        timestamp: matter.updated_at,
      });
    });

    return activities;
  }, [matters]);

  const isLoading = mattersLoading || hearingsLoading || tasksLoading;

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
            <Gavel className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Attorney Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Your caseload and upcoming deadlines
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/litigation/calendar">
              <Clock className="h-4 w-4 mr-2" />
              Court Calendar
            </Link>
          </Button>
          <Button asChild>
            <Link to="/litigation">
              <Scale className="h-4 w-4 mr-2" />
              All Matters
            </Link>
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardMetricCard
          title="Active Cases"
          value={counts.total - counts.settled - counts.dropped - counts.dismissed - counts.declined}
          subtitle={`${counts.pre_response} pre-response`}
          icon={<Scale className="h-4 w-4" />}
          href="/litigation"
          variant={counts.pre_response > 0 ? 'warning' : 'default'}
        />
        <DashboardMetricCard
          title="Pre-Response"
          value={counts.pre_response}
          subtitle="Require immediate attention"
          icon={<AlertTriangle className="h-4 w-4" />}
          href="/litigation?status=pre_response"
          variant={counts.pre_response > 0 ? 'destructive' : 'default'}
        />
        <DashboardMetricCard
          title="Deadlines (14 days)"
          value={deadlines.filter(d => {
            const daysUntil = Math.ceil((new Date(d.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return daysUntil <= 14 && daysUntil >= 0;
          }).length}
          subtitle="Court dates & responses"
          icon={<Clock className="h-4 w-4" />}
          href="/litigation/calendar"
        />
        <DashboardMetricCard
          title="Pending Tasks"
          value={myTasks.length}
          subtitle="Assigned to you"
          icon={<CheckSquare className="h-4 w-4" />}
          href="/tasks"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Deadlines */}
        <DeadlinesList
          title="Upcoming Deadlines"
          description="Next 14 days"
          deadlines={deadlines}
          viewAllHref="/litigation/calendar"
          maxItems={6}
        />

        {/* Cases Needing Action */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4" />
              Cases Requiring Action
            </CardTitle>
            <CardDescription>Matters needing your attention</CardDescription>
          </CardHeader>
          <CardContent>
            {mattersNeedingAction.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No cases require immediate action
              </p>
            ) : (
              <div className="space-y-3">
                {mattersNeedingAction.slice(0, 5).map(matter => {
                  const clientName = matter.client_service?.primary_client
                    ? `${matter.client_service.primary_client.first_name} ${matter.client_service.primary_client.last_name}`
                    : 'Unknown';
                  return (
                    <div
                      key={matter.id}
                      className="flex items-start justify-between p-3 rounded-lg bg-destructive/5 border-l-4 border-l-destructive"
                    >
                      <div>
                        <p className="font-medium text-sm">{clientName}</p>
                        <p className="text-xs text-muted-foreground">
                          vs {matter.opposing_party || 'Unknown'} • {matter.case_number || 'No case #'}
                        </p>
                        <p className="text-xs text-destructive mt-1">
                          Response overdue: {matter.response_deadline && format(new Date(matter.response_deadline), 'MMM d')}
                        </p>
                      </div>
                      <Badge variant="destructive">Overdue</Badge>
                    </div>
                  );
                })}
              </div>
            )}
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link to="/litigation">View All Matters</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Tasks and Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
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
                {myTasks.map(task => (
                  <div
                    key={task.id}
                    className="flex items-start justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium text-sm">{task.title}</p>
                      {task.due_date && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Due: {format(new Date(task.due_date), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                    <Badge variant={task.priority === 'urgent' ? 'destructive' : 'secondary'}>
                      {task.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link to="/tasks">View All Tasks</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <RecentActivityFeed
          title="Recent Case Activity"
          description="Latest updates on your cases"
          activities={recentActivities}
          viewAllHref="/litigation"
          emptyMessage="No recent activity"
        />
      </div>
    </div>
  );
}
