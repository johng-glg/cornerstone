import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Briefcase, TrendingUp, CheckCircle, Clock, FileText, Activity, Scale, DollarSign, RefreshCw, CheckSquare, Upload, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { useClientServicesForClient, useLiabilitiesForClient } from '@/hooks/useClientData';
import { NotesPanel } from '@/components/notes/NotesPanel';
import { useClientActivity, type ClientActivity } from '@/hooks/useClientActivity';

interface ClientOverviewTabProps {
  clientId: string;
  onViewServices: () => void;
  onViewTasks: () => void;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

const activityTypeIcons: Record<string, React.ElementType> = {
  liability_action: FileText,
  litigation_activity: Scale,
  task_update: CheckSquare,
  settlement: DollarSign,
  status_change: RefreshCw,
  communication: MessageSquare,
  billing_entry: DollarSign,
  document_upload: Upload,
  note: MessageSquare,
};

const activityTypeColors: Record<string, string> = {
  liability_action: 'bg-blue-100 text-blue-600',
  litigation_activity: 'bg-purple-100 text-purple-600',
  task_update: 'bg-green-100 text-green-600',
  settlement: 'bg-orange-100 text-orange-600',
  status_change: 'bg-gray-100 text-gray-600',
  communication: 'bg-yellow-100 text-yellow-600',
  billing_entry: 'bg-amber-100 text-amber-600',
  document_upload: 'bg-cyan-100 text-cyan-600',
  note: 'bg-indigo-100 text-indigo-600',
};


export function ClientOverviewTab({ clientId, onViewServices, onViewTasks }: ClientOverviewTabProps) {
  const { data: services, isLoading: servicesLoading } = useClientServicesForClient(clientId);
  const { data: liabilities, isLoading: liabilitiesLoading } = useLiabilitiesForClient(clientId);
  const { data: activities, isLoading: activitiesLoading } = useClientActivity(clientId);

  const isLoading = servicesLoading || liabilitiesLoading;

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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
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

      {/* Two Column: Notes + Activity */}
      <div className="grid grid-cols-2 gap-6">
        {/* All Notes */}
        <Card className="h-[500px] flex flex-col">
          <CardContent className="flex-1 overflow-hidden p-4">
            <NotesPanel entityType="client" entityId={clientId} title="Client Notes" maxHeight="420px" flat />
          </CardContent>
        </Card>

        {/* Activity Log */}
        <Card className="h-[500px] flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activity Log
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            {activitiesLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : activities && activities.length > 0 ? (
              <ScrollArea className="h-full px-4 pb-4">
                <div className="space-y-3 pt-1">
                  {activities.map((activity) => (
                    <ActivityCard key={activity.id} activity={activity} />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No activity recorded</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


function ActivityCard({ activity }: { activity: ClientActivity }) {
  const Icon = activityTypeIcons[activity.type] || FileText;
  const colorClass = activityTypeColors[activity.type] || 'bg-gray-100 text-gray-600';

  return (
    <div className="flex gap-3 border rounded-lg p-3 bg-card">
      <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-muted-foreground">
            {activity.source_label}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(activity.created_at), 'MMM d, h:mm a')}
          </span>
        </div>
        <p className="text-sm text-foreground line-clamp-2">
          {activity.description}
        </p>
        {activity.staff_name && (
          <p className="text-xs text-muted-foreground mt-1">
            by {activity.staff_name}
          </p>
        )}
      </div>
    </div>
  );
}
