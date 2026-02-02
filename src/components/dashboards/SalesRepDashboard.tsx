import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Phone, Target, TrendingUp, CheckSquare, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardMetricCard } from './DashboardMetricCard';
import { RecentActivityFeed, type Activity } from './RecentActivityFeed';
import { useSalesRepStats } from '@/hooks/useDashboardStats';
import { useLeads } from '@/hooks/useLeads';
import { useLeadActivities } from '@/hooks/useLeadActivities';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/lib/auth';
import { format, isPast, addDays } from 'date-fns';

export function SalesRepDashboard() {
  const { staff } = useAuth();
  const { data: stats, isLoading: statsLoading } = useSalesRepStats();
  const { data: leadsResult, isLoading: leadsLoading } = useLeads();
  const { data: tasks, isLoading: tasksLoading } = useTasks();

  const leads = leadsResult?.data;

  // Filter leads assigned to me
  const myLeads = useMemo(() => {
    if (!leads || !staff) return [];
    return leads.filter(l => 
      l.assigned_to === staff.id && 
      l.status !== 'converted' && 
      l.status !== 'lost'
    );
  }, [leads, staff]);

  // Leads needing follow-up (no recent activity or next_action_date passed)
  const leadsNeedingFollowUp = useMemo(() => {
    return myLeads.filter(l => {
      // If never contacted, needs follow-up
      if (!l.contacted_at) return true;
      // Check if last contact was > 3 days ago
      const daysSinceContact = Math.floor(
        (Date.now() - new Date(l.contacted_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceContact > 3;
    }).slice(0, 5);
  }, [myLeads]);

  // My tasks (follow-up type)
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
    
    myLeads.slice(0, 5).forEach(lead => {
      activities.push({
        id: lead.id,
        type: 'status_change',
        message: `${lead.first_name} ${lead.last_name} - ${lead.status}`,
        timestamp: lead.updated_at,
        entityId: lead.id,
        entityType: 'lead',
      });
    });
    
    return activities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [myLeads]);

  const isLoading = statsLoading || leadsLoading || tasksLoading;

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
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Sales Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Your lead pipeline and conversions
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/leads">
              <Target className="h-4 w-4 mr-2" />
              All Leads
            </Link>
          </Button>
          <Button asChild>
            <Link to="/leads?action=new">
              <UserPlus className="h-4 w-4 mr-2" />
              New Lead
            </Link>
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardMetricCard
          title="My Active Leads"
          value={stats?.myActiveLeads || 0}
          subtitle="Assigned to you"
          icon={<Target className="h-4 w-4" />}
          href="/leads"
        />
        <DashboardMetricCard
          title="New Leads"
          value={stats?.leadCounts.new || 0}
          subtitle="Awaiting first contact"
          icon={<UserPlus className="h-4 w-4" />}
          href="/leads?status=new"
          variant={(stats?.leadCounts.new || 0) > 5 ? 'warning' : 'default'}
        />
        <DashboardMetricCard
          title="Conversions"
          value={stats?.conversionsThisMonth || 0}
          subtitle="This month"
          icon={<TrendingUp className="h-4 w-4" />}
          variant={(stats?.conversionsThisMonth || 0) > 0 ? 'success' : 'default'}
        />
        <DashboardMetricCard
          title="Follow-up Tasks"
          value={stats?.followUpTasks || 0}
          subtitle="Pending"
          icon={<Phone className="h-4 w-4" />}
          href="/tasks"
        />
      </div>

      {/* Lead Pipeline Summary */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4" />
              Lead Pipeline
            </CardTitle>
            <CardDescription>Your leads by stage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium">New</p>
                <Badge variant="default">{stats?.leadCounts.new || 0}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium">Contacted</p>
                <Badge variant="secondary">{stats?.leadCounts.contacted || 0}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium">Qualified</p>
                <Badge variant="outline">{stats?.leadCounts.qualified || 0}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium">Proposal</p>
                <Badge variant="outline">{stats?.leadCounts.proposal || 0}</Badge>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link to="/leads">View All Leads</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Leads Needing Follow-up */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Phone className="h-4 w-4" />
              Needs Follow-up
            </CardTitle>
            <CardDescription>Leads awaiting contact</CardDescription>
          </CardHeader>
          <CardContent>
            {leadsNeedingFollowUp.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                All leads are up to date! 🎉
              </p>
            ) : (
              <div className="space-y-3">
                {leadsNeedingFollowUp.map(lead => (
                  <div
                    key={lead.id}
                    className="flex items-start justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium text-sm">{lead.first_name} {lead.last_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {lead.phone || lead.email || 'No contact info'}
                      </p>
                      {lead.contacted_at && (
                        <p className="text-xs text-muted-foreground">
                          Last contact: {format(new Date(lead.contacted_at), 'MMM d')}
                        </p>
                      )}
                    </div>
                    <Badge variant={lead.contacted_at ? 'secondary' : 'destructive'}>
                      {lead.contacted_at ? 'Stale' : 'Never Contacted'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link to="/leads">View All Leads</Link>
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

        {/* Recent Activity */}
        <RecentActivityFeed
          title="Recent Lead Activity"
          description="Your latest lead updates"
          activities={recentActivities}
          viewAllHref="/leads"
          emptyMessage="No recent activity"
        />
      </div>
    </div>
  );
}
