import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useCreateFeatureRequest } from '@/hooks/useFeatureRequests';

const REQUEST_TYPES = [
  { value: 'existing_workflow', label: 'Necessary for Existing Workflow', description: 'Something missing or broken in current processes' },
  { value: 'future_improvement', label: 'Future Improvement', description: 'Enhancement or new capability for later' },
] as const;

const CATEGORIES = [
  { value: 'workflow_gap', label: 'Workflow Gap' },
  { value: 'missing_field', label: 'Missing Field / Data' },
  { value: 'ui_improvement', label: 'UI / UX Improvement' },
  { value: 'new_feature', label: 'New Feature' },
  { value: 'integration', label: 'Integration' },
  { value: 'reporting', label: 'Reporting' },
  { value: 'other', label: 'Other' },
] as const;

const PRIORITIES = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
] as const;

const MODULES = [
  'Dashboard', 'Leads', 'Clients', 'Services', 'Liabilities',
  'Litigation', 'Billing', 'Tasks', 'Payments', 'Reports',
  'Staff', 'Settings', 'Notifications', 'Other',
];

const formSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Please provide more detail'),
  request_type: z.enum(['existing_workflow', 'future_improvement']),
  category: z.enum(['workflow_gap', 'missing_field', 'ui_improvement', 'new_feature', 'integration', 'reporting', 'other']),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  affected_module: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface FeatureRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeatureRequestDialog({ open, onOpenChange }: FeatureRequestDialogProps) {
  const createMutation = useCreateFeatureRequest();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      request_type: 'existing_workflow',
      category: 'workflow_gap',
      priority: 'medium',
      affected_module: '',
    },
  });

  const onSubmit = (values: FormValues) => {
    createMutation.mutate({
      title: values.title,
      description: values.description,
      request_type: values.request_type,
      category: values.category,
      priority: values.priority,
      affected_module: values.affected_module,
    }, {
      onSuccess: () => {
        form.reset();
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Request a Feature</DialogTitle>
          <DialogDescription>
            Submit an enhancement request or report a workflow gap. Your request will be tracked in the backlog.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="request_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Request Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {REQUEST_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          <div>
                            <span className="font-medium">{t.label}</span>
                            <span className="text-muted-foreground ml-2 text-xs">— {t.description}</span>
                          </div>
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
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief summary of the request" {...field} />
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
                    <Textarea
                      placeholder="Describe what you need and why it's important for your workflow..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
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
              name="affected_module"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Affected Module (optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select module" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MODULES.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Request
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
