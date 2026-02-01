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
import { useCreateLiability, useUpdateLiability, type Liability } from '@/hooks/useLiabilities';
import { useClientServices } from '@/hooks/useClientServices';
import { useCreditors } from '@/hooks/useCreditors';

const liabilitySchema = z.object({
  client_service_id: z.string().min(1, 'Service is required'),
  liability_type: z.enum(['credit_card', 'medical', 'auto_loan', 'personal_loan', 'student_loan', 'mortgage', 'other']),
  status: z.enum(['enrolled', 'in_negotiation', 'settled', 'in_litigation', 'dismissed', 'cancelled']),
  original_creditor_id: z.string().optional().nullable(),
  current_creditor_id: z.string().optional().nullable(),
  account_number: z.string().max(50).optional().nullable(),
  original_balance: z.number().min(0).optional().nullable(),
  enrolled_balance: z.number().min(0).optional().nullable(),
  current_balance: z.number().min(0).optional().nullable(),
  priority: z.number().min(0).max(100).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

type LiabilityFormData = z.infer<typeof liabilitySchema>;

interface LiabilityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  liability?: Liability | null;
  defaultClientServiceId?: string;
}

const liabilityTypeLabels: Record<string, string> = {
  credit_card: 'Credit Card',
  medical: 'Medical',
  auto_loan: 'Auto Loan',
  personal_loan: 'Personal Loan',
  student_loan: 'Student Loan',
  mortgage: 'Mortgage',
  other: 'Other',
};

const liabilityStatusLabels: Record<string, string> = {
  enrolled: 'Enrolled',
  in_negotiation: 'In Negotiation',
  settled: 'Settled',
  in_litigation: 'In Litigation',
  dismissed: 'Dismissed',
  cancelled: 'Cancelled',
};

export function LiabilityFormDialog({ open, onOpenChange, liability, defaultClientServiceId }: LiabilityFormDialogProps) {
  const createLiability = useCreateLiability();
  const updateLiability = useUpdateLiability();
  const { data: clientServices } = useClientServices();
  const { data: creditors } = useCreditors();
  const isEditing = !!liability;

  const form = useForm<LiabilityFormData>({
    resolver: zodResolver(liabilitySchema),
    defaultValues: {
      client_service_id: defaultClientServiceId || '',
      liability_type: 'credit_card',
      status: 'enrolled',
      original_creditor_id: null,
      current_creditor_id: null,
      account_number: '',
      original_balance: null,
      enrolled_balance: null,
      current_balance: null,
      priority: 0,
      notes: '',
    },
  });

  useEffect(() => {
    if (liability) {
      form.reset({
        client_service_id: liability.client_service_id,
        liability_type: liability.liability_type,
        status: liability.status,
        original_creditor_id: liability.original_creditor_id || null,
        current_creditor_id: liability.current_creditor_id || null,
        account_number: liability.account_number || '',
        original_balance: liability.original_balance,
        enrolled_balance: liability.enrolled_balance,
        current_balance: liability.current_balance,
        priority: liability.priority || 0,
        notes: liability.notes || '',
      });
    } else {
      form.reset({
        client_service_id: defaultClientServiceId || '',
        liability_type: 'credit_card',
        status: 'enrolled',
        original_creditor_id: null,
        current_creditor_id: null,
        account_number: '',
        original_balance: null,
        enrolled_balance: null,
        current_balance: null,
        priority: 0,
        notes: '',
      });
    }
  }, [liability, defaultClientServiceId, form]);

  const onSubmit = async (data: LiabilityFormData) => {
    const liabilityData = {
      client_service_id: data.client_service_id,
      liability_type: data.liability_type,
      status: data.status,
      original_creditor_id: data.original_creditor_id || null,
      current_creditor_id: data.current_creditor_id || null,
      account_number: data.account_number || null,
      original_balance: data.original_balance,
      enrolled_balance: data.enrolled_balance,
      current_balance: data.current_balance,
      priority: data.priority || 0,
      notes: data.notes || null,
    };

    if (isEditing && liability) {
      await updateLiability.mutateAsync({ id: liability.id, ...liabilityData });
    } else {
      await createLiability.mutateAsync(liabilityData);
    }
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Liability' : 'New Liability'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="client_service_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clientServices?.map((svc) => (
                        <SelectItem key={svc.id} value={svc.id}>
                          {svc.service_number} - {svc.primary_client?.first_name} {svc.primary_client?.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="liability_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(liabilityTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(liabilityStatusLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
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
                name="original_creditor_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Original Creditor</FormLabel>
                    <Select 
                      onValueChange={(v) => field.onChange(v === 'none' ? null : v)} 
                      value={field.value || 'none'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select creditor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {creditors?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="current_creditor_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Creditor</FormLabel>
                    <Select 
                      onValueChange={(v) => field.onChange(v === 'none' ? null : v)} 
                      value={field.value || 'none'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select creditor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {creditors?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
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
              name="account_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Number</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} placeholder="xxxx-xxxx-xxxx-1234" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="original_balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Original Balance</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        {...field} 
                        value={field.value ?? ''} 
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="0.00" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enrolled_balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Enrolled Balance</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        {...field} 
                        value={field.value ?? ''} 
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="0.00" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="current_balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Balance</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        {...field} 
                        value={field.value ?? ''} 
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="0.00" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority (0-100)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min={0}
                      max={100}
                      {...field} 
                      value={field.value ?? 0} 
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value || ''} placeholder="Additional notes..." rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createLiability.isPending || updateLiability.isPending}>
                {isEditing ? 'Save Changes' : 'Create Liability'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
