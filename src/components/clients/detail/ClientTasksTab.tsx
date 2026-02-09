import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useTasksForClient } from '@/hooks/useClientData';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
import { TaskFormDialog } from '@/components/tasks/TaskFormDialog';

interface ClientTasksTabProps {
  clientId: string;
  clientName?: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
  in_progress: 'bg-blue-500/10 text-blue-700 border-blue-200',
  completed: 'bg-green-500/10 text-green-700 border-green-200',
  cancelled: 'bg-gray-500/10 text-gray-700 border-gray-200',
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-500/10 text-gray-700 border-gray-200',
  medium: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
  high: 'bg-orange-500/10 text-orange-700 border-orange-200',
  urgent: 'bg-red-500/10 text-red-700 border-red-200',
};

export function ClientTasksTab({ clientId, clientName }: ClientTasksTabProps) {
  const { data: tasks, isLoading } = useTasksForClient(clientId);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">
          {tasks?.length || 0} task{tasks?.length !== 1 ? 's' : ''}
        </h3>
        <Button size="sm" onClick={() => setShowAddTask(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Task
        </Button>
      </div>

      {!tasks || tasks.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          No tasks found for this client.
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Assigned To</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow
                  key={task.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedTaskId(task.id)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{task.title}</p>
                      {task.description && (
                        <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[task.status] || ''}>
                      {task.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={priorityColors[task.priority] || ''}>
                      {task.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {task.due_date ? (
                      <span className={
                        new Date(task.due_date) < new Date() && task.status !== 'completed'
                          ? 'text-destructive font-medium'
                          : ''
                      }>
                        {format(new Date(task.due_date), 'MMM d, yyyy')}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {task.assigned_staff ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {task.assigned_staff.first_name.charAt(0)}
                            {task.assigned_staff.last_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {task.assigned_staff.first_name} {task.assigned_staff.last_name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <TaskDetailSheet
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onOpenChange={(open) => !open && setSelectedTaskId(null)}
        onEdit={() => {}}
      />

      <TaskFormDialog
        open={showAddTask}
        onOpenChange={setShowAddTask}
        defaultEntityType="engagement"
        defaultEntityId={clientId}
        defaultEntityLabel={clientName}
      />
    </>
  );
}
