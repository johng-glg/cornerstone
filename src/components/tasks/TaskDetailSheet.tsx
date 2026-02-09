import { NotesPanel } from '@/components/notes/NotesPanel';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, User, AlertCircle, CheckCircle, Clock, FileText } from 'lucide-react';
import { useTask, useUpdateTaskStatus, type TaskStatus } from '@/hooks/useTasks';
import { Skeleton } from '@/components/ui/skeleton';
import { format, isPast, isToday } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TaskDetailSheetProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' },
  medium: { label: 'Medium', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
  urgent: { label: 'Urgent', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
};

const statusConfig: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  pending: { label: 'Pending', className: 'bg-gray-100 text-gray-800', icon: Clock },
  in_progress: { label: 'In Progress', className: 'bg-blue-100 text-blue-800', icon: AlertCircle },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800', icon: AlertCircle },
};

const typeLabels: Record<string, string> = {
  follow_up: 'Follow Up',
  document_review: 'Document Review',
  court_deadline: 'Court Deadline',
  settlement_negotiation: 'Settlement Negotiation',
  client_call: 'Client Call',
  general: 'General',
};

export function TaskDetailSheet({ taskId, open, onOpenChange, onEdit }: TaskDetailSheetProps) {
  const { data: task, isLoading } = useTask(taskId || undefined);
  const updateStatus = useUpdateTaskStatus();

  const handleStatusChange = (status: TaskStatus) => {
    if (task) {
      updateStatus.mutate({ id: task.id, status });
    }
  };

  const isOverdue = task?.due_date && isPast(new Date(task.due_date)) && task.status !== 'completed';
  const isDueToday = task?.due_date && isToday(new Date(task.due_date));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : task ? (
          <>
            <SheetHeader className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <SheetTitle className="text-xl">{task.title}</SheetTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {typeLabels[task.task_type]}
                    </Badge>
                    <Badge className={priorityConfig[task.priority]?.className}>
                      {priorityConfig[task.priority]?.label}
                    </Badge>
                  </div>
                </div>
                {onEdit && (
                  <Button variant="outline" size="sm" onClick={onEdit}>
                    Edit
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <Select value={task.status} onValueChange={(value) => handleStatusChange(value as TaskStatus)}>
                    <SelectTrigger className="w-36 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </SheetHeader>

            <Separator className="my-4" />

            <div className="space-y-6">
              {/* Due Date */}
              {task.due_date && (
                <div className="flex items-start gap-3">
                  <Calendar className={`h-5 w-5 mt-0.5 ${isOverdue ? 'text-destructive' : isDueToday ? 'text-orange-500' : 'text-muted-foreground'}`} />
                  <div>
                    <label className="text-sm font-medium">Due Date</label>
                    <p className={`text-sm ${isOverdue ? 'text-destructive font-medium' : isDueToday ? 'text-orange-500' : ''}`}>
                      {format(new Date(task.due_date), 'MMMM d, yyyy')}
                      {isOverdue && ' (Overdue)'}
                      {isDueToday && !isOverdue && ' (Today)'}
                    </p>
                  </div>
                </div>
              )}

              {/* Assigned To */}
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <label className="text-sm font-medium">Assigned To</label>
                  <p className="text-sm">
                    {task.assigned_staff 
                      ? `${task.assigned_staff.first_name} ${task.assigned_staff.last_name}`
                      : 'Unassigned'}
                  </p>
                </div>
              </div>

              {/* Description */}
              {task.description && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <p className="text-sm whitespace-pre-wrap">{task.description}</p>
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <p className="text-sm">{format(new Date(task.created_at), 'MMM d, yyyy h:mm a')}</p>
                </div>
                {task.completed_at && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Completed</label>
                    <p className="text-sm">{format(new Date(task.completed_at), 'MMM d, yyyy h:mm a')}</p>
                  </div>
                )}
                {task.created_by_staff && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Created By</label>
                    <p className="text-sm">
                      {task.created_by_staff.first_name} {task.created_by_staff.last_name}
                    </p>
                  </div>
                )}
              </div>

              {/* Notes */}
              <Separator />
              {taskId && <NotesPanel entityType="task" entityId={taskId} flat />}
            </div>
          </>
        ) : (
          <p className="text-muted-foreground">Task not found</p>
        )}
      </SheetContent>
    </Sheet>
  );
}
