import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateLitigationMatter, useUpdateLitigationMatter, type LitigationMatter, type LitigationStatus } from '@/hooks/useLitigationMatters';

const formSchema = z.object({
  case_number: z.string().optional(),
  court_name: z.string().optional(),
  county: z.string().optional(),
  state: z.string().optional(),
  opposing_party: z.string().optional(),
  opposing_counsel: z.string().optional(),
  status: z.string().default('pending_response'),
  service_date: z.string().optional(),
  response_deadline: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface LitigationMatterFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  liabilityId: string;
  clientServiceId: string;
  matter?: LitigationMatter | null;
}

const statusOptions: { value: LitigationStatus; label: string }[] = [
  { value: 'pending_response', label: 'Pending Response' },
  { value: 'discovery', label: 'Discovery' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'trial_prep', label: 'Trial Prep' },
  { value: 'trial', label: 'Trial' },
  { value: 'settled', label: 'Settled' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: 'judgment', label: 'Judgment' },
];

export function LitigationMatterFormDialog({
  open,
  onOpenChange,
  liabilityId,
  clientServiceId,
  matter,
}: LitigationMatterFormDialogProps) {
  const createMatter = useCreateLitigationMatter();
  const updateMatter = useUpdateLitigationMatter();
  const isEditing = !!matter;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      case_number: matter?.case_number || '',
      court_name: matter?.court_name || '',
      county: matter?.county || '',
      state: matter?.state || '',
      opposing_party: matter?.opposing_party || '',
      opposing_counsel: matter?.opposing_counsel || '',
      status: matter?.status || 'pending_response',
      service_date: matter?.service_date || '',
      response_deadline: matter?.response_deadline || '',
      notes: matter?.notes || '',
    },
  });

  const onSubmit = (values: FormValues) => {
    const data = {
      liability_id: liabilityId,
      client_service_id: clientServiceId,
      case_number: values.case_number || null,
      court_name: values.court_name || null,
      county: values.county || null,
      state: values.state || null,
      opposing_party: values.opposing_party || null,
      opposing_counsel: values.opposing_counsel || null,
      status: values.status as LitigationStatus,
      service_date: values.service_date || null,
      response_deadline: values.response_deadline || null,
      notes: values.notes || null,
      next_hearing_date: null,
      judgment_amount: null,
      settlement_amount: null,
    };

    if (isEditing) {
      updateMatter.mutate(
        { id: matter.id, ...data },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createMatter.mutate(data, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Matter' : 'Add Litigation Matter'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="case_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Case Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 2024-CV-12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
              name="court_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Court Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Superior Court of California" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="county"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>County</FormLabel>
                    <FormControl>
                      <Input placeholder="County" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input placeholder="State" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="opposing_party"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opposing Party</FormLabel>
                  <FormControl>
                    <Input placeholder="Plaintiff/Creditor name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="opposing_counsel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opposing Counsel</FormLabel>
                  <FormControl>
                    <Input placeholder="Attorney/Law firm name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="service_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="response_deadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Response Deadline</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional details about the case..."
                      className="resize-none"
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMatter.isPending || updateMatter.isPending}
              >
                {isEditing ? 'Save Changes' : 'Create Matter'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}