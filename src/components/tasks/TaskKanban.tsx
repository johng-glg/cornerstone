import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, AlertCircle } from 'lucide-react';
import { useUpdateTaskStatus, type Task, type TaskStatus } from '@/hooks/useTasks';
import { format, isPast, isToday } from 'date-fns';

interface TaskKanbanProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  showCompleted?: boolean;
}

const columns: { id: TaskStatus; title: string; className: string }[] = [
  { id: 'pending', title: 'Pending', className: 'bg-gray-50 dark:bg-gray-900/30' },
  { id: 'in_progress', title: 'In Progress', className: 'bg-blue-50 dark:bg-blue-900/20' },
  { id: 'completed', title: 'Completed', className: 'bg-green-50 dark:bg-green-900/20' },
  { id: 'cancelled', title: 'Cancelled', className: 'bg-red-50 dark:bg-red-900/20' },
];

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-gray-100 text-gray-800' },
  medium: { label: 'Medium', className: 'bg-blue-100 text-blue-800' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-800' },
  urgent: { label: 'Urgent', className: 'bg-red-100 text-red-800' },
};

const typeLabels: Record<string, string> = {
  follow_up: 'Follow Up',
  document_review: 'Document Review',
  court_deadline: 'Court Deadline',
  settlement_negotiation: 'Settlement',
  client_call: 'Client Call',
  general: 'General',
};

export function TaskKanban({ tasks, onTaskClick, showCompleted = false }: TaskKanbanProps) {
  const updateStatus = useUpdateTaskStatus();

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const taskId = result.draggableId;
    const newStatus = result.destination.droppableId as TaskStatus;

    if (result.source.droppableId !== newStatus) {
      updateStatus.mutate({ id: taskId, status: newStatus });
    }
  };

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter((task) => task.status === status);
  };

  // Filter columns based on showCompleted
  const visibleColumns = showCompleted 
    ? columns 
    : columns.filter(col => col.id !== 'completed' && col.id !== 'cancelled');

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className={`grid grid-cols-1 gap-4 ${
        visibleColumns.length === 2 
          ? 'md:grid-cols-2' 
          : 'md:grid-cols-2 lg:grid-cols-4'
      }`}>
        {visibleColumns.map((column) => (
          <div key={column.id} className={`rounded-lg p-3 ${column.className}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm">{column.title}</h3>
              <Badge variant="secondary" className="text-xs">
                {getTasksByStatus(column.id).length}
              </Badge>
            </div>
            <Droppable droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`space-y-2 min-h-[200px] ${snapshot.isDraggingOver ? 'bg-accent/50 rounded-md' : ''}`}
                >
                  {getTasksByStatus(column.id).map((task, index) => {
                    const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'completed';
                    const isDueToday = task.due_date && isToday(new Date(task.due_date));

                    return (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`cursor-pointer hover:shadow-md transition-shadow ${
                              snapshot.isDragging ? 'shadow-lg rotate-2' : ''
                            } ${isOverdue ? 'border-destructive' : ''}`}
                            onClick={() => onTaskClick(task)}
                          >
                            <CardContent className="p-3 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium line-clamp-2">{task.title}</p>
                                {isOverdue && (
                                  <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                                )}
                              </div>

                              <div className="flex flex-wrap gap-1">
                                <Badge variant="outline" className="text-xs">
                                  {typeLabels[task.task_type]}
                                </Badge>
                                <Badge className={`text-xs ${priorityConfig[task.priority]?.className}`}>
                                  {priorityConfig[task.priority]?.label}
                                </Badge>
                              </div>

                              <div className="flex items-center justify-between pt-1">
                                {task.due_date && (
                                  <div className={`flex items-center gap-1 text-xs ${
                                    isOverdue ? 'text-destructive' : isDueToday ? 'text-orange-500' : 'text-muted-foreground'
                                  }`}>
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(task.due_date), 'MMM d')}
                                  </div>
                                )}
                                {task.assigned_staff && (
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={task.assigned_staff.avatar_url || undefined} />
                                    <AvatarFallback className="text-xs">
                                      {task.assigned_staff.first_name[0]}{task.assigned_staff.last_name[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
