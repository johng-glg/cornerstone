import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCreateTaskTemplate, useUpdateTaskTemplate, type TaskTemplate } from '@/hooks/useTaskTemplates';
import { useAuth } from '@/lib/auth';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  task_type: z.enum(['follow_up', 'document_review', 'court_deadline', 'settlement_negotiation', 'client_call', 'general']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  default_title: z.string().min(1, 'Default title is required'),
  default_description: z.string().optional().nullable(),
  default_due_days: z.coerce.number().int().min(0).optional().nullable(),
});

type FormData = z.infer<typeof schema>;

const DEPARTMENTS = [
  { value: 'administration', label: 'Administration' },
  { value: 'legal', label: 'Legal' },
  { value: 'negotiations', label: 'Negotiations' },
  { value: 'sales', label: 'Sales' },
  { value: 'client_services', label: 'Client Services' },
  { value: 'operations', label: 'Operations' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: TaskTemplate | null;
}

export function TaskTemplateFormDialog({ open, onOpenChange, template }: Props) {
  const { staff } = useAuth();
  const create = useCreateTaskTemplate();
  const update = useUpdateTaskTemplate();
  const isEditing = !!template;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      department: null,
      task_type: 'general',
      priority: 'medium',
      default_title: '',
      default_description: '',
      default_due_days: null,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: template?.name || '',
        description: template?.description || '',
        department: template?.department || null,
        task_type: (template?.task_type as any) || 'general',
        priority: (template?.priority as any) || 'medium',
        default_title: template?.default_title || '',
        default_description: template?.default_description || '',
        default_due_days: template?.default_due_days ?? null,
      });
    }
  }, [open, template, form]);

  const onSubmit = async (data: FormData) => {
    const payload = {
      name: data.name,
      description: data.description || null,
      department: data.department || null,
      task_type: data.task_type,
      priority: data.priority,
      default_title: data.default_title,
      default_description: data.default_description || null,
      default_due_days: data.default_due_days ?? null,
      company_id: staff?.company_id || null,
      created_by: staff?.id || null,
      is_active: true,
    };

    if (isEditing && template) {
      await update.mutateAsync({ id: template.id, ...payload });
    } else {
      await create.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Template' : 'New Task Template'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Template Name *</FormLabel>
                <FormControl><Input {...field} placeholder="e.g. New Client Onboarding" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea {...field} value={field.value || ''} placeholder="When to use this template..." rows={2} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="department" render={({ field }) => (
              <FormItem>
                <FormLabel>Department</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || '__none__'}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">No Department</SelectItem>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="default_title" render={({ field }) => (
              <FormItem>
                <FormLabel>Default Task Title *</FormLabel>
                <FormControl><Input {...field} placeholder="Task title when template is used" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="default_description" render={({ field }) => (
              <FormItem>
                <FormLabel>Default Task Description</FormLabel>
                <FormControl><Textarea {...field} value={field.value || ''} placeholder="Pre-filled description..." rows={2} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="priority" render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

              <FormField control={form.control} name="task_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="follow_up">Follow Up</SelectItem>
                      <SelectItem value="document_review">Doc Review</SelectItem>
                      <SelectItem value="court_deadline">Court Deadline</SelectItem>
                      <SelectItem value="settlement_negotiation">Settlement</SelectItem>
                      <SelectItem value="client_call">Client Call</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

              <FormField control={form.control} name="default_due_days" render={({ field }) => (
                <FormItem>
                  <FormLabel>Due in (days)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                      placeholder="—"
                    />
                  </FormControl>
                </FormItem>
              )} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={create.isPending || update.isPending}>
                {isEditing ? 'Save Changes' : 'Create Template'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
