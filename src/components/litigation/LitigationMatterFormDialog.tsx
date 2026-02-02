import { useEffect } from 'react';
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
  opposing_law_firm_id: z.string().nullable().optional(),
  opposing_counsel_id: z.string().nullable().optional(),
  status: z.string().default('pending_response'),
  service_date: z.string().optional(),
  response_deadline: z.string().optional(),
  next_hearing_date: z.string().optional(),
  judgment_amount: z.string().optional(),
  settlement_amount: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface LitigationMatterFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  liabilityId: string;
  clientServiceId: string;
  creditorName?: string;
  matter?: LitigationMatter | null;
}

const statusOptions: { value: LitigationStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'pre_response', label: 'Pre-Response' },
  { value: 'post_response', label: 'Post-Response' },
  { value: 'settled', label: 'Settled' },
  { value: 'dropped', label: 'Dropped' },
  { value: 'judgment', label: 'Judgment' },
  { value: 'declined', label: 'Declined' },
  { value: 'dismissed', label: 'Dismissed' },
];

const usStates = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

export function LitigationMatterFormDialog({
  open,
  onOpenChange,
  liabilityId,
  clientServiceId,
  creditorName,
  matter,
}: LitigationMatterFormDialogProps) {
  const createMatter = useCreateLitigationMatter();
  const updateMatter = useUpdateLitigationMatter();
  const isEditing = !!matter;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      case_number: '',
      court_name: '',
      county: '',
      state: '',
      opposing_party: creditorName || '',
      opposing_counsel: '',
      opposing_law_firm_id: null,
      opposing_counsel_id: null,
      status: 'new',
      service_date: '',
      response_deadline: '',
      next_hearing_date: '',
      judgment_amount: '',
      settlement_amount: '',
      notes: '',
    },
  });

  // Reset form when matter or creditorName changes
  useEffect(() => {
    if (matter) {
      form.reset({
        case_number: matter.case_number || '',
        court_name: matter.court_name || '',
        county: matter.county || '',
        state: matter.state || '',
        opposing_party: matter.opposing_party || '',
        opposing_counsel: matter.opposing_counsel || '',
        opposing_law_firm_id: matter.opposing_law_firm_id || null,
        opposing_counsel_id: matter.opposing_counsel_id || null,
        status: matter.status || 'new',
        service_date: matter.service_date || '',
        response_deadline: matter.response_deadline || '',
        next_hearing_date: matter.next_hearing_date 
          ? new Date(matter.next_hearing_date).toISOString().slice(0, 16) 
          : '',
        judgment_amount: matter.judgment_amount?.toString() || '',
        settlement_amount: matter.settlement_amount?.toString() || '',
        notes: matter.notes || '',
      });
    } else {
      form.reset({
        case_number: '',
        court_name: '',
        county: '',
        state: '',
        opposing_party: creditorName || '',
        opposing_counsel: '',
        opposing_law_firm_id: null,
        opposing_counsel_id: null,
        status: 'new',
        service_date: '',
        response_deadline: '',
        next_hearing_date: '',
        judgment_amount: '',
        settlement_amount: '',
        notes: '',
      });
    }
  }, [matter, form, creditorName]);

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
      opposing_law_firm_id: values.opposing_law_firm_id || null,
      opposing_counsel_id: values.opposing_counsel_id || null,
      status: values.status as LitigationStatus,
      service_date: values.service_date || null,
      response_deadline: values.response_deadline || null,
      next_hearing_date: values.next_hearing_date 
        ? new Date(values.next_hearing_date).toISOString() 
        : null,
      judgment_amount: values.judgment_amount ? parseFloat(values.judgment_amount) : null,
      settlement_amount: values.settlement_amount ? parseFloat(values.settlement_amount) : null,
      notes: values.notes || null,
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Litigation Matter' : 'Add Litigation Matter'}</DialogTitle>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {usStates.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="grid grid-cols-3 gap-4">
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

              <FormField
                control={form.control}
                name="next_hearing_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Hearing</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="judgment_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Judgment Amount</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="settlement_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Settlement Amount</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
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