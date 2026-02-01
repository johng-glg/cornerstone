import { useEffect } from 'react';
import { useEnrollmentWizard } from '../EnrollmentWizardContext';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'District of Columbia' },
];

const PROHIBITED_STATES = ['MN', 'DE', 'WI'];

export function IntakeEligibilityStep() {
  const { data, updateData, setCanProceed } = useEnrollmentWizard();

  const isProhibitedState = data.state && PROHIBITED_STATES.includes(data.state);
  const isDisqualified = 
    isProhibitedState || 
    data.in_bankruptcy || 
    data.has_federal_accounts || 
    !data.secured_credit_resolved;

  // Update canProceed when eligibility changes
  useEffect(() => {
    const hasState = !!data.state;
    setCanProceed(hasState && !isDisqualified);
  }, [data.state, isDisqualified, setCanProceed]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Eligibility Verification</h3>
        <p className="text-sm text-muted-foreground">
          Verify that the client qualifies for the Consumer Defense program.
        </p>
      </div>

      {/* State Selection */}
      <div className="space-y-2">
        <Label>State of Residence *</Label>
        <Select
          value={data.state || ''}
          onValueChange={(value) => updateData({ state: value })}
        >
          <SelectTrigger className={cn(isProhibitedState && 'border-destructive')}>
            <SelectValue placeholder="Select state" />
          </SelectTrigger>
          <SelectContent>
            {US_STATES.map((state) => (
              <SelectItem 
                key={state.value} 
                value={state.value}
                className={cn(PROHIBITED_STATES.includes(state.value) && 'text-destructive')}
              >
                {state.label}
                {PROHIBITED_STATES.includes(state.value) && ' (Not Available)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isProhibitedState && (
          <p className="text-sm text-destructive">
            Consumer Defense services are not available in this state.
          </p>
        )}
      </div>

      {/* Eligibility Questions */}
      <div className="space-y-4">
        <Label className="text-base">Eligibility Questions</Label>
        
        <div className="space-y-3 pl-1">
          <div className="flex items-start gap-3">
            <Checkbox
              id="in_bankruptcy"
              checked={data.in_bankruptcy}
              onCheckedChange={(checked) => 
                updateData({ in_bankruptcy: checked === true })
              }
            />
            <div className="space-y-1">
              <label 
                htmlFor="in_bankruptcy" 
                className={cn(
                  "text-sm font-medium cursor-pointer",
                  data.in_bankruptcy && "text-destructive"
                )}
              >
                Is the client currently in active bankruptcy?
              </label>
              {data.in_bankruptcy && (
                <p className="text-xs text-destructive">
                  Clients in active bankruptcy cannot enroll in this program.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="has_federal_accounts"
              checked={data.has_federal_accounts}
              onCheckedChange={(checked) => 
                updateData({ has_federal_accounts: checked === true })
              }
            />
            <div className="space-y-1">
              <label 
                htmlFor="has_federal_accounts" 
                className={cn(
                  "text-sm font-medium cursor-pointer",
                  data.has_federal_accounts && "text-destructive"
                )}
              >
                Does the client have any federal debt accounts? (IRS, student loans, etc.)
              </label>
              {data.has_federal_accounts && (
                <p className="text-xs text-destructive">
                  Federal accounts cannot be enrolled in this program.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="secured_credit_resolved"
              checked={data.secured_credit_resolved}
              onCheckedChange={(checked) => 
                updateData({ secured_credit_resolved: checked === true })
              }
            />
            <div className="space-y-1">
              <label 
                htmlFor="secured_credit_resolved" 
                className={cn(
                  "text-sm font-medium cursor-pointer",
                  !data.secured_credit_resolved && "text-destructive"
                )}
              >
                Are all secured credit issues resolved? (No active repossession, foreclosure)
              </label>
              {!data.secured_credit_resolved && (
                <p className="text-xs text-destructive">
                  Secured credit issues must be resolved before enrollment.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="has_security_clearance"
              checked={data.has_security_clearance}
              onCheckedChange={(checked) => 
                updateData({ has_security_clearance: checked === true })
              }
            />
            <div className="space-y-1">
              <label 
                htmlFor="has_security_clearance" 
                className="text-sm font-medium cursor-pointer"
              >
                Does the client have a security clearance?
              </label>
              {data.has_security_clearance && (
                <p className="text-xs text-amber-600">
                  Note: Client should be informed about potential clearance impacts.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Alert */}
      {data.state && (
        <Alert variant={isDisqualified ? 'destructive' : 'default'} className={cn(!isDisqualified && 'border-green-500 bg-green-50 dark:bg-green-950/20')}>
          {isDisqualified ? (
            <>
              <XCircle className="h-4 w-4" />
              <AlertTitle>Not Eligible</AlertTitle>
              <AlertDescription>
                This client does not qualify for the Consumer Defense program based on the information provided.
              </AlertDescription>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-700 dark:text-green-400">Eligible to Proceed</AlertTitle>
              <AlertDescription className="text-green-600 dark:text-green-300">
                Client meets initial eligibility requirements. Continue with the intake process.
              </AlertDescription>
            </>
          )}
        </Alert>
      )}

      {data.has_security_clearance && !isDisqualified && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Security Clearance Flag</AlertTitle>
          <AlertDescription>
            This client will be flagged for special handling due to their security clearance.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
