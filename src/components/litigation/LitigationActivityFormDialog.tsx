import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateLitigationActivity } from '@/hooks/useLitigationActivities';

const activitySchema = z.object({
  activity_type: z.string().min(1, 'Activity type is required'),
  description: z.string().min(1, 'Description is required'),
  outcome: z.string().optional(),
});

type ActivityFormData = z.infer<typeof activitySchema>;

interface LitigationActivityFormDialogProps {
  matterId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const activityTypes = [
  { value: 'note', label: 'Note' },
  { value: 'communication', label: 'Communication' },
  { value: 'filing', label: 'Filing' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'hearing', label: 'Hearing Update' },
  { value: 'status_change', label: 'Status Change' },
];

export function LitigationActivityFormDialog({
  matterId,
  open,
  onOpenChange,
}: LitigationActivityFormDialogProps) {
  const createActivity = useCreateLitigationActivity();

  const form = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      activity_type: 'note',
      description: '',
      outcome: '',
    },
  });

  const onSubmit = async (data: ActivityFormData) => {
    await createActivity.mutateAsync({
      matter_id: matterId,
      activity_type: data.activity_type,
      description: data.description,
      outcome: data.outcome || null,
      activity_date: null,
      staff_id: null, // Will be set by current user in a future enhancement
      document_url: null,
    });
    
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Activity</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="activity_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Activity Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activityTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the activity..." 
                      rows={4}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="outcome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Outcome (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Result or outcome..." 
                      rows={2}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createActivity.isPending}>
                Log Activity
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
