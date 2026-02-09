import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, FileStack } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';
import { useCreateTask, useUpdateTask, type Task } from '@/hooks/useTasks';
import { useStaff } from '@/hooks/useStaff';
import { useAuth } from '@/lib/auth';
import { EntitySearchSelect } from './EntitySearchSelect';
import { useTaskTemplates, type TaskTemplate } from '@/hooks/useTaskTemplates';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  task_type: z.enum(['follow_up', 'document_review', 'court_deadline', 'settlement_negotiation', 'client_call', 'general']),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
  assigned_to: z.string().optional().nullable(),
  due_date: z.date().optional().nullable(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  defaultEntityType?: 'engagement' | 'case' | 'liability' | 'lead' | 'litigation_matter';
  defaultEntityId?: string;
  defaultEntityLabel?: string;
}

const DEPT_LABELS: Record<string, string> = {
  administration: 'Administration',
  legal: 'Legal',
  negotiations: 'Negotiations',
  sales: 'Sales',
  client_services: 'Client Services',
  operations: 'Operations',
};

export function TaskFormDialog({ open, onOpenChange, task, defaultEntityType, defaultEntityId, defaultEntityLabel }: TaskFormDialogProps) {
  const { staff } = useAuth();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const { data: staffMembers } = useStaff();
  const { data: templates } = useTaskTemplates();
  const isEditing = !!task;

  const [entityType, setEntityType] = useState<string | null>(null);
  const [entityId, setEntityId] = useState<string | null>(null);
  const [entityLabel, setEntityLabel] = useState<string | undefined>(undefined);

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      task_type: 'general',
      status: 'pending',
      assigned_to: null,
      due_date: null,
    },
  });

  // Reset form when task changes or dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        title: task?.title || '',
        description: task?.description || '',
        priority: task?.priority || 'medium',
        task_type: task?.task_type || 'general',
        status: task?.status || 'pending',
        assigned_to: task?.assigned_to || null,
        due_date: task?.due_date ? new Date(task.due_date) : null,
      });
      setEntityType(task?.entity_type || defaultEntityType || null);
      setEntityId(task?.entity_id || defaultEntityId || null);
      setEntityLabel(defaultEntityLabel);
    }
  }, [open, task, defaultEntityType, defaultEntityId, defaultEntityLabel, form]);

  const handleEntitySelect = (type: string | null, id: string | null, label?: string) => {
    setEntityType(type);
    setEntityId(id);
    setEntityLabel(label);
  };

  const handleTemplateSelect = (templateId: string) => {
    if (templateId === '__none__') return;
    const t = templates?.find((tpl) => tpl.id === templateId);
    if (!t) return;
    form.setValue('title', t.default_title);
    if (t.default_description) form.setValue('description', t.default_description);
    form.setValue('priority', t.priority as any);
    form.setValue('task_type', t.task_type as any);
    if (t.default_due_days != null) {
      form.setValue('due_date', addDays(new Date(), t.default_due_days));
    }
  };

  // Group templates by department
  const groupedTemplates = useMemo(() => {
    if (!templates) return {};
    return templates.reduce<Record<string, TaskTemplate[]>>((acc, t) => {
      const key = t.department || 'general';
      if (!acc[key]) acc[key] = [];
      acc[key].push(t);
      return acc;
    }, {});
  }, [templates]);

  const onSubmit = async (data: TaskFormData) => {
    const taskData = {
      title: data.title,
      description: data.description || null,
      priority: data.priority,
      task_type: data.task_type,
      status: data.status,
      assigned_to: data.assigned_to || null,
      due_date: data.due_date ? data.due_date.toISOString().split('T')[0] : null,
      company_id: staff?.company_id || '',
      entity_type: (entityType as any) || null,
      entity_id: entityId || null,
    };

    if (isEditing && task) {
      await updateTask.mutateAsync({ id: task.id, ...taskData });
    } else {
      await createTask.mutateAsync(taskData);
    }
    
    onOpenChange(false);
    form.reset();
  };

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ];

  const typeOptions = [
    { value: 'follow_up', label: 'Follow Up' },
    { value: 'document_review', label: 'Document Review' },
    { value: 'court_deadline', label: 'Court Deadline' },
    { value: 'settlement_negotiation', label: 'Settlement Negotiation' },
    { value: 'client_call', label: 'Client Call' },
    { value: 'general', label: 'General' },
  ];

  const hasTemplates = templates && templates.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Task' : 'New Task'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Template picker */}
            {!isEditing && hasTemplates && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <FileStack className="h-4 w-4" />
                  Use Template
                </label>
                <Select onValueChange={handleTemplateSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {Object.entries(groupedTemplates).map(([dept, tmpls]) => (
                      <SelectGroup key={dept}>
                        <SelectLabel>{DEPT_LABELS[dept] || 'General'}</SelectLabel>
                        {tmpls.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Task title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value || ''} placeholder="Task description..." rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Entity linker */}
            <EntitySearchSelect
              entityType={entityType}
              entityId={entityId}
              onSelect={handleEntitySelect}
              disabled={!!defaultEntityType}
              readOnlyLabel={entityLabel || defaultEntityLabel}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {priorityOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="task_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {typeOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="assigned_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign To</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select staff member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {staffMembers?.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.first_name} {s.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? format(field.value, "PPP") : "Pick a date"}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEditing && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTask.isPending || updateTask.isPending}>
                {isEditing ? 'Save Changes' : 'Create Task'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
