import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { useCreateSettlement, useUpdateSettlement, type Settlement } from '@/hooks/useSettlements';
import { useLiability } from '@/hooks/useLiabilities';

const settlementSchema = z.object({
  offer_amount: z.number().min(0.01, 'Offer amount is required'),
  offer_percentage: z.number().min(0).max(100).optional().nullable(),
  payment_type: z.enum(['lump_sum', 'payment_plan']),
  number_of_payments: z.number().min(1).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

type SettlementFormData = z.infer<typeof settlementSchema>;

interface SettlementFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  liabilityId: string;
  settlement?: Settlement | null;
}

const formatCurrency = (amount: number | null) =>
  amount ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount) : '—';

export function SettlementFormDialog({ open, onOpenChange, liabilityId, settlement }: SettlementFormDialogProps) {
  const createSettlement = useCreateSettlement();
  const updateSettlement = useUpdateSettlement();
  const { data: liability } = useLiability(liabilityId);
  const isEditing = !!settlement;
  const [isPaymentPlan, setIsPaymentPlan] = useState(false);

  const form = useForm<SettlementFormData>({
    resolver: zodResolver(settlementSchema),
    defaultValues: {
      offer_amount: 0,
      offer_percentage: null,
      payment_type: 'lump_sum',
      number_of_payments: 1,
      notes: '',
    },
  });

  useEffect(() => {
    if (settlement) {
      form.reset({
        offer_amount: settlement.offer_amount,
        offer_percentage: settlement.offer_percentage,
        payment_type: settlement.payment_type,
        number_of_payments: settlement.number_of_payments || 1,
        notes: settlement.notes || '',
      });
      setIsPaymentPlan(settlement.payment_type === 'payment_plan');
    } else {
      form.reset({
        offer_amount: 0,
        offer_percentage: null,
        payment_type: 'lump_sum',
        number_of_payments: 1,
        notes: '',
      });
      setIsPaymentPlan(false);
    }
  }, [settlement, form]);

  // Calculate percentage when amount changes
  const offerAmount = form.watch('offer_amount');
  const currentBalance = liability?.current_balance || liability?.enrolled_balance;
  
  useEffect(() => {
    if (currentBalance && offerAmount > 0) {
      const percentage = (offerAmount / currentBalance) * 100;
      form.setValue('offer_percentage', Math.round(percentage * 100) / 100);
    }
  }, [offerAmount, currentBalance, form]);

  const onSubmit = async (data: SettlementFormData) => {
    const settlementData = {
      liability_id: liabilityId,
      offer_amount: data.offer_amount,
      offer_percentage: data.offer_percentage,
      payment_type: isPaymentPlan ? 'payment_plan' as const : 'lump_sum' as const,
      number_of_payments: isPaymentPlan ? data.number_of_payments : 1,
      notes: data.notes || null,
    };

    if (isEditing && settlement) {
      await updateSettlement.mutateAsync({ id: settlement.id, ...settlementData });
    } else {
      await createSettlement.mutateAsync(settlementData);
    }
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Settlement Offer' : 'New Settlement Offer'}</DialogTitle>
        </DialogHeader>
        
        {liability && (
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Balance:</span>
              <span className="font-medium">{formatCurrency(currentBalance || 0)}</span>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="offer_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Offer Amount *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      {...field} 
                      value={field.value || ''} 
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                      placeholder="0.00" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="offer_percentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Settlement Percentage</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      {...field} 
                      value={field.value ?? ''} 
                      disabled
                      placeholder="Auto-calculated" 
                    />
                  </FormControl>
                  <FormDescription>
                    Automatically calculated based on current balance
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <FormLabel>Payment Plan</FormLabel>
                <FormDescription>
                  Enable for multiple payments
                </FormDescription>
              </div>
              <Switch
                checked={isPaymentPlan}
                onCheckedChange={(checked) => {
                  setIsPaymentPlan(checked);
                  form.setValue('payment_type', checked ? 'payment_plan' : 'lump_sum');
                }}
              />
            </div>

            {isPaymentPlan && (
              <FormField
                control={form.control}
                name="number_of_payments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Payments</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1}
                        {...field} 
                        value={field.value || 1} 
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 1)}
                      />
                    </FormControl>
                    {field.value && offerAmount > 0 && (
                      <FormDescription>
                        {formatCurrency(offerAmount / field.value)} per payment
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value || ''} placeholder="Settlement terms, conditions..." rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createSettlement.isPending || updateSettlement.isPending}>
                {isEditing ? 'Save Changes' : 'Create Offer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
