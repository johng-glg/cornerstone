import { useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateBillingEntry, useUpdateBillingEntry } from '@/hooks/useBillingEntries';
import { useCurrentStaff, useStaff } from '@/hooks/useStaff';
import { useClients } from '@/hooks/useClients';
import { useLitigationMatters } from '@/hooks/useLitigationMatters';
import type { BillingEntry, BillingEntryType } from '@/types/billing';
import { COMMON_EXPENSE_TYPES, parseDuration } from '@/types/billing';

const billingEntrySchema = z.object({
  entry_type: z.enum(['time', 'expense']),
  description: z.string().min(1, 'Description is required'),
  billing_date: z.string().min(1, 'Date is required'),
  staff_id: z.string().min(1, 'Attorney is required'),
  client_id: z.string().optional(),
  litigation_matter_id: z.string().optional(),
  duration_input: z.string().optional(),
  hourly_rate: z.string().optional(),
  expense_amount: z.string().optional(),
  is_billable: z.boolean(),
  notes: z.string().optional(),
}).refine((data) => {
  if (data.entry_type === 'time') {
    const duration = parseDuration(data.duration_input || '');
    return duration !== null && duration > 0;
  }
  return true;
}, {
  message: 'Valid duration required (e.g., 1:30 or 1.5)',
  path: ['duration_input'],
}).refine((data) => {
  if (data.entry_type === 'expense') {
    const amount = parseFloat(data.expense_amount || '');
    return !isNaN(amount) && amount > 0;
  }
  return true;
}, {
  message: 'Valid amount required',
  path: ['expense_amount'],
});

type BillingEntryFormData = z.infer<typeof billingEntrySchema>;

interface BillingEntryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: BillingEntry | null;
  defaultClientId?: string;
  defaultMatterId?: string;
}

export function BillingEntryFormDialog({
  open,
  onOpenChange,
  entry,
  defaultClientId,
  defaultMatterId,
}: BillingEntryFormDialogProps) {
  const createEntry = useCreateBillingEntry();
  const updateEntry = useUpdateBillingEntry();
  const { data: currentStaff } = useCurrentStaff();
  const { data: staffList } = useStaff();
  const { data: clientsData } = useClients({ pageSize: 500 });
  const { data: matters } = useLitigationMatters();

  // Filter to legal department staff (attorneys, of_counsel, paralegals)
  const legalStaff = staffList?.filter(s => 
    s.department === 'legal'
  ) || [];

  const form = useForm<BillingEntryFormData>({
    resolver: zodResolver(billingEntrySchema),
    defaultValues: {
      entry_type: 'time',
      description: '',
      billing_date: new Date().toISOString().split('T')[0],
      staff_id: currentStaff?.id || '',
      client_id: defaultClientId || '',
      litigation_matter_id: defaultMatterId || '',
      duration_input: '',
      hourly_rate: '350',
      expense_amount: '',
      is_billable: true,
      notes: '',
    },
  });

  const entryType = form.watch('entry_type');

  useEffect(() => {
    if (entry) {
      const durationHours = entry.duration_minutes ? (entry.duration_minutes / 60).toFixed(2) : '';
      form.reset({
        entry_type: entry.entry_type,
        description: entry.description,
        billing_date: entry.billing_date,
        staff_id: entry.staff_id,
        client_id: entry.client_id || '',
        litigation_matter_id: entry.litigation_matter_id || '',
        duration_input: durationHours,
        hourly_rate: entry.hourly_rate?.toString() || '350',
        expense_amount: entry.expense_amount?.toString() || '',
        is_billable: entry.is_billable,
        notes: entry.notes || '',
      });
    } else {
      form.reset({
        entry_type: 'time',
        description: '',
        billing_date: new Date().toISOString().split('T')[0],
        staff_id: currentStaff?.id || '',
        client_id: defaultClientId || '',
        litigation_matter_id: defaultMatterId || '',
        duration_input: '',
        hourly_rate: '350',
        expense_amount: '',
        is_billable: true,
        notes: '',
      });
    }
  }, [entry, currentStaff?.id, defaultClientId, defaultMatterId, form]);

  const onSubmit = async (data: BillingEntryFormData) => {
    let totalAmount = 0;
    let duration_minutes: number | null = null;
    let hourly_rate: number | null = null;
    let expense_amount: number | null = null;

    if (data.entry_type === 'time') {
      duration_minutes = parseDuration(data.duration_input || '') || 0;
      hourly_rate = parseFloat(data.hourly_rate || '0');
      totalAmount = (duration_minutes / 60) * hourly_rate;
    } else {
      expense_amount = parseFloat(data.expense_amount || '0');
      totalAmount = expense_amount;
    }

    const entryData = {
      company_id: currentStaff?.company_id || '',
      staff_id: data.staff_id,
      client_id: data.client_id || null,
      client_service_id: null,
      litigation_matter_id: data.litigation_matter_id || null,
      entry_type: data.entry_type as BillingEntryType,
      description: data.description,
      billing_date: data.billing_date,
      duration_minutes,
      hourly_rate,
      expense_amount,
      total_amount: totalAmount,
      is_billable: data.is_billable,
      status: 'draft' as const,
      notes: data.notes || null,
    };

    if (entry) {
      await updateEntry.mutateAsync({ id: entry.id, ...entryData });
    } else {
      await createEntry.mutateAsync(entryData);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{entry ? 'Edit Billing Entry' : 'New Billing Entry'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="entry_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entry Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="time">Time Entry</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="billing_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="staff_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Attorney/Staff</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select staff" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {legalStaff.map((staff) => (
                          <SelectItem key={staff.id} value={staff.id}>
                            {staff.first_name} {staff.last_name}
                            {staff.job_title && ` (${staff.job_title})`}
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
                name="client_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client (Optional)</FormLabel>
                    <Select 
                      onValueChange={(val) => field.onChange(val === '__none__' ? '' : val)} 
                      value={field.value || '__none__'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {clientsData?.data?.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.first_name} {client.last_name}
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
                name="litigation_matter_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Matter (Optional)</FormLabel>
                    <Select 
                      onValueChange={(val) => field.onChange(val === '__none__' ? '' : val)} 
                      value={field.value || '__none__'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select matter" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {matters?.map((matter) => (
                          <SelectItem key={matter.id} value={matter.id}>
                            {matter.case_number || matter.id.slice(0, 8)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {entryType === 'time' ? (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="duration_input"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (hours)</FormLabel>
                      <FormControl>
                        <Input placeholder="1.5 or 1:30" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hourly_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hourly Rate ($)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : (
              <FormField
                control={form.control}
                name="expense_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  {entryType === 'expense' ? (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select or type description" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COMMON_EXPENSE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <FormControl>
                      <Textarea
                        placeholder="Describe the work performed..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Internal notes..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_billable"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Billable</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createEntry.isPending || updateEntry.isPending}>
                {entry ? 'Update' : 'Create'} Entry
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
