import { useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ELIGIBLE_STATES, type LitigationData } from '../LitigationWizard';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

interface LitigationEligibilityStepProps {
  data: LitigationData;
  updateData: (updates: Partial<LitigationData>) => void;
  setCanProceed: (can: boolean) => void;
  eligibilityErrors: string[];
}

export function LitigationEligibilityStep({
  data,
  updateData,
  setCanProceed,
  eligibilityErrors,
}: LitigationEligibilityStepProps) {
  // Check if form is filled out
  useEffect(() => {
    const isValid = 
      !!data.state && 
      !!data.debt_amount && 
      data.debt_amount > 0 &&
      data.case_type === 'debt_defense';
    setCanProceed(isValid);
  }, [data.state, data.debt_amount, data.case_type, setCanProceed]);

  const isStateEligible = data.state && ELIGIBLE_STATES.includes(data.state);
  const isDebtEligible = data.debt_amount && data.debt_amount >= 1000;
  const isCaseTypeEligible = data.case_type === 'debt_defense';

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="font-heading text-lg font-semibold">Eligibility Check</h3>
        <p className="text-sm text-muted-foreground">
          Verify the lead meets the requirements for litigation representation.
        </p>
      </div>

      {eligibilityErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Eligibility Issues</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4 space-y-1 mt-2">
              {eligibilityErrors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>State *</Label>
          <Select
            value={data.state || ''}
            onValueChange={(v) => updateData({ state: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map((state) => (
                <SelectItem key={state} value={state}>
                  {state} {ELIGIBLE_STATES.includes(state) && '✓'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {data.state && (
            <div className={`flex items-center gap-1 text-xs ${isStateEligible ? 'text-green-600' : 'text-destructive'}`}>
              {isStateEligible ? (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  Eligible state
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3" />
                  Not in service area ({ELIGIBLE_STATES.join(', ')})
                </>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Debt Amount *</Label>
          <Input
            type="number"
            min="0"
            placeholder="0.00"
            value={data.debt_amount || ''}
            onChange={(e) => updateData({ debt_amount: e.target.value ? Number(e.target.value) : undefined })}
          />
          {data.debt_amount !== undefined && (
            <div className={`flex items-center gap-1 text-xs ${isDebtEligible ? 'text-green-600' : 'text-destructive'}`}>
              {isDebtEligible ? (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  Meets minimum ($1,000)
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3" />
                  Below minimum ($1,000)
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Case Type *</Label>
        <Select
          value={data.case_type || ''}
          onValueChange={(v) => updateData({ case_type: v as 'debt_defense' | 'other' })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select case type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="debt_defense">Debt Defense</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        {data.case_type && (
          <div className={`flex items-center gap-1 text-xs ${isCaseTypeEligible ? 'text-green-600' : 'text-destructive'}`}>
            {isCaseTypeEligible ? (
              <>
                <CheckCircle2 className="h-3 w-3" />
                Eligible case type
              </>
            ) : (
              <>
                <AlertTriangle className="h-3 w-3" />
                Only debt defense cases are currently accepted
              </>
            )}
          </div>
        )}
      </div>

      <Alert>
        <AlertDescription className="text-sm">
          <strong>Eligibility Requirements:</strong>
          <ul className="list-disc pl-4 mt-2 space-y-1">
            <li>Client must be located in: {ELIGIBLE_STATES.join(', ')}</li>
            <li>Debt amount must be at least $1,000</li>
            <li>Must be a debt defense case type</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
