import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  UserPlus, 
  Briefcase, 
  DollarSign, 
  CheckSquare, 
  TrendingUp,
  Clock,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

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
  {
    title: 'Tasks Due Today',
    value: '7',
    change: '3 urgent',
    changeType: 'warning' as const,
    icon: CheckSquare,
    href: '/tasks',
  },
];

// Recent activities - mock data
const recentActivities = [
  { id: 1, type: 'lead', message: 'New lead assigned: John Smith', time: '5 min ago' },
  { id: 2, type: 'settlement', message: 'Settlement approved for ENG-2026-0042', time: '15 min ago' },
  { id: 3, type: 'task', message: 'Task completed: Follow up with client', time: '1 hour ago' },
  { id: 4, type: 'engagement', message: 'New engagement created: ENG-2026-0156', time: '2 hours ago' },
  { id: 5, type: 'liability', message: 'Balance updated for Capital One account', time: '3 hours ago' },
];

// Urgent tasks - mock data
const urgentTasks = [
  { id: 1, title: 'Call client about settlement offer', dueDate: 'Today 2:00 PM', priority: 'urgent' },
  { id: 2, title: 'Submit court response for Case #2024-CV-1234', dueDate: 'Today 5:00 PM', priority: 'urgent' },
  { id: 3, title: 'Review settlement documents', dueDate: 'Tomorrow', priority: 'high' },
];

export default function Dashboard() {
  const { staff, roles } = useAuth();

  const getDepartmentGreeting = () => {
    if (!staff) return 'Welcome';
    
    const department = staff.department;
    switch (department) {
      case 'sales_intake':
        return 'Sales Dashboard';
      case 'negotiations':
        return 'Negotiator Dashboard';
      case 'attorney':
        return 'Attorney Dashboard';
      case 'client_services':
        return 'Client Services Dashboard';
      case 'admin':
        return 'Admin Dashboard';
      default:
        return 'Dashboard';
    }
  };

  return (
    <div className="space-y-6">

      {/* Quick Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/leads/new">
                <UserPlus className="mr-2 h-4 w-4" />
                New Lead
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/engagements/new">
                <Briefcase className="mr-2 h-4 w-4" />
                New Engagement
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/contacts/new">
                <UserPlus className="mr-2 h-4 w-4" />
                New Contact
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/tasks/new">
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
                    stat.changeType === 'positive' ? 'default' : 
                    stat.changeType === 'warning' ? 'destructive' : 'secondary'
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
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Urgent Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Urgent Tasks
            </CardTitle>
            <CardDescription>Tasks requiring immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {urgentTasks.map((task) => (
                <div 
                  key={task.id} 
                  className="flex items-start justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{task.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {task.dueDate}
                    </div>
                  </div>
                  <Badge 
                    variant={task.priority === 'urgent' ? 'destructive' : 'secondary'}
                    className="capitalize"
                  >
                    {task.priority}
                  </Badge>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link to="/tasks">View All Tasks</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest updates across the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div 
                  key={activity.id} 
                  className="flex items-start gap-3 text-sm"
                >
                  <div className="h-2 w-2 mt-2 rounded-full bg-primary flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    <p className="text-foreground">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
