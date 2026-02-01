import { MessageSquare, DollarSign, RefreshCw, Handshake, User } from 'lucide-react';
import { useLiabilityActions } from '@/hooks/useLiabilityActions';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface LiabilityActionsTimelineProps {
  liabilityId: string;
}

const actionTypeIcons: Record<string, React.ReactNode> = {
  note: <MessageSquare className="h-4 w-4" />,
  balance_update: <DollarSign className="h-4 w-4" />,
  creditor_change: <RefreshCw className="h-4 w-4" />,
  settlement: <Handshake className="h-4 w-4" />,
  default: <MessageSquare className="h-4 w-4" />,
};

const actionTypeColors: Record<string, string> = {
  note: 'bg-blue-100 text-blue-600',
  balance_update: 'bg-green-100 text-green-600',
  creditor_change: 'bg-orange-100 text-orange-600',
  settlement: 'bg-purple-100 text-purple-600',
  default: 'bg-gray-100 text-gray-600',
};

const formatCurrency = (amount: number | null) =>
  amount ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount) : null;

export function LiabilityActionsTimeline({ liabilityId }: LiabilityActionsTimelineProps) {
  const { data: actions, isLoading } = useLiabilityActions(liabilityId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!actions || actions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No actions recorded yet
      </p>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
      
      <div className="space-y-4">
        {actions.map((action, index) => {
          const iconClass = actionTypeColors[action.action_type] || actionTypeColors.default;
          const icon = actionTypeIcons[action.action_type] || actionTypeIcons.default;
          
          return (
            <div key={action.id} className="relative flex gap-3 pl-1">
              {/* Icon */}
              <div className={`relative z-10 h-8 w-8 rounded-full flex items-center justify-center ${iconClass}`}>
                {icon}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0 pb-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium capitalize">
                    {action.action_type.replace('_', ' ')}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">
                    {format(new Date(action.created_at), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
                
                <p className="text-sm mt-1">{action.description}</p>
                
                {action.amount && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Amount: {formatCurrency(action.amount)}
                  </p>
                )}
                
                {action.staff && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>
                      {action.staff.first_name} {action.staff.last_name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
