import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addDays } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreatePaymentSchedule } from '@/hooks/usePaymentSchedule';
import { 
  calculateRecommendedDraft, 
  calculateTotalDrafts,
  calculateCompletionDate,
  MINIMUM_DRAFT,
} from '@/lib/scheduleGenerator';
import { 
  FREQUENCY_LABELS, 
  FREQUENCY_CONFIG,
  type PaymentFrequency,
  type ScheduleSummary,
} from '@/types/paymentSchedule';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PaymentScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientServiceId: string;
  existingSchedule?: ScheduleSummary | null;
  termMonths?: number | null;
  totalEnrolledDebt?: number | null;
}

const formSchema = z.object({
  frequency: z.enum(['monthly', 'semi_monthly', 'bi_weekly']),
  draftAmount: z.number().min(350, 'Minimum draft amount is $350'),
  firstDraftDate: z.date({ required_error: 'First draft date is required' }),
  termMonths: z.number().min(18).max(54),
});

type FormData = z.infer<typeof formSchema>;

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

export function PaymentScheduleDialog({
  open,
  onOpenChange,
  clientServiceId,
  existingSchedule,
  termMonths: defaultTermMonths,
  totalEnrolledDebt,
}: PaymentScheduleDialogProps) {
  const createSchedule = useCreatePaymentSchedule();
  const isEdit = !!existingSchedule;

  // Calculate recommended draft amount
  const recommendedDraft = totalEnrolledDebt && defaultTermMonths
    ? calculateRecommendedDraft(totalEnrolledDebt, defaultTermMonths)
    : MINIMUM_DRAFT;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      frequency: existingSchedule?.frequency || 'monthly',
      draftAmount: existingSchedule?.draftAmount || Math.round(recommendedDraft * 100) / 100,
      firstDraftDate: existingSchedule?.firstDraftDate || addDays(new Date(), 7),
      termMonths: defaultTermMonths || 24,
    },
  });

  const frequency = form.watch('frequency');
  const termMonths = form.watch('termMonths');
  const draftAmount = form.watch('draftAmount');
  const firstDraftDate = form.watch('firstDraftDate');

  // Calculate preview values
  const totalDrafts = calculateTotalDrafts(frequency, termMonths);
  const completionDate = firstDraftDate 
    ? calculateCompletionDate(firstDraftDate, frequency, termMonths) 
    : null;
  const totalProgramCost = (draftAmount * totalDrafts) + (10 * totalDrafts); // drafts + processor fees

  const onSubmit = async (data: FormData) => {
    await createSchedule.mutateAsync({
      clientServiceId,
      firstDraftDate: data.firstDraftDate,
      frequency: data.frequency,
      termMonths: data.termMonths,
      draftAmount: data.draftAmount,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Modify Payment Schedule' : 'Create Payment Schedule'}
          </DialogTitle>
          <DialogDescription>
            {isEdit 
              ? 'Update the payment schedule configuration. Changes will affect future drafts only.'
              : 'Configure the recurring draft schedule for this service.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Frequency */}
            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Frequency</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(FREQUENCY_CONFIG).map(([value, config]) => (
                        <SelectItem key={value} value={value}>
                          <div className="flex flex-col">
                            <span>{config.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {config.intervalDescription}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Draft Amount */}
            <FormField
              control={form.control}
              name="draftAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Draft Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min={MINIMUM_DRAFT}
                        className="pl-7"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Recommended: {formatCurrency(recommendedDraft)} (minimum ${MINIMUM_DRAFT})
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Term Months */}
            <FormField
              control={form.control}
              name="termMonths"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Program Term (months)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={18}
                      max={54}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 24)}
                    />
                  </FormControl>
                  <FormDescription>
                    Standard: 18-48 months, Exception: up to 54 months
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* First Draft Date */}
            <FormField
              control={form.control}
              name="firstDraftDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>First Draft Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'MMMM d, yyyy')
                          ) : (
                            <span>Pick a date</span>
                          )}
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

            {/* Schedule Preview */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="text-sm space-y-1">
                  <p><strong>Total Drafts:</strong> {totalDrafts}</p>
                  <p><strong>Completion Date:</strong> {completionDate ? format(completionDate, 'MMMM yyyy') : '—'}</p>
                  <p><strong>Total Program Cost:</strong> {formatCurrency(totalProgramCost)}</p>
                  <p className="text-xs text-muted-foreground">
                    (includes ${10} processor fee per draft)
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createSchedule.isPending}>
                {createSchedule.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEdit ? 'Update Schedule' : 'Create Schedule'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
