import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateLead, useUpdateLead, type LeadInsert, type Lead } from '@/hooks/useLeads';
import { useStaff } from '@/hooks/useStaff';
import { useCurrentStaff } from '@/hooks/useStaff';
import { checkForDuplicates, type DuplicateMatch } from '@/hooks/useDuplicateDetection';
import { DuplicateWarningDialog } from './DuplicateWarningDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

const leadSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  source: z.enum(['web_form', 'referral', 'phone', 'advertisement', 'walk_in', 'other']),
  interest_type: z.enum(['debt_resolution', 'litigation']),
  estimated_debt_amount: z.number().min(0).optional(),
  number_of_debts: z.number().min(0).optional(),
  has_active_lawsuit: z.boolean().default(false),
  assigned_to: z.string().optional(),
  notes: z.string().optional(),
  utm_source: z.string().max(200).optional(),
  utm_medium: z.string().max(200).optional(),
  utm_campaign: z.string().max(200).optional(),
  utm_term: z.string().max(200).optional(),
  utm_content: z.string().max(200).optional(),
  landing_page: z.string().max(500).optional(),
  referrer_url: z.string().max(500).optional(),
});

type LeadFormData = z.infer<typeof leadSchema>;

interface LeadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
}

export function LeadFormDialog({ open, onOpenChange, lead }: LeadFormDialogProps) {
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const { data: salesStaff } = useStaff('sales');
  const { data: currentStaff } = useCurrentStaff();
  const isEditing = !!lead;

  // Duplicate detection state
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<LeadFormData | null>(null);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);

  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      source: 'phone',
      interest_type: 'debt_resolution',
      has_active_lawsuit: false,
      notes: '',
      utm_source: '',
      utm_medium: '',
      utm_campaign: '',
      utm_term: '',
      utm_content: '',
      landing_page: '',
      referrer_url: '',
    },
  });

  // Reset form when lead changes (for edit mode)
  useEffect(() => {
    if (lead) {
      form.reset({
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email || '',
        phone: lead.phone || '',
        source: lead.source,
        interest_type: lead.interest_type === 'both' ? 'debt_resolution' : lead.interest_type,
        estimated_debt_amount: lead.estimated_debt_amount || undefined,
        number_of_debts: lead.number_of_debts || undefined,
        has_active_lawsuit: lead.has_active_lawsuit || false,
        assigned_to: lead.assigned_to || undefined,
        notes: lead.notes || '',
        utm_source: lead.utm_source || '',
        utm_medium: lead.utm_medium || '',
        utm_campaign: lead.utm_campaign || '',
        utm_term: lead.utm_term || '',
        utm_content: lead.utm_content || '',
        landing_page: lead.landing_page || '',
        referrer_url: lead.referrer_url || '',
      });
    } else {
      form.reset({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        source: 'phone',
        interest_type: 'debt_resolution',
        has_active_lawsuit: false,
        notes: '',
      });
    }
  }, [lead, form]);

  // Reset duplicate state when dialog closes
  useEffect(() => {
    if (!open) {
      setDuplicateMatches([]);
      setShowDuplicateWarning(false);
      setPendingSubmit(null);
    }
  }, [open]);

  const performSubmit = async (data: LeadFormData) => {
    if (isEditing) {
      await updateLead.mutateAsync({
        id: lead.id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email || null,
        phone: data.phone || null,
        source: data.source,
        interest_type: data.interest_type,
        estimated_debt_amount: data.estimated_debt_amount || null,
        number_of_debts: data.number_of_debts || null,
        has_active_lawsuit: data.has_active_lawsuit,
        assigned_to: data.assigned_to || null,
        notes: data.notes || null,
      });
      onOpenChange(false);
      return;
    }

    if (!currentStaff?.company_id) {
      return;
    }

    const leadData: LeadInsert = {
      first_name: data.first_name,
      last_name: data.last_name,
      source: data.source,
      interest_type: data.interest_type,
      has_active_lawsuit: data.has_active_lawsuit,
      company_id: currentStaff.company_id,
      email: data.email || null,
      phone: data.phone || null,
      estimated_debt_amount: data.estimated_debt_amount || null,
      number_of_debts: data.number_of_debts || null,
      assigned_to: data.assigned_to || null,
      notes: data.notes || null,
    };

    await createLead.mutateAsync(leadData);
    form.reset();
    onOpenChange(false);
  };

  const onSubmit = async (data: LeadFormData) => {
    // Check for duplicates before creating/updating
    setIsCheckingDuplicates(true);
    try {
      const matches = await checkForDuplicates({
        email: data.email || undefined,
        phone: data.phone || undefined,
        firstName: data.first_name,
        lastName: data.last_name,
        excludeLeadId: lead?.id,
      });

      if (matches.length > 0) {
        setDuplicateMatches(matches);
        setPendingSubmit(data);
        setShowDuplicateWarning(true);
        return;
      }

      // No duplicates, proceed with submission
      await performSubmit(data);
    } finally {
      setIsCheckingDuplicates(false);
    }
  };

  const handleProceedAnyway = async () => {
    if (pendingSubmit) {
      await performSubmit(pendingSubmit);
      setShowDuplicateWarning(false);
      setPendingSubmit(null);
    }
  };

  const isPending = createLead.isPending || updateLead.isPending || isCheckingDuplicates;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">
              {isEditing ? 'EDIT LEAD' : 'NEW LEAD'}
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? 'Update the lead information below.'
                : 'Enter the lead\'s information to add them to the pipeline.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="John" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Doe" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="john@example.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="(555) 123-4567" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead Source *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select source" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="phone">Phone Call</SelectItem>
                          <SelectItem value="web_form">Web Form</SelectItem>
                          <SelectItem value="referral">Referral</SelectItem>
                          <SelectItem value="advertisement">Advertisement</SelectItem>
                          <SelectItem value="walk_in">Walk-in</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="interest_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interest Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="debt_resolution">Debt Resolution</SelectItem>
                          <SelectItem value="litigation">Litigation</SelectItem>
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
                  name="estimated_debt_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Debt Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="50000"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="number_of_debts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Debts</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="5"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="assigned_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign To</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select sales rep" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {salesStaff?.map((staff) => (
                          <SelectItem key={staff.id} value={staff.id}>
                            {staff.first_name} {staff.last_name}
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
                name="has_active_lawsuit"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Has active lawsuit</FormLabel>
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
                      <Textarea
                        {...field}
                        placeholder="Additional information about the lead..."
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isCheckingDuplicates ? 'Checking...' : isEditing ? 'Update Lead' : 'Create Lead'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <DuplicateWarningDialog
        open={showDuplicateWarning}
        onOpenChange={setShowDuplicateWarning}
        matches={duplicateMatches}
        mode="create"
        onProceed={handleProceedAnyway}
        isLoading={createLead.isPending || updateLead.isPending}
      />
    </>
  );
}
