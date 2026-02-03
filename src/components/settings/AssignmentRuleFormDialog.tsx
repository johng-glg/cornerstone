import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/auth';
import { useCreateAssignmentRule, useUpdateAssignmentRule } from '@/hooks/useAssignmentRules';
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
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Users } from 'lucide-react';
import { AssignmentPoolEditor } from './AssignmentPoolEditor';
import type { AssignmentRule, AssignmentMethod } from '@/types/assignment';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  method: z.enum(['round_robin', 'weighted', 'backlog_based', 'skillset_match']),
  is_active: z.boolean(),
  is_default: z.boolean(),
  source: z.string().optional(),
  interest_type: z.string().optional(),
  min_debt_amount: z.coerce.number().optional(),
  max_debt_amount: z.coerce.number().optional(),
  priority: z.coerce.number().min(0).max(100),
  auto_assign: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface AssignmentRuleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: AssignmentRule;
}

export function AssignmentRuleFormDialog({
  open,
  onOpenChange,
  rule,
}: AssignmentRuleFormDialogProps) {
  const { staff } = useAuth();
  const createRule = useCreateAssignmentRule();
  const updateRule = useUpdateAssignmentRule();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      method: 'round_robin',
      is_active: true,
      is_default: false,
      source: '',
      interest_type: '',
      min_debt_amount: undefined,
      max_debt_amount: undefined,
      priority: 0,
      auto_assign: true,
    },
  });

  useEffect(() => {
    if (rule) {
      form.reset({
        name: rule.name,
        description: rule.description || '',
        method: rule.method,
        is_active: rule.is_active,
        is_default: rule.is_default,
        source: rule.source || '',
        interest_type: rule.interest_type || '',
        min_debt_amount: rule.min_debt_amount || undefined,
        max_debt_amount: rule.max_debt_amount || undefined,
        priority: rule.priority,
        auto_assign: rule.config?.auto_assign ?? true,
      });
    } else {
      form.reset({
        name: '',
        description: '',
        method: 'round_robin',
        is_active: true,
        is_default: false,
        source: '',
        interest_type: '',
        min_debt_amount: undefined,
        max_debt_amount: undefined,
        priority: 0,
        auto_assign: true,
      });
    }
  }, [rule, form, open]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      name: values.name,
      description: values.description || null,
      method: values.method as AssignmentMethod,
      is_active: values.is_active,
      is_default: values.is_default,
      source: values.source || null,
      interest_type: values.interest_type || null,
      min_debt_amount: values.min_debt_amount || null,
      max_debt_amount: values.max_debt_amount || null,
      priority: values.priority,
      config: {
        auto_assign: values.auto_assign,
      },
    };

    if (rule) {
      await updateRule.mutateAsync({ id: rule.id, ...payload });
    } else {
      if (!staff?.company_id) return;
      await createRule.mutateAsync({ ...payload, company_id: staff.company_id });
    }

    onOpenChange(false);
  };

  const isPending = createRule.isPending || updateRule.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? 'Edit Assignment Rule' : 'Create Assignment Rule'}</DialogTitle>
          <DialogDescription>
            Configure how leads matching this rule are assigned to sales reps.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Rule Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., High-Value Leads" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe when this rule applies..."
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignment Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="round_robin">Round Robin</SelectItem>
                        <SelectItem value="weighted">Weighted Distribution</SelectItem>
                        <SelectItem value="backlog_based">Load Balanced</SelectItem>
                        <SelectItem value="skillset_match">Skillset Match</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {field.value === 'round_robin' && 'Assigns leads in rotation, one per rep in order'}
                      {field.value === 'weighted' && 'Distributes leads based on weight percentages set per rep'}
                      {field.value === 'backlog_based' && 'Prioritizes reps with the fewest active leads'}
                      {field.value === 'skillset_match' && 'Matches lead attributes to rep skill tags'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} max={100} {...field} />
                    </FormControl>
                    <FormDescription>
                      Higher priority rules are checked first
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Matching Criteria</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Leave blank to match all leads, or specify criteria to narrow the scope.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead Source</FormLabel>
                      <Select 
                        onValueChange={(val) => field.onChange(val === '__any__' ? '' : val)} 
                        value={field.value || '__any__'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Any source" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__any__">Any Source</SelectItem>
                          <SelectItem value="web_form">Web Form</SelectItem>
                          <SelectItem value="phone">Phone</SelectItem>
                          <SelectItem value="referral">Referral</SelectItem>
                          <SelectItem value="advertisement">Advertisement</SelectItem>
                          <SelectItem value="walk_in">Walk In</SelectItem>
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
                      <FormLabel>Interest Type</FormLabel>
                      <Select 
                        onValueChange={(val) => field.onChange(val === '__any__' ? '' : val)} 
                        value={field.value || '__any__'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Any type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__any__">Any Type</SelectItem>
                          <SelectItem value="debt_resolution">Debt Resolution</SelectItem>
                          <SelectItem value="litigation">Litigation</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="min_debt_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Debt Amount</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_debt_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Debt Amount</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="No limit" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="border-t pt-4 space-y-4">
              <h4 className="font-medium">Settings</h4>
              
              <FormField
                control={form.control}
                name="auto_assign"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel className="font-normal">Auto-assign leads</FormLabel>
                      <FormDescription>
                        Automatically assign matching leads when created
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel className="font-normal">Active</FormLabel>
                      <FormDescription>
                        Enable this rule for lead assignment
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_default"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel className="font-normal">Default Rule</FormLabel>
                      <FormDescription>
                        Use when no other rules match
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {rule ? (
              <div className="border-t pt-4">
                <AssignmentPoolEditor ruleId={rule.id} method={form.watch('method')} />
              </div>
            ) : (
              <div className="border-t pt-4">
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span className="font-medium">Assignment Pool</span>
                  </div>
                  {form.watch('method') === 'weighted' ? (
                    <div className="text-sm space-y-2">
                      <p className="text-muted-foreground">
                        After creating the rule, you'll be able to add staff members and set their <strong>weight values</strong>.
                      </p>
                      <div className="bg-background rounded border p-3 text-xs space-y-1">
                        <p className="font-medium">How weights work:</p>
                        <p className="text-muted-foreground">
                          Weights are relative values. For example, if Rep A has weight 20 and Rep B has weight 10, 
                          Rep A receives ~67% of leads and Rep B receives ~33%.
                        </p>
                      </div>
                    </div>
                  ) : form.watch('method') === 'skillset_match' ? (
                    <div className="text-sm space-y-2">
                      <p className="text-muted-foreground">
                        After creating the rule, you'll be able to add staff members and configure their <strong>skill tags</strong>.
                      </p>
                      <div className="bg-background rounded border p-3 text-xs space-y-1">
                        <p className="font-medium">How skillset matching works:</p>
                        <p className="text-muted-foreground">
                          Leads are matched to reps based on interest type, debt range, and other attributes you configure per rep.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      After creating the rule, you'll be able to add staff members to the assignment pool.
                    </p>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {rule ? 'Save Changes' : 'Create Rule'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
