import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, LayoutGrid, List, Calendar, User, AlertCircle, Eye, EyeOff, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useTasks, type Task, type TaskStatus, type TaskPriority } from '@/hooks/useTasks';
import { TaskFormDialog } from '@/components/tasks/TaskFormDialog';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
import { TaskKanban } from '@/components/tasks/TaskKanban';
import { format, isPast, isToday, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' },
  medium: { label: 'Medium', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
  urgent: { label: 'Urgent', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-gray-100 text-gray-800' },
  in_progress: { label: 'In Progress', className: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800' },
};

const typeLabels: Record<string, string> = {
  follow_up: 'Follow Up',
  document_review: 'Document Review',
  court_deadline: 'Court Deadline',
  settlement_negotiation: 'Settlement Negotiation',
  client_call: 'Client Call',
  general: 'General',
};

type SortDirection = 'asc' | 'desc' | 'none';

export default function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<'list' | 'kanban'>('kanban');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [dateSort, setDateSort] = useState<SortDirection>('asc');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [showForm, setShowForm] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Handle ?action=new query param to auto-open dialog
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setEditingTask(null);
      setShowForm(true);
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: tasks, isLoading } = useTasks(
    priorityFilter === 'all'
      ? undefined
      : { priority: priorityFilter }
  );

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    
    let result = tasks.filter((task) => {
      // Filter out completed/cancelled unless toggle is on
      if (!showCompleted && (task.status === 'completed' || task.status === 'cancelled')) {
        return false;
      }
      
      // Date range filter
      if (dateRange.from || dateRange.to) {
        if (!task.due_date) return false;
        const taskDate = new Date(task.due_date);
        
        if (dateRange.from && dateRange.to) {
          return isWithinInterval(taskDate, {
            start: startOfDay(dateRange.from),
            end: endOfDay(dateRange.to),
          });
        } else if (dateRange.from) {
          return taskDate >= startOfDay(dateRange.from);
        } else if (dateRange.to) {
          return taskDate <= endOfDay(dateRange.to);
        }
      }
      
      return true;
    });

    // Sort by date
    if (dateSort !== 'none') {
      result = [...result].sort((a, b) => {
        // Tasks without due dates go to the end
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        
        const dateA = new Date(a.due_date).getTime();
        const dateB = new Date(b.due_date).getTime();
        return dateSort === 'asc' ? dateA - dateB : dateB - dateA;
      });
    }

    return result;
  }, [tasks, showCompleted, dateRange, dateSort]);

  // Count hidden tasks
  const hiddenCount = useMemo(() => {
    if (!tasks) return 0;
    return tasks.filter(t => t.status === 'completed' || t.status === 'cancelled').length;
  }, [tasks]);

  const handleViewTask = (task: Task) => {
    setSelectedTaskId(task.id);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  const clearDateFilter = () => {
    setDateRange({ from: undefined, to: undefined });
  };

  const toggleDateSort = () => {
    setDateSort((prev) => {
      if (prev === 'none') return 'asc';
      if (prev === 'asc') return 'desc';
      return 'none';
    });
  };

  const getSortIcon = () => {
    if (dateSort === 'asc') return <ArrowUp className="h-4 w-4" />;
    if (dateSort === 'desc') return <ArrowDown className="h-4 w-4" />;
    return <ArrowUpDown className="h-4 w-4" />;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">Manage and track team tasks</p>
        </div>
        <Button onClick={() => { setEditingTask(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* Filters and View Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Priority Filter */}
          <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as TaskPriority | 'all')}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Range Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !dateRange.from && !dateRange.to && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
                    </>
                  ) : (
                    format(dateRange.from, "MMM d, yyyy")
                  )
                ) : (
                  "Filter by date"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                numberOfMonths={2}
                className={cn("p-3 pointer-events-auto")}
              />
              {(dateRange.from || dateRange.to) && (
                <div className="p-2 border-t">
                  <Button variant="ghost" size="sm" onClick={clearDateFilter} className="w-full">
                    Clear dates
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Show Completed Toggle */}
          <Button
            variant={showCompleted ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowCompleted(!showCompleted)}
            className="gap-2"
          >
            {showCompleted ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {showCompleted ? 'Showing all' : `${hiddenCount} hidden`}
          </Button>
          {/* Date Sort */}
          <Button
            variant={dateSort !== 'none' ? "secondary" : "outline"}
            size="sm"
            onClick={toggleDateSort}
            className="gap-2"
          >
            {getSortIcon()}
            {dateSort === 'asc' ? 'Earliest first' : dateSort === 'desc' ? 'Latest first' : 'Sort by date'}
          </Button>
        </div>

        <div className="flex items-center gap-1 border rounded-lg p-1">
          <Button
            variant={view === 'kanban' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setView('kanban')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setView('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : view === 'kanban' ? (
        <TaskKanban tasks={filteredTasks} onTaskClick={handleViewTask} showCompleted={showCompleted} />
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Assigned To</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks && filteredTasks.length > 0 ? (
                filteredTasks.map((task) => {
                  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'completed';
                  const isDueToday = task.due_date && isToday(new Date(task.due_date));

                  return (
                    <TableRow
                      key={task.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewTask(task)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isOverdue && <AlertCircle className="h-4 w-4 text-destructive" />}
                          <span className="font-medium">{task.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {typeLabels[task.task_type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={priorityConfig[task.priority]?.className}>
                          {priorityConfig[task.priority]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig[task.status]?.className}>
                          {statusConfig[task.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {task.due_date ? (
                          <div className={`flex items-center gap-1 text-sm ${
                            isOverdue ? 'text-destructive' : isDueToday ? 'text-orange-500' : ''
                          }`}>
                            <Calendar className="h-3 w-3" />
                            {format(new Date(task.due_date), 'MMM d, yyyy')}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {task.assigned_staff ? (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {task.assigned_staff.first_name} {task.assigned_staff.last_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Unassigned</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {!showCompleted && hiddenCount > 0 
                      ? `No active tasks. ${hiddenCount} completed/cancelled tasks hidden.`
                      : 'No tasks found. Create your first task!'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Form Dialog */}
      <TaskFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        task={editingTask}
      />

      {/* Detail Sheet */}
      <TaskDetailSheet
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onOpenChange={(open) => !open && setSelectedTaskId(null)}
        onEdit={() => {
          const task = tasks?.find((t) => t.id === selectedTaskId);
          if (task) {
            setSelectedTaskId(null);
            handleEditTask(task);
          }
        }}
      />
    </div>
  );
}
