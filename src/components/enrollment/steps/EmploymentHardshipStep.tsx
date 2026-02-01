import { useEffect } from 'react';
import { useEnrollmentWizard } from '../EnrollmentWizardContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Briefcase, TrendingDown } from 'lucide-react';

const EMPLOYMENT_STATUSES = [
  { value: 'employed', label: 'Employed' },
  { value: 'unemployed', label: 'Unemployed' },
  { value: 'self_employed', label: 'Self-Employed' },
  { value: 'retired', label: 'Retired' },
  { value: 'disabled', label: 'Disabled' },
];

const HARDSHIP_REASONS = [
  { value: 'job_loss', label: 'Job Loss' },
  { value: 'medical_emergency', label: 'Medical Emergency' },
  { value: 'divorce', label: 'Divorce / Separation' },
  { value: 'reduced_income', label: 'Reduced Income' },
  { value: 'business_failure', label: 'Business Failure' },
  { value: 'other', label: 'Other' },
];

export function EmploymentHardshipStep() {
  const { data, updateData, setCanProceed } = useEnrollmentWizard();

  const showEmployerFields = data.employment_status === 'employed' || data.employment_status === 'self_employed';
  const showHardshipNotes = data.hardship_reason === 'other';

  // Always allow proceeding - this step is optional
  useEffect(() => {
    setCanProceed(true);
  }, [setCanProceed]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Employment & Hardship</h3>
        <p className="text-sm text-muted-foreground">
          Document the client's employment status and financial hardship reason.
        </p>
      </div>

      {/* Employment Section */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="h-5 w-5 text-muted-foreground" />
            <h4 className="font-medium">Employment Information</h4>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employment_status">Employment Status</Label>
              <Select
                value={data.employment_status || ''}
                onValueChange={(value) => updateData({ employment_status: value as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthly_income">Monthly Income (Approximate)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="monthly_income"
                  type="number"
                  value={data.monthly_income || ''}
                  onChange={(e) => updateData({ monthly_income: parseFloat(e.target.value) || undefined })}
                  placeholder="0.00"
                  className="pl-7"
                />
              </div>
            </div>
          </div>

          {showEmployerFields && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employer_name">
                  {data.employment_status === 'self_employed' ? 'Business Name' : 'Employer Name'}
                </Label>
                <Input
                  id="employer_name"
                  value={data.employer_name || ''}
                  onChange={(e) => updateData({ employer_name: e.target.value })}
                  placeholder={data.employment_status === 'self_employed' ? 'Your business name' : 'Company name'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job_title">Job Title</Label>
                <Input
                  id="job_title"
                  value={data.job_title || ''}
                  onChange={(e) => updateData({ job_title: e.target.value })}
                  placeholder="Your position"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hardship Section */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="h-5 w-5 text-muted-foreground" />
            <h4 className="font-medium">Financial Hardship</h4>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hardship_reason">Primary Reason for Hardship</Label>
            <Select
              value={data.hardship_reason || ''}
              onValueChange={(value) => updateData({ hardship_reason: value as any })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {HARDSHIP_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hardship_notes">
              {showHardshipNotes ? 'Please describe the hardship *' : 'Additional Notes (Optional)'}
            </Label>
            <Textarea
              id="hardship_notes"
              value={data.hardship_notes || ''}
              onChange={(e) => updateData({ hardship_notes: e.target.value })}
              placeholder="Describe the circumstances that led to financial difficulty..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              This information helps us understand the client's situation and document their case.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
