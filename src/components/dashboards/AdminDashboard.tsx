import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Users, Briefcase, DollarSign, CheckSquare, TrendingUp, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardMetricCard } from './DashboardMetricCard';
import { RecentActivityFeed, type Activity } from './RecentActivityFeed';
import { useAdminDashboardStats } from '@/hooks/useDashboardStats';
import { useTasks } from '@/hooks/useTasks';
import { useStaff } from '@/hooks/useStaff';
import { useAllHearings } from '@/hooks/useAllHearings';
import { DeadlinesList, type Deadline } from './DeadlinesList';
import { format } from 'date-fns';

export function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useAdminDashboardStats();
  const { data: tasks, isLoading: tasksLoading } = useTasks();
  const { data: staff, isLoading: staffLoading } = useStaff();
  const { data: hearings, isLoading: hearingsLoading } = useAllHearings();

  // Build staff workload data
  const staffWorkload = useMemo(() => {
    if (!staff || !stats?.workloadByStaff) return [];
    
    return staff
      .filter(s => s.is_active && stats.workloadByStaff[s.id])
      .map(s => ({
        id: s.id,
        name: `${s.first_name} ${s.last_name}`,
        taskCount: stats.workloadByStaff[s.id] || 0,
      }))
      .sort((a, b) => b.taskCount - a.taskCount)
      .slice(0, 5);
  }, [staff, stats]);

  // Build deadlines from hearings
  const deadlines = useMemo(() => {
    if (!hearings) return [];
    
    return hearings.slice(0, 10).map((h): Deadline => ({
      id: h.id,
      title: h.hearing_type,
      subtitle: h.litigation_matter?.case_number || 'Unknown case',
      date: h.scheduled_date,
      type: 'hearing',
      entityId: h.matter_id,
      entityType: 'litigation_matter',
    }));
  }, [hearings]);

  // Build recent activity from tasks
  const recentActivities = useMemo(() => {
    if (!tasks) return [];
    
    return tasks
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
  }, [tasks]);

  const isLoading = statsLoading || tasksLoading || staffLoading || hearingsLoading;

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
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Company-wide metrics and oversight
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/staff">
              <Users className="h-4 w-4 mr-2" />
              Manage Staff
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
          title="Active Clients"
          value={stats?.activeClients || 0}
          subtitle="Total in system"
          icon={<Users className="h-4 w-4" />}
          href="/clients"
        />
        <DashboardMetricCard
          title="Active Services"
          value={stats?.serviceCounts.total || 0}
          subtitle={`${stats?.serviceCounts.active || 0} active, ${stats?.serviceCounts.pending || 0} pending`}
          icon={<Briefcase className="h-4 w-4" />}
          href="/services"
        />
        <DashboardMetricCard
          title="In Negotiation"
          value={stats?.liabilitiesInNegotiation || 0}
          subtitle="Liabilities being negotiated"
          icon={<DollarSign className="h-4 w-4" />}
          href="/liabilities"
          variant={stats?.liabilitiesInNegotiation && stats.liabilitiesInNegotiation > 10 ? 'warning' : 'default'}
        />
        <DashboardMetricCard
          title="Pending Tasks"
          value={stats?.pendingTasks || 0}
          subtitle="Company-wide"
          icon={<CheckSquare className="h-4 w-4" />}
          href="/tasks"
          variant={stats?.pendingTasks && stats.pendingTasks > 50 ? 'warning' : 'default'}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Staff Workload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Staff Workload
            </CardTitle>
            <CardDescription>Tasks assigned per team member</CardDescription>
          </CardHeader>
          <CardContent>
            {staffWorkload.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No task assignments found
              </p>
            ) : (
              <div className="space-y-3">
                {staffWorkload.map(member => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <p className="font-medium text-sm">{member.name}</p>
                    <Badge variant={member.taskCount > 10 ? 'destructive' : member.taskCount > 5 ? 'default' : 'secondary'}>
                      {member.taskCount} tasks
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link to="/staff">View All Staff</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <DeadlinesList
          title="Upcoming Deadlines"
          description="Company-wide court dates"
          deadlines={deadlines}
          viewAllHref="/litigation/calendar"
          maxItems={5}
        />
      </div>

      {/* Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Service Status Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="h-4 w-4" />
              Service Status Summary
            </CardTitle>
            <CardDescription>Active services by status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <p className="text-sm">Active</p>
                <Badge variant="default">{stats?.serviceCounts.active || 0}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <p className="text-sm">Pending</p>
                <Badge variant="secondary">{stats?.serviceCounts.pending || 0}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <p className="text-sm">Prospect</p>
                <Badge variant="outline">{stats?.serviceCounts.prospect || 0}</Badge>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link to="/services">View All Services</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <RecentActivityFeed
          title="Recent Activity"
          description="Latest task updates"
          activities={recentActivities}
          viewAllHref="/tasks"
          emptyMessage="No recent activity"
        />
      </div>
    </div>
  );
}
