import { format, isPast, isToday } from 'date-fns';
import { CheckCircle2, Circle, Clock, AlertCircle, Plus, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useTasks, useUpdateTaskStatus, type Task, type TaskStatus } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';

interface MatterTasksListProps {
  matterId: string;
  onAddTask?: () => void;
}

const priorityColors: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const statusIcons: Record<TaskStatus, React.ReactNode> = {
  pending: <Circle className="h-4 w-4 text-muted-foreground" />,
  in_progress: <Clock className="h-4 w-4 text-blue-600" />,
  completed: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  cancelled: <AlertCircle className="h-4 w-4 text-gray-400" />,
};

export function MatterTasksList({ matterId, onAddTask }: MatterTasksListProps) {
  const { data: tasks, isLoading } = useTasks({
    entityType: 'litigation_matter',
    entityId: matterId,
  });
  const updateStatus = useUpdateTaskStatus();

  const handleToggleComplete = (task: Task) => {
    const newStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
    updateStatus.mutate({ id: task.id, status: newStatus });
  };

  // Sort tasks: incomplete first (by due date), then completed
  const sortedTasks = tasks?.slice().sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (a.status !== 'completed' && b.status === 'completed') return -1;
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  const incompleteTasks = sortedTasks?.filter(t => t.status !== 'completed' && t.status !== 'cancelled') || [];
  const completedTasks = sortedTasks?.filter(t => t.status === 'completed' || t.status === 'cancelled') || [];

  const getDueDateDisplay = (dueDate: string | null) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    const isOverdue = isPast(date) && !isToday(date);
    const isDueToday = isToday(date);

    return (
      <span className={cn(
        "text-xs",
        isOverdue && "text-red-600 font-medium",
        isDueToday && "text-orange-600 font-medium",
        !isOverdue && !isDueToday && "text-muted-foreground"
      )}>
        {isOverdue ? 'Overdue: ' : isDueToday ? 'Today: ' : ''}
        {format(date, 'MMM d')}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">
          Tasks ({incompleteTasks.length} open)
        </h4>
        {onAddTask && (
          <Button variant="outline" size="sm" onClick={onAddTask}>
            <Plus className="h-4 w-4 mr-1" />
            Add Task
          </Button>
        )}
      </div>

      {incompleteTasks.length === 0 && completedTasks.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground border rounded-lg border-dashed">
          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No tasks for this matter</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Incomplete tasks */}
          {incompleteTasks.map((task) => (
            <Card key={task.id} className="hover:bg-muted/30 transition-colors">
              <CardContent className="py-3 px-4 flex items-start gap-3">
                <Checkbox
                  checked={task.status === 'completed'}
                  onCheckedChange={() => handleToggleComplete(task)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{task.title}</span>
                    <Badge className={cn("text-xs", priorityColors[task.priority])}>
                      {task.priority}
                    </Badge>
                    {task.status === 'in_progress' && (
                      <Badge variant="outline" className="text-xs">
                        In Progress
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {getDueDateDisplay(task.due_date)}
                    {task.assigned_staff && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {task.assigned_staff.first_name} {task.assigned_staff.last_name}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Completed tasks (collapsed) */}
          {completedTasks.length > 0 && (
            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-2">
                Completed ({completedTasks.length})
              </p>
              {completedTasks.slice(0, 3).map((task) => (
                <Card key={task.id} className="opacity-60 mb-2">
                  <CardContent className="py-2 px-4 flex items-center gap-3">
                    <Checkbox
                      checked={true}
                      onCheckedChange={() => handleToggleComplete(task)}
                    />
                    <span className="text-sm line-through text-muted-foreground">
                      {task.title}
                    </span>
                  </CardContent>
                </Card>
              ))}
              {completedTasks.length > 3 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{completedTasks.length - 3} more completed
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
