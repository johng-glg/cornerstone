import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Mail, FileText, Phone, CheckSquare, Clock, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardMetricCard } from './DashboardMetricCard';
import { RecentActivityFeed, type Activity } from './RecentActivityFeed';
import { useCorrespondenceStats } from '@/hooks/useDashboardStats';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/lib/auth';
import { format, isPast } from 'date-fns';

export function CorrespondenceDashboard() {
  const { staff } = useAuth();
  const { data: stats, isLoading: statsLoading } = useCorrespondenceStats();
  const { data: tasks, isLoading: tasksLoading } = useTasks();

  // My tasks
  const myTasks = useMemo(() => {
    if (!tasks || !staff) return [];
    return tasks.filter(t => 
      t.assigned_to === staff.id && 
      t.status !== 'completed' && 
      t.status !== 'cancelled'
    ).slice(0, 5);
  }, [tasks, staff]);

  // My follow-up tasks
  const followUpTasks = useMemo(() => {
    if (!tasks || !staff) return [];
    return tasks.filter(t => 
      t.assigned_to === staff.id && 
      t.status !== 'completed' && 
      t.status !== 'cancelled' &&
      t.task_type === 'follow_up'
    ).slice(0, 5);
  }, [tasks, staff]);

  // Build recent activity from tasks
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

  const isLoading = statsLoading || tasksLoading;

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
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Correspondence Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Communications and document management
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/clients">
              <FileText className="h-4 w-4 mr-2" />
              Clients
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
          title="Documents This Week"
          value={stats?.documentsThisWeek || 0}
          subtitle="Uploaded by you"
          icon={<FileText className="h-4 w-4" />}
        />
        <DashboardMetricCard
          title="Communications Today"
          value={stats?.communicationsToday || 0}
          subtitle="Logged today"
          icon={<MessageSquare className="h-4 w-4" />}
        />
        <DashboardMetricCard
          title="Pending Tasks"
          value={stats?.pendingTasks || 0}
          subtitle="Assigned to you"
          icon={<CheckSquare className="h-4 w-4" />}
          href="/tasks"
          variant={(stats?.pendingTasks || 0) > 10 ? 'warning' : 'default'}
        />
        <DashboardMetricCard
          title="Follow-ups"
          value={stats?.followUpTasks || 0}
          subtitle="Pending follow-ups"
          icon={<Phone className="h-4 w-4" />}
          href="/tasks"
        />
      </div>

      {/* Main Content Grid */}
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

        {/* Follow-up Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Phone className="h-4 w-4" />
              Follow-up Tasks
            </CardTitle>
            <CardDescription>Client follow-ups needed</CardDescription>
          </CardHeader>
          <CardContent>
            {followUpTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No follow-up tasks 🎉
              </p>
            ) : (
              <div className="space-y-3">
                {followUpTasks.map(task => {
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
                      <Badge variant={isOverdue ? 'destructive' : 'outline'}>
                        {isOverdue ? 'Overdue' : 'Pending'}
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
