import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen, Clock, CheckSquare, FileText, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardMetricCard } from './DashboardMetricCard';
import { DeadlinesList, type Deadline } from './DeadlinesList';
import { RecentActivityFeed, type Activity } from './RecentActivityFeed';
import { useAssignedMatters, useAssignedMatterCounts, useStaffHearings } from '@/hooks/useAssignedMatters';
import { useTasks } from '@/hooks/useTasks';
import { useLitigationDocuments } from '@/hooks/useLitigationDocuments';
import { useAuth } from '@/lib/auth';
import { format, addDays, isPast, isFuture } from 'date-fns';

export function CaseManagerDashboard() {
  const { staff } = useAuth();
  const { data: matters, isLoading: mattersLoading } = useAssignedMatters('case_manager');
  const counts = useAssignedMatterCounts('case_manager');
  const { data: hearings, isLoading: hearingsLoading } = useStaffHearings();
  const { data: tasks, isLoading: tasksLoading } = useTasks();

  // Filter tasks assigned to current staff, due within 7 days
  const myTasks = useMemo(() => {
    if (!tasks || !staff) return [];
    const sevenDaysFromNow = addDays(new Date(), 7);
    return tasks.filter(t => 
      t.assigned_to === staff.id && 
      t.status !== 'completed' && 
      t.status !== 'cancelled' &&
      (!t.due_date || new Date(t.due_date) <= sevenDaysFromNow)
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

      if (matter.next_hearing_date) {
        const clientName = matter.client_service?.primary_client
          ? `${matter.client_service.primary_client.first_name} ${matter.client_service.primary_client.last_name}`
          : 'Unknown';
        items.push({
          id: `next-hearing-${matter.id}`,
          title: 'Next Hearing',
          subtitle: `${clientName} vs ${matter.opposing_party || 'Unknown'}`,
          date: matter.next_hearing_date,
          type: 'hearing',
          entityId: matter.id,
          entityType: 'litigation_matter',
        });
      }
    });

    return items;
  }, [matters]);

  // Calculate document prep needs (matters without recent documents)
  const documentPrepCount = useMemo(() => {
    // For now, show count of active matters - in production would check for missing docs
    return matters?.filter(m => 
      m.status === 'pre_response' || m.status === 'post_response'
    ).length || 0;
  }, [matters]);

  // Build recent activity feed from matter updates
  const recentActivities = useMemo(() => {
    const activities: Activity[] = [];
    
    matters?.slice(0, 5).forEach(matter => {
      const clientName = matter.client_service?.primary_client
        ? `${matter.client_service.primary_client.first_name} ${matter.client_service.primary_client.last_name}`
        : 'Unknown';
      activities.push({
        id: matter.id,
        type: 'activity',
        message: `${clientName} - Case updated`,
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
            <FolderOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Case Manager Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Your assigned cases and tasks
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
            <Link to="/tasks">
              <CheckSquare className="h-4 w-4 mr-2" />
              All Tasks
            </Link>
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardMetricCard
          title="Assigned Cases"
          value={counts.total}
          subtitle={`${counts.pre_response + counts.post_response} active`}
          icon={<FolderOpen className="h-4 w-4" />}
          href="/litigation"
        />
        <DashboardMetricCard
          title="My Tasks (7 days)"
          value={myTasks.length}
          subtitle="Due this week"
          icon={<CheckSquare className="h-4 w-4" />}
          href="/tasks"
          variant={myTasks.length > 5 ? 'warning' : 'default'}
        />
        <DashboardMetricCard
          title="Upcoming Deadlines"
          value={deadlines.filter(d => {
            const daysUntil = Math.ceil((new Date(d.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return daysUntil <= 7 && daysUntil >= 0;
          }).length}
          subtitle="Next 7 days"
          icon={<Clock className="h-4 w-4" />}
          href="/litigation/calendar"
        />
        <DashboardMetricCard
          title="Document Prep"
          value={documentPrepCount}
          subtitle="Active cases needing docs"
          icon={<FileText className="h-4 w-4" />}
          href="/litigation"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* My Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckSquare className="h-4 w-4" />
              My Tasks (Next 7 Days)
            </CardTitle>
            <CardDescription>Tasks assigned to you</CardDescription>
          </CardHeader>
          <CardContent>
            {myTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No tasks due this week
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
                      <Badge 
                        variant={
                          task.priority === 'urgent' ? 'destructive' : 
                          task.priority === 'high' ? 'default' : 'secondary'
                        }
                      >
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

        {/* Upcoming Deadlines */}
        <DeadlinesList
          title="Upcoming Deadlines"
          description="Response dates & hearings"
          deadlines={deadlines}
          viewAllHref="/litigation/calendar"
          maxItems={5}
        />
      </div>

      {/* Assigned Cases and Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Assigned Cases */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderOpen className="h-4 w-4" />
              My Assigned Cases
            </CardTitle>
            <CardDescription>Cases you are managing</CardDescription>
          </CardHeader>
          <CardContent>
            {!matters || matters.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No cases assigned to you
              </p>
            ) : (
              <div className="space-y-3">
                {matters.slice(0, 5).map(matter => {
                  const clientName = matter.client_service?.primary_client
                    ? `${matter.client_service.primary_client.first_name} ${matter.client_service.primary_client.last_name}`
                    : 'Unknown';
                  const creditorName = matter.liability?.current_creditor?.name || 
                    matter.liability?.original_creditor?.name || 'Unknown';
                  
                  return (
                    <div
                      key={matter.id}
                      className="flex items-start justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div>
                        <p className="font-medium text-sm">{clientName}</p>
                        <p className="text-xs text-muted-foreground">
                          {creditorName} • {matter.case_number || 'No case #'}
                        </p>
                        {matter.court_name && (
                          <p className="text-xs text-muted-foreground">
                            {matter.court_name}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline">{matter.status.replace('_', ' ')}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link to="/litigation">View All Cases</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <RecentActivityFeed
          title="Recent Activity"
          description="Latest updates on your cases"
          activities={recentActivities}
          viewAllHref="/litigation"
          emptyMessage="No recent activity"
        />
      </div>
    </div>
  );
}
