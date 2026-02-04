import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  UserPlus, 
  Briefcase, 
  DollarSign, 
  CheckSquare, 
  TrendingUp,
  Clock,
  AlertCircle,
  ArrowRight,
  FileText,
  Calendar,
  MessageSquare,
  Gavel
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AttorneyDashboard } from '@/components/dashboards/AttorneyDashboard';
import { CaseManagerDashboard } from '@/components/dashboards/CaseManagerDashboard';
import { AdminDashboard } from '@/components/dashboards/AdminDashboard';
import { SalesRepDashboard } from '@/components/dashboards/SalesRepDashboard';
import { NegotiatorDashboard } from '@/components/dashboards/NegotiatorDashboard';
import { PaymentProcessorDashboard } from '@/components/dashboards/PaymentProcessorDashboard';
import { CorrespondenceDashboard } from '@/components/dashboards/CorrespondenceDashboard';
import { ClientServicesRepDashboard } from '@/components/dashboards/ClientServicesRepDashboard';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
import { useUserUrgentTasks, useUserRecentActivity, useUserDashboardStats } from '@/hooks/useUserDashboard';
import { format, formatDistanceToNow, isToday, isTomorrow } from 'date-fns';

// Stats cards data - will be replaced with real data
const statsCards = [
  {
    title: 'Active Leads',
    value: '24',
    change: '+12%',
    changeType: 'positive' as const,
    icon: UserPlus,
    href: '/leads',
  },
  {
    title: 'Active Engagements',
    value: '156',
    change: '+5%',
    changeType: 'positive' as const,
    icon: Briefcase,
    href: '/engagements',
  },
  {
    title: 'Pending Settlements',
    value: '18',
    change: '-3',
    changeType: 'neutral' as const,
    icon: DollarSign,
    href: '/liabilities',
  },
];

const activityIcons: Record<string, React.ReactNode> = {
  task: <CheckSquare className="h-3 w-3" />,
  lead_activity: <MessageSquare className="h-3 w-3" />,
  status_change: <TrendingUp className="h-3 w-3" />,
  document: <FileText className="h-3 w-3" />,
};

const activityColors: Record<string, string> = {
  task: 'bg-blue-500',
  lead_activity: 'bg-yellow-500',
  status_change: 'bg-green-500',
  document: 'bg-purple-500',
};

function formatDueDate(dueDate: string | null) {
  if (!dueDate) return 'No due date';
  const date = new Date(dueDate);
  if (isToday(date)) {
    return `Today ${format(date, 'h:mm a')}`;
  }
  if (isTomorrow(date)) {
    return `Tomorrow ${format(date, 'h:mm a')}`;
  }
  return format(date, 'MMM d, h:mm a');
}

export default function Dashboard() {
  const { staff, roles, hasRole } = useAuth();
  const { data: urgentTasks, isLoading: tasksLoading } = useUserUrgentTasks();
  const { data: recentActivities, isLoading: activitiesLoading } = useUserRecentActivity();
  const { data: stats } = useUserDashboardStats();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Determine which dashboard to show based on department/role
  const isAdmin = staff?.department === 'administration' || hasRole('admin');
  const isAttorney = staff?.department === 'legal' && hasRole('attorney');
  const isCaseManager = hasRole('case_manager');
  const isSalesRep = staff?.department === 'sales' || hasRole('sales_rep');
  const isNegotiator = staff?.department === 'negotiations' || hasRole('negotiator');
  const isPaymentProcessor = staff?.department === 'operations' && hasRole('payment_processor');
  const isCorrespondence = staff?.department === 'operations' && hasRole('correspondent');
  const isClientServicesRep = staff?.department === 'client_services' && !isCaseManager;
  // Staff in legal department who are not attorneys default to CaseManager dashboard
  const isLegalNonAttorney = staff?.department === 'legal' && !hasRole('attorney');

  // Show role-specific dashboards (order matters - most specific first)
  if (isAdmin) {
    return <AdminDashboard />;
  }

  if (isAttorney) {
    return <AttorneyDashboard />;
  }

  if (isCaseManager || isLegalNonAttorney) {
    return <CaseManagerDashboard />;
  }

  if (isSalesRep) {
    return <SalesRepDashboard />;
  }

  if (isNegotiator) {
    return <NegotiatorDashboard />;
  }

  if (isPaymentProcessor) {
    return <PaymentProcessorDashboard />;
  }

  if (isCorrespondence) {
    return <CorrespondenceDashboard />;
  }

  if (isClientServicesRep) {
    return <ClientServicesRepDashboard />;
  }

  // Default dashboard for other roles (viewer, etc.)

  return (
    <div className="space-y-6">

      {/* Quick Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/leads?action=new">
                <UserPlus className="mr-2 h-4 w-4" />
                New Lead
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/tasks?action=new">
                <CheckSquare className="mr-2 h-4 w-4" />
                New Task
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-bold">{stat.value}</div>
                <Badge 
                  variant={
                    stat.changeType === 'positive' ? 'default' : 'secondary'
                  }
                  className="text-xs"
                >
                  {stat.change}
                </Badge>
              </div>
              <Link 
                to={stat.href} 
                className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>
        ))}
        
        {/* Tasks Due Today - Dynamic */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tasks Due Today
            </CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold">{stats?.tasksDueToday ?? '-'}</div>
              {stats?.urgentTasks && stats.urgentTasks > 0 ? (
                <Badge variant="destructive" className="text-xs">
                  {stats.urgentTasks} urgent
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  {stats?.totalPendingTasks ?? 0} pending
                </Badge>
              )}
            </div>
            <Link 
              to="/tasks" 
              className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Urgent Tasks - User Specific */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              My Urgent Tasks
            </CardTitle>
            <CardDescription>Your tasks requiring immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : urgentTasks && urgentTasks.length > 0 ? (
              <div className="space-y-4">
                {urgentTasks.slice(0, 5).map((task) => (
                  <button 
                    key={task.id} 
                    onClick={() => setSelectedTaskId(task.id)}
                    className="w-full flex items-start justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left cursor-pointer"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{task.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDueDate(task.due_date)}
                      </div>
                    </div>
                    <Badge 
                      variant={task.priority === 'urgent' ? 'destructive' : 'secondary'}
                      className="capitalize"
                    >
                      {task.priority}
                    </Badge>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No urgent tasks - great job! 🎉
              </p>
            )}
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link to="/tasks">View All Tasks</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity - User Specific */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              My Recent Activity
            </CardTitle>
            <CardDescription>Your latest actions and updates</CardDescription>
          </CardHeader>
          <CardContent>
            {activitiesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentActivities && recentActivities.length > 0 ? (
              <div className="space-y-4">
                {recentActivities.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`h-6 w-6 rounded-full ${activityColors[activity.type] || 'bg-primary'} flex items-center justify-center text-white flex-shrink-0 mt-0.5`}>
                      {activityIcons[activity.type] || <Gavel className="h-3 w-3" />}
                    </div>
                    <div className="flex-1 space-y-1 min-w-0">
                      <p className="text-sm text-foreground line-clamp-2">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recent activity yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Task Detail Sheet */}
      <TaskDetailSheet
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onOpenChange={(open) => !open && setSelectedTaskId(null)}
      />
    </div>
  );
}
