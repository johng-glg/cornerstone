import { useEffect } from 'react';
import { useEnrollmentWizard } from '../EnrollmentWizardContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Calendar, DollarSign, Clock, AlertTriangle } from 'lucide-react';

const PLAN_TYPES = [
  {
    value: 'glg_standard',
    label: 'GLG 2.0 Standard',
    description: '25% settlement fee, est. 55% settlement rate',
    badge: 'Most Common',
  },
  {
    value: 'glg_adjustable',
    label: 'GLG Adjustable',
    description: 'Higher settlement % (55-70%) for aggressive creditors',
    badge: null,
  },
  {
    value: 'glg_exception',
    label: 'GLG Exception',
    description: 'Extended terms up to 54 months',
    badge: 'Requires Approval',
  },
];

const PAYMENT_FREQUENCIES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'semi_monthly', label: 'Semi-Monthly (2x/month)' },
  { value: 'bi_weekly', label: 'Bi-Weekly (every 2 weeks)' },
];

export function PlanSelectionStep() {
  const { 
    data, 
    updateData, 
    setCanProceed, 
    totalEnrolledDebt, 
    planOptions 
  } = useEnrollmentWizard();

  // Require term selection and first payment date to proceed
  useEffect(() => {
    const isValid = 
      !!data.selected_term_months && 
      !!data.first_payment_date &&
      !!data.plan_type;
    setCanProceed(isValid);
  }, [data.selected_term_months, data.first_payment_date, data.plan_type, setCanProceed]);

  // Auto-select monthly draft when term is selected
  const handleTermSelect = (termMonths: number) => {
    const option = planOptions.find(p => p.termMonths === termMonths);
    if (option) {
      updateData({ 
        selected_term_months: termMonths,
        selected_monthly_draft: Math.round(option.monthlyDraft * 100) / 100,
      });
    }
  };

  // Calculate max date (30 days from now)
  const today = new Date();
  const maxDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const minDateStr = today.toISOString().split('T')[0];
  const maxDateStr = maxDate.toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Plan Selection</h3>
        <p className="text-sm text-muted-foreground">
          Select program terms based on total enrolled debt of ${totalEnrolledDebt.toLocaleString()}
        </p>
      </div>

      {/* Term Options */}
      <div className="space-y-3">
        <Label className="text-base">Select Program Term</Label>
        <div className="grid grid-cols-2 gap-3">
          {planOptions.map((option) => (
            <Card
              key={option.termMonths}
              className={cn(
                "cursor-pointer transition-all hover:border-primary/50",
                data.selected_term_months === option.termMonths && "border-primary bg-primary/5"
              )}
              onClick={() => handleTermSelect(option.termMonths)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{option.termMonths} Months</span>
                  </div>
                  {option.isMinimumDraft && (
                    <Badge variant="outline" className="text-xs">
                      Min Draft
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Monthly Draft</span>
                    <span className="font-medium">
                      ${option.monthlyDraft.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Program Cost</span>
                    <span className="font-medium">
                      ${option.totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {planOptions.some(p => p.isMinimumDraft) && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Some terms show minimum draft of $350 (calculated draft was lower)
          </p>
        )}
      </div>

      {/* Plan Type */}
      <div className="space-y-3">
        <Label className="text-base">Plan Type</Label>
        <RadioGroup
          value={data.plan_type || ''}
          onValueChange={(value) => updateData({ plan_type: value as any })}
          className="space-y-2"
        >
          {PLAN_TYPES.map((plan) => (
            <div
              key={plan.value}
              className={cn(
                "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors",
                data.plan_type === plan.value 
                  ? "border-primary bg-primary/5" 
                  : "hover:bg-muted/50"
              )}
              onClick={() => updateData({ plan_type: plan.value as any })}
            >
              <RadioGroupItem value={plan.value} id={plan.value} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <label htmlFor={plan.value} className="font-medium cursor-pointer">
                    {plan.label}
                  </label>
                  {plan.badge && (
                    <Badge variant={plan.value === 'glg_exception' ? 'secondary' : 'default'} className="text-xs">
                      {plan.badge}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Payment Details */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_payment_date">First Payment Date *</Label>
          <Input
            id="first_payment_date"
            type="date"
            value={data.first_payment_date || ''}
            onChange={(e) => updateData({ first_payment_date: e.target.value })}
            min={minDateStr}
            max={maxDateStr}
          />
          <p className="text-xs text-muted-foreground">Must be within 30 days</p>
        </div>
        <div className="space-y-2">
          <Label>Payment Frequency</Label>
          <Select
            value={data.payment_frequency || 'monthly'}
            onValueChange={(value) => updateData({ payment_frequency: value as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_FREQUENCIES.map((freq) => (
                <SelectItem key={freq.value} value={freq.value}>
                  {freq.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary */}
      {data.selected_term_months && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Selected Plan Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Term:</span>{' '}
                <span className="font-medium">{data.selected_term_months} months</span>
              </div>
              <div>
                <span className="text-muted-foreground">Monthly Draft:</span>{' '}
                <span className="font-medium">
                  ${data.selected_monthly_draft?.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">First Payment:</span>{' '}
                <span className="font-medium">{data.first_payment_date || 'Not set'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Plan Type:</span>{' '}
                <span className="font-medium capitalize">
                  {data.plan_type?.replace('glg_', 'GLG ').replace('_', ' ')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
