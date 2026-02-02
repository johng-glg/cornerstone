import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateScoringProfile, useUpdateScoringProfile } from '@/hooks/useScoringProfiles';
import { useCurrentStaff } from '@/hooks/useStaff';
import { DEFAULT_SCORING_CRITERIA, type ScoringProfile, type ScoringCriteria } from '@/types/scoring';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  interest_type: z.enum(['debt_resolution', 'litigation', 'both']).nullable(),
  source: z.enum(['phone', 'web_form', 'referral', 'advertisement', 'walk_in', 'other']).nullable(),
  is_active: z.boolean(),
  // Criteria fields
  estimated_debt_enabled: z.boolean(),
  estimated_debt_t1_min: z.coerce.number().optional(),
  estimated_debt_t1_max: z.coerce.number().optional(),
  estimated_debt_t1_points: z.coerce.number().optional(),
  estimated_debt_t2_min: z.coerce.number().optional(),
  estimated_debt_t2_max: z.coerce.number().optional(),
  estimated_debt_t2_points: z.coerce.number().optional(),
  estimated_debt_t3_min: z.coerce.number().optional(),
  estimated_debt_t3_points: z.coerce.number().optional(),
  number_of_debts_enabled: z.boolean(),
  number_of_debts_t1_min: z.coerce.number().optional(),
  number_of_debts_t1_max: z.coerce.number().optional(),
  number_of_debts_t1_points: z.coerce.number().optional(),
  number_of_debts_t2_min: z.coerce.number().optional(),
  number_of_debts_t2_points: z.coerce.number().optional(),
  has_active_lawsuit_points: z.coerce.number().optional(),
  has_active_lawsuit_litigation_only: z.boolean(),
  credit_auth_points: z.coerce.number().optional(),
  email_provided_points: z.coerce.number().optional(),
  phone_provided_points: z.coerce.number().optional(),
  source_referral_points: z.coerce.number().optional(),
  source_phone_points: z.coerce.number().optional(),
  source_web_form_points: z.coerce.number().optional(),
  source_advertisement_points: z.coerce.number().optional(),
  source_walk_in_points: z.coerce.number().optional(),
  source_other_points: z.coerce.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ScoringProfileFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: ScoringProfile;
}

function criteriaToFormValues(criteria: ScoringCriteria): Partial<FormValues> {
  const c = criteria;
  return {
    estimated_debt_enabled: !!c.estimated_debt,
    estimated_debt_t1_min: c.estimated_debt?.thresholds?.[0]?.min,
    estimated_debt_t1_max: c.estimated_debt?.thresholds?.[0]?.max,
    estimated_debt_t1_points: c.estimated_debt?.thresholds?.[0]?.points,
    estimated_debt_t2_min: c.estimated_debt?.thresholds?.[1]?.min,
    estimated_debt_t2_max: c.estimated_debt?.thresholds?.[1]?.max,
    estimated_debt_t2_points: c.estimated_debt?.thresholds?.[1]?.points,
    estimated_debt_t3_min: c.estimated_debt?.thresholds?.[2]?.min,
    estimated_debt_t3_points: c.estimated_debt?.thresholds?.[2]?.points,
    number_of_debts_enabled: !!c.number_of_debts,
    number_of_debts_t1_min: c.number_of_debts?.thresholds?.[0]?.min,
    number_of_debts_t1_max: c.number_of_debts?.thresholds?.[0]?.max,
    number_of_debts_t1_points: c.number_of_debts?.thresholds?.[0]?.points,
    number_of_debts_t2_min: c.number_of_debts?.thresholds?.[1]?.min,
    number_of_debts_t2_points: c.number_of_debts?.thresholds?.[1]?.points,
    has_active_lawsuit_points: c.has_active_lawsuit?.points,
    has_active_lawsuit_litigation_only: c.has_active_lawsuit?.only_for_interest_types?.includes('litigation') ?? false,
    credit_auth_points: c.credit_auth_given?.points,
    email_provided_points: c.email_provided?.points,
    phone_provided_points: c.phone_provided?.points,
    source_referral_points: c.source_quality?.referral,
    source_phone_points: c.source_quality?.phone,
    source_web_form_points: c.source_quality?.web_form,
    source_advertisement_points: c.source_quality?.advertisement,
    source_walk_in_points: c.source_quality?.walk_in,
    source_other_points: c.source_quality?.other,
  };
}

function formValuesToCriteria(values: FormValues): ScoringCriteria {
  const criteria: ScoringCriteria = {};

  if (values.estimated_debt_enabled && values.estimated_debt_t1_points) {
    const thresholds = [];
    if (values.estimated_debt_t1_min && values.estimated_debt_t1_points) {
      thresholds.push({
        min: values.estimated_debt_t1_min,
        max: values.estimated_debt_t1_max,
        points: values.estimated_debt_t1_points,
      });
    }
    if (values.estimated_debt_t2_min && values.estimated_debt_t2_points) {
      thresholds.push({
        min: values.estimated_debt_t2_min,
        max: values.estimated_debt_t2_max,
        points: values.estimated_debt_t2_points,
      });
    }
    if (values.estimated_debt_t3_min && values.estimated_debt_t3_points) {
      thresholds.push({
        min: values.estimated_debt_t3_min,
        points: values.estimated_debt_t3_points,
      });
    }
    if (thresholds.length > 0) {
      criteria.estimated_debt = { thresholds };
    }
  }

  if (values.number_of_debts_enabled && values.number_of_debts_t1_points) {
    const thresholds = [];
    if (values.number_of_debts_t1_min && values.number_of_debts_t1_points) {
      thresholds.push({
        min: values.number_of_debts_t1_min,
        max: values.number_of_debts_t1_max,
        points: values.number_of_debts_t1_points,
      });
    }
    if (values.number_of_debts_t2_min && values.number_of_debts_t2_points) {
      thresholds.push({
        min: values.number_of_debts_t2_min,
        points: values.number_of_debts_t2_points,
      });
    }
    if (thresholds.length > 0) {
      criteria.number_of_debts = { thresholds };
    }
  }

  if (values.has_active_lawsuit_points) {
    criteria.has_active_lawsuit = {
      points: values.has_active_lawsuit_points,
      ...(values.has_active_lawsuit_litigation_only && {
        only_for_interest_types: ['litigation'],
      }),
    };
  }

  if (values.credit_auth_points) {
    criteria.credit_auth_given = { points: values.credit_auth_points };
  }

  if (values.email_provided_points) {
    criteria.email_provided = { points: values.email_provided_points };
  }

  if (values.phone_provided_points) {
    criteria.phone_provided = { points: values.phone_provided_points };
  }

  const sourceQuality: Record<string, number> = {};
  if (values.source_referral_points) sourceQuality.referral = values.source_referral_points;
  if (values.source_phone_points) sourceQuality.phone = values.source_phone_points;
  if (values.source_web_form_points) sourceQuality.web_form = values.source_web_form_points;
  if (values.source_advertisement_points) sourceQuality.advertisement = values.source_advertisement_points;
  if (values.source_walk_in_points) sourceQuality.walk_in = values.source_walk_in_points;
  if (values.source_other_points) sourceQuality.other = values.source_other_points;
  if (Object.keys(sourceQuality).length > 0) {
    criteria.source_quality = sourceQuality;
  }

  return criteria;
}

export function ScoringProfileFormDialog({
  open,
  onOpenChange,
  profile,
}: ScoringProfileFormDialogProps) {
  const { data: currentStaff } = useCurrentStaff();
  const createProfile = useCreateScoringProfile();
  const updateProfile = useUpdateScoringProfile();
  const isEditing = !!profile;

  const defaultCriteriaValues = criteriaToFormValues(DEFAULT_SCORING_CRITERIA);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      interest_type: null,
      source: null,
      is_active: true,
      estimated_debt_enabled: true,
      number_of_debts_enabled: true,
      has_active_lawsuit_litigation_only: true,
      ...defaultCriteriaValues,
    },
  });

  useEffect(() => {
    if (open) {
      if (profile) {
        const criteriaValues = criteriaToFormValues(profile.criteria);
        form.reset({
          name: profile.name,
          description: profile.description || '',
          interest_type: profile.interest_type,
          source: profile.source,
          is_active: profile.is_active,
          estimated_debt_enabled: !!profile.criteria.estimated_debt,
          number_of_debts_enabled: !!profile.criteria.number_of_debts,
          has_active_lawsuit_litigation_only: profile.criteria.has_active_lawsuit?.only_for_interest_types?.includes('litigation') ?? true,
          ...criteriaValues,
        });
      } else {
        form.reset({
          name: '',
          description: '',
          interest_type: null,
          source: null,
          is_active: true,
          estimated_debt_enabled: true,
          number_of_debts_enabled: true,
          has_active_lawsuit_litigation_only: true,
          ...defaultCriteriaValues,
        });
      }
    }
  }, [open, profile, form]);

  const onSubmit = async (values: FormValues) => {
    if (!currentStaff?.company_id) return;

    const criteria = formValuesToCriteria(values);

    if (isEditing && profile) {
      await updateProfile.mutateAsync({
        id: profile.id,
        name: values.name,
        description: values.description || null,
        interest_type: values.interest_type,
        source: values.source,
        is_active: values.is_active,
        criteria,
      });
    } else {
      await createProfile.mutateAsync({
        company_id: currentStaff.company_id,
        name: values.name,
        description: values.description || null,
        interest_type: values.interest_type,
        source: values.source,
        is_default: false,
        is_active: values.is_active,
        criteria,
      });
    }

    onOpenChange(false);
  };

  const isPending = createProfile.isPending || updateProfile.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Scoring Profile' : 'Create Scoring Profile'}</DialogTitle>
          <DialogDescription>
            Configure scoring criteria to automatically calculate lead priority scores.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profile Name</FormLabel>
                    <FormControl>
                      <Input placeholder="High-Value Debt Resolution" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Active</FormLabel>
                      <FormDescription className="text-xs">
                        Enable this profile
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe when this profile should be used..." 
                      rows={2}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Targeting */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="interest_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interest Type</FormLabel>
                    <Select 
                      value={field.value ?? 'all'} 
                      onValueChange={(v) => field.onChange(v === 'all' ? null : v)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="All interest types" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">All interest types</SelectItem>
                        <SelectItem value="debt_resolution">Debt Resolution</SelectItem>
                        <SelectItem value="litigation">Litigation</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      Only apply to specific interest types
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead Source</FormLabel>
                    <Select 
                      value={field.value ?? 'all'} 
                      onValueChange={(v) => field.onChange(v === 'all' ? null : v)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="All sources" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">All sources</SelectItem>
                        <SelectItem value="referral">Referral</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                        <SelectItem value="web_form">Web Form</SelectItem>
                        <SelectItem value="advertisement">Advertisement</SelectItem>
                        <SelectItem value="walk_in">Walk-in</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      Only apply to specific lead sources
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Scoring Criteria */}
            <Accordion type="multiple" defaultValue={['debt', 'boolean', 'source']} className="w-full">
              {/* Estimated Debt */}
              <AccordionItem value="debt">
                <AccordionTrigger>Debt Criteria</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="estimated_debt_enabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="!mt-0">Score by Estimated Debt</FormLabel>
                      </FormItem>
                    )}
                  />
                  
                  {form.watch('estimated_debt_enabled') && (
                    <div className="grid gap-3 pl-4 border-l-2">
                      <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                        <span>Min ($)</span>
                        <span>Max ($)</span>
                        <span>Points</span>
                        <span></span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <Input type="number" {...form.register('estimated_debt_t1_min')} placeholder="10000" />
                        <Input type="number" {...form.register('estimated_debt_t1_max')} placeholder="24999" />
                        <Input type="number" {...form.register('estimated_debt_t1_points')} placeholder="10" />
                        <span className="text-xs text-muted-foreground self-center">Tier 1</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <Input type="number" {...form.register('estimated_debt_t2_min')} placeholder="25000" />
                        <Input type="number" {...form.register('estimated_debt_t2_max')} placeholder="49999" />
                        <Input type="number" {...form.register('estimated_debt_t2_points')} placeholder="20" />
                        <span className="text-xs text-muted-foreground self-center">Tier 2</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <Input type="number" {...form.register('estimated_debt_t3_min')} placeholder="50000" />
                        <Input disabled placeholder="No max" />
                        <Input type="number" {...form.register('estimated_debt_t3_points')} placeholder="30" />
                        <span className="text-xs text-muted-foreground self-center">Tier 3</span>
                      </div>
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="number_of_debts_enabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 mt-4">
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="!mt-0">Score by Number of Debts</FormLabel>
                      </FormItem>
                    )}
                  />

                  {form.watch('number_of_debts_enabled') && (
                    <div className="grid gap-3 pl-4 border-l-2">
                      <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                        <span>Min</span>
                        <span>Max</span>
                        <span>Points</span>
                        <span></span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <Input type="number" {...form.register('number_of_debts_t1_min')} placeholder="3" />
                        <Input type="number" {...form.register('number_of_debts_t1_max')} placeholder="4" />
                        <Input type="number" {...form.register('number_of_debts_t1_points')} placeholder="10" />
                        <span className="text-xs text-muted-foreground self-center">Tier 1</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <Input type="number" {...form.register('number_of_debts_t2_min')} placeholder="5" />
                        <Input disabled placeholder="No max" />
                        <Input type="number" {...form.register('number_of_debts_t2_points')} placeholder="15" />
                        <span className="text-xs text-muted-foreground self-center">Tier 2</span>
                      </div>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Boolean Criteria */}
              <AccordionItem value="boolean">
                <AccordionTrigger>Boolean Criteria</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="has_active_lawsuit_points"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Active Lawsuit Points</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="20" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="has_active_lawsuit_litigation_only"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 pt-8">
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="!mt-0 text-sm">Litigation only</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="credit_auth_points"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Credit Auth Points</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="15" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email_provided_points"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Points</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="5" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone_provided_points"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Points</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="5" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Source Quality */}
              <AccordionItem value="source">
                <AccordionTrigger>Source Quality</AccordionTrigger>
                <AccordionContent className="pt-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="source_referral_points"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Referral</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="10" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="source_phone_points"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="8" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="source_web_form_points"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Web Form</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="6" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="source_advertisement_points"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Advertisement</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="4" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="source_walk_in_points"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Walk-in</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="5" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="source_other_points"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Other</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="2" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Save Changes' : 'Create Profile'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
