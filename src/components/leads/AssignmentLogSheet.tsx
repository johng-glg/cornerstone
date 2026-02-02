import { useAssignmentLog } from '@/hooks/useAssignmentQueue';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowRight, 
  Clock, 
  RefreshCw, 
  UserMinus, 
  UserPlus, 
  Zap,
  History
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ASSIGNMENT_ACTION_LABELS, ASSIGNMENT_METHOD_LABELS } from '@/types/assignment';
import type { AssignmentLogEntry } from '@/types/assignment';

interface AssignmentLogSheetProps {
  leadId: string | null;
  onClose: () => void;
}

export function AssignmentLogSheet({ leadId, onClose }: AssignmentLogSheetProps) {
  const { data: logs, isLoading } = useAssignmentLog(leadId ?? undefined);

  const getActionIcon = (action: AssignmentLogEntry['action']) => {
    switch (action) {
      case 'auto_assigned':
        return <Zap className="h-4 w-4 text-primary" />;
      case 'manual_assigned':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'reassigned':
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      case 'unassigned':
        return <UserMinus className="h-4 w-4 text-muted-foreground" />;
      case 'queue_added':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'queue_expired':
        return <Clock className="h-4 w-4 text-destructive" />;
      default:
        return <ArrowRight className="h-4 w-4" />;
    }
  };

  return (
    <Sheet open={!!leadId} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Assignment History
          </SheetTitle>
          <SheetDescription>
            Timeline of assignment changes for this lead
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : logs?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No assignment history for this lead
            </div>
          ) : (
            <div className="space-y-4">
              {logs?.map((log) => (
                <div 
                  key={log.id} 
                  className="relative pl-6 pb-4 border-l-2 border-muted last:pb-0"
                >
                  <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-background border-2 border-muted flex items-center justify-center">
                    {getActionIcon(log.action)}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {ASSIGNMENT_ACTION_LABELS[log.action]}
                      </Badge>
                      {log.method && (
                        <Badge variant="secondary" className="text-xs">
                          {ASSIGNMENT_METHOD_LABELS[log.method]}
                        </Badge>
                      )}
                    </div>

                    <div className="text-sm">
                      {log.action === 'reassigned' && log.from_staff && log.to_staff && (
                        <span>
                          <span className="font-medium">
                            {log.from_staff.first_name} {log.from_staff.last_name}
                          </span>
                          {' → '}
                          <span className="font-medium">
                            {log.to_staff.first_name} {log.to_staff.last_name}
                          </span>
                        </span>
                      )}
                      {(log.action === 'auto_assigned' || log.action === 'manual_assigned') && log.to_staff && (
                        <span>
                          Assigned to{' '}
                          <span className="font-medium">
                            {log.to_staff.first_name} {log.to_staff.last_name}
                          </span>
                        </span>
                      )}
                      {log.action === 'unassigned' && log.from_staff && (
                        <span>
                          Unassigned from{' '}
                          <span className="font-medium">
                            {log.from_staff.first_name} {log.from_staff.last_name}
                          </span>
                        </span>
                      )}
                      {log.action === 'queue_added' && (
                        <span>Added to assignment queue</span>
                      )}
                      {log.action === 'queue_expired' && (
                        <span>Queue assignment expired</span>
                      )}
                    </div>

                    {log.reason && (
                      <p className="text-xs text-muted-foreground">{log.reason}</p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</span>
                    </div>

                    {log.performed_by_staff && (
                      <p className="text-xs text-muted-foreground">
                        by {log.performed_by_staff.first_name} {log.performed_by_staff.last_name}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
