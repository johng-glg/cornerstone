import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addMonths } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, DollarSign, Calculator, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useLiability } from '@/hooks/useLiabilities';
import { useScheduledTransactions } from '@/hooks/useScheduledTransactions';
import { useEscrowProjection } from '@/hooks/useEscrowProjection';
import { useCreateSettlement } from '@/hooks/useSettlements';
import { EscrowProjectionTable } from './EscrowProjectionTable';
import { AdjustmentSuggestions } from './AdjustmentSuggestions';
import type { ProposedSettlement, FeeCollectionMethod, AdjustmentSuggestion } from '@/types/escrow';
import { CONTINGENCY_FEE_PERCENTAGE } from '@/types/escrow';
import { cn } from '@/lib/utils';

const settlementSchema = z.object({
  offer_amount: z.number().min(0.01, 'Offer amount is required'),
  number_of_payments: z.number().min(1).max(24),
  first_payment_date: z.date(),
  fee_collection_method: z.enum(['split', 'lump_sum']),
  fee_start_offset_months: z.number().min(0).max(6),
  notes: z.string().max(1000).optional(),
});

type SettlementFormData = z.infer<typeof settlementSchema>;

interface SettlementOfferBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  liabilityId: string;
  clientServiceId: string;
  currentEscrowBalance: number;
  monthlyDraft: number;
}

const formatCurrency = (amount: number | null) =>
  amount ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount) : '—';

export function SettlementOfferBuilder({
  open,
  onOpenChange,
  liabilityId,
  clientServiceId,
  currentEscrowBalance,
  monthlyDraft,
}: SettlementOfferBuilderProps) {
  const { data: liability } = useLiability(liabilityId);
  const { data: scheduledTransactions = [] } = useScheduledTransactions(clientServiceId);
  const createSettlement = useCreateSettlement();
  const [activeTab, setActiveTab] = useState('offer');

  const currentBalance = liability?.current_balance || liability?.enrolled_balance || 0;
  const defaultFirstPayment = addMonths(new Date(), 1);

  const form = useForm<SettlementFormData>({
    resolver: zodResolver(settlementSchema),
    defaultValues: {
      offer_amount: Math.round(currentBalance * 0.5),
      number_of_payments: 6,
      first_payment_date: defaultFirstPayment,
      fee_collection_method: 'split',
      fee_start_offset_months: 0,
      notes: '',
    },
  });

  // Update default offer amount when liability loads
  useEffect(() => {
    if (currentBalance > 0) {
      form.setValue('offer_amount', Math.round(currentBalance * 0.5));
    }
  }, [currentBalance, form]);

  const watchedValues = form.watch();
  
  const proposedSettlement: ProposedSettlement | null = useMemo(() => {
    if (!watchedValues.offer_amount || !watchedValues.first_payment_date) return null;
    return {
      amount: watchedValues.offer_amount,
      numberOfPayments: watchedValues.number_of_payments,
      firstPaymentDate: watchedValues.first_payment_date,
      feeCollectionMethod: watchedValues.fee_collection_method as FeeCollectionMethod,
      feeStartOffsetMonths: watchedValues.fee_start_offset_months,
    };
  }, [watchedValues]);

  const escrowProjection = useEscrowProjection({
    currentEscrowBalance,
    monthlyDraft,
    scheduledTransactions,
    proposedSettlement,
    projectionMonths: Math.max(24, (watchedValues.number_of_payments || 6) + 6),
  });

  const offerPercentage = currentBalance > 0 
    ? ((watchedValues.offer_amount || 0) / currentBalance * 100).toFixed(1)
    : '0';

  const monthlyPayment = (watchedValues.offer_amount || 0) / (watchedValues.number_of_payments || 1);
  const contingencyFee = (watchedValues.offer_amount || 0) * CONTINGENCY_FEE_PERCENTAGE;
  const monthlyFee = contingencyFee / (watchedValues.number_of_payments || 1);

  const handleApplySuggestion = (suggestion: AdjustmentSuggestion) => {
    switch (suggestion.type) {
      case 'delay_start':
        const newDate = addMonths(watchedValues.first_payment_date, suggestion.value);
        form.setValue('first_payment_date', newDate);
        break;
      case 'extend_term':
        form.setValue('number_of_payments', suggestion.value);
        break;
      // Other suggestions would require changes outside this form
    }
    setActiveTab('projection');
  };

  const onSubmit = async (data: SettlementFormData) => {
    const settlementData = {
      liability_id: liabilityId,
      offer_amount: data.offer_amount,
      offer_percentage: parseFloat(offerPercentage),
      payment_type: data.number_of_payments > 1 ? 'payment_plan' as const : 'lump_sum' as const,
      number_of_payments: data.number_of_payments,
      first_payment_date: format(data.first_payment_date, 'yyyy-MM-dd'),
      fee_collection_method: data.fee_collection_method,
      fee_start_offset_months: data.fee_start_offset_months,
      notes: data.notes || null,
    };

    await createSettlement.mutateAsync(settlementData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Settlement Offer Builder
          </DialogTitle>
        </DialogHeader>

        {/* Creditor & Balance Summary */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Creditor</p>
            <p className="font-medium">
              {liability?.current_creditor?.name || liability?.original_creditor?.name || 'Unknown'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className="text-xl font-bold">{formatCurrency(currentBalance)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Current Escrow</p>
            <p className="font-medium text-green-600">{formatCurrency(currentEscrowBalance)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Monthly Draft</p>
            <p className="font-medium">{formatCurrency(monthlyDraft)}</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="offer">Offer Details</TabsTrigger>
                <TabsTrigger value="fees">Fee Structure</TabsTrigger>
                <TabsTrigger value="projection" className="relative">
                  PLSA Projection
                  {!escrowProjection.isViable && (
                    <Badge variant="destructive" className="ml-2 h-5 px-1">!</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="offer" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="offer_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Settlement Amount *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type="number" 
                              step="0.01"
                              className="pl-9"
                              {...field} 
                              value={field.value || ''} 
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          {offerPercentage}% of current balance
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                            max={24}
                            {...field} 
                            value={field.value || 1} 
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 1)}
                          />
                        </FormControl>
                        <FormDescription>
                          {formatCurrency(monthlyPayment)} per payment
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="first_payment_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>First Payment Date</FormLabel>
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
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Quick Settlement Percentages */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Quick Select</Label>
                  <div className="flex gap-2 flex-wrap">
                    {[40, 45, 50, 55, 60].map((pct) => (
                      <Button
                        key={pct}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => form.setValue('offer_amount', Math.round(currentBalance * (pct / 100)))}
                        className={cn(
                          parseFloat(offerPercentage) === pct && 'border-primary bg-primary/10'
                        )}
                      >
                        {pct}% ({formatCurrency(currentBalance * (pct / 100))})
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="fees" className="space-y-4 mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Contingency Fee (27%)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Fee</p>
                        <p className="text-xl font-bold text-primary">{formatCurrency(contingencyFee)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Per Payment (if split)</p>
                        <p className="font-medium">{formatCurrency(monthlyFee)}</p>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="fee_collection_method"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between py-2">
                          <div>
                            <FormLabel>Split Fee Across Payments</FormLabel>
                            <FormDescription>
                              {field.value === 'split' 
                                ? `${formatCurrency(monthlyFee)} collected each month`
                                : `${formatCurrency(contingencyFee)} collected in one payment`
                              }
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value === 'split'}
                              onCheckedChange={(checked) => 
                                field.onChange(checked ? 'split' : 'lump_sum')
                              }
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fee_start_offset_months"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fee Start Delay (months after first settlement payment)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={0}
                              max={6}
                              {...field} 
                              value={field.value || 0} 
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                            />
                          </FormControl>
                          <FormDescription>
                            Delay fee collection until after creditor receives first payment
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="projection" className="space-y-4 mt-4">
                {/* Viability Indicator */}
                <div className={cn(
                  "flex items-center gap-3 p-4 rounded-lg border",
                  escrowProjection.isViable 
                    ? "bg-green-50 border-green-200" 
                    : "bg-red-50 border-red-200"
                )}>
                  {escrowProjection.isViable ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800">Settlement is Viable</p>
                        <p className="text-sm text-green-600">
                          Escrow balance stays positive throughout the payment period
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="font-medium text-red-800">Settlement Causes Negative Balance</p>
                        <p className="text-sm text-red-600">
                          Shortfall of {formatCurrency(escrowProjection.shortfall)} starting{' '}
                          {escrowProjection.firstNegativeMonth 
                            ? format(escrowProjection.firstNegativeMonth, 'MMM yyyy')
                            : 'soon'
                          }
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Projection Table */}
                <EscrowProjectionTable 
                  projections={escrowProjection.projections} 
                  maxRows={12}
                />

                {/* Suggestions */}
                {!escrowProjection.isViable && (
                  <AdjustmentSuggestions 
                    suggestions={escrowProjection.suggestions}
                    onApply={handleApplySuggestion}
                  />
                )}
              </TabsContent>
            </Tabs>

            <Separator className="my-4" />

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createSettlement.isPending}
                className={cn(!escrowProjection.isViable && 'bg-orange-600 hover:bg-orange-700')}
              >
                {!escrowProjection.isViable && <AlertTriangle className="h-4 w-4 mr-2" />}
                {createSettlement.isPending ? 'Creating...' : 'Create Offer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
