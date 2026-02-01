import { useEffect } from 'react';
import { useEnrollmentWizard } from '../EnrollmentWizardContext';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, ShieldCheck } from 'lucide-react';

export function CreditAuthStep() {
  const { data, updateData, setCanProceed } = useEnrollmentWizard();

  // Require credit auth to proceed
  useEffect(() => {
    setCanProceed(data.credit_auth_given);
  }, [data.credit_auth_given, setCanProceed]);

  const handleAuthChange = (checked: boolean) => {
    updateData({ 
      credit_auth_given: checked,
      credit_auth_date: checked ? new Date().toISOString() : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Credit Authorization</h3>
        <p className="text-sm text-muted-foreground">
          Obtain verbal authorization before pulling the client's credit report.
        </p>
      </div>

      {/* Verification Script */}
      <Card className="border-primary/50 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-primary mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-medium text-primary">Verification Script</h4>
              <p className="text-sm italic">
                "I need to verify your identity before we pull your credit. Please state your full legal name 
                and the last 4 digits of your Social Security Number."
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client Info Reminder */}
      <div className="p-4 rounded-lg bg-muted/50">
        <h4 className="font-medium mb-2">Client Information</h4>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
          <div>
            <span className="text-muted-foreground">Name:</span>{' '}
            <span className="font-medium">
              {data.first_name} {data.middle_name} {data.last_name}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">SSN Last 4:</span>{' '}
            <span className="font-medium font-mono">
              {data.ssn_last4 ? `****-**-${data.ssn_last4}` : 'Not provided'}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">DOB:</span>{' '}
            <span className="font-medium">
              {data.date_of_birth || 'Not provided'}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">State:</span>{' '}
            <span className="font-medium">{data.state}</span>
          </div>
        </div>
      </div>

      {/* Authorization Checkbox */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Checkbox
              id="credit_auth"
              checked={data.credit_auth_given}
              onCheckedChange={handleAuthChange}
              className="mt-1"
            />
            <div className="space-y-2">
              <label 
                htmlFor="credit_auth" 
                className="text-sm font-medium cursor-pointer block"
              >
                Client has verbally authorized a soft credit pull
              </label>
              <p className="text-xs text-muted-foreground">
                By checking this box, I confirm that the client has verbally authorized 
                Guardian Litigation Group to perform a soft credit inquiry for the purpose 
                of evaluating their debt resolution options.
              </p>
              {data.credit_auth_given && data.credit_auth_date && (
                <p className="text-xs text-green-600">
                  ✓ Authorized on {new Date(data.credit_auth_date).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertDescription>
          A soft credit pull does not affect the client's credit score. The authorization 
          is documented for compliance purposes.
        </AlertDescription>
      </Alert>

      {/* Future Integration Placeholder */}
      <div className="p-4 border border-dashed rounded-lg text-center text-sm text-muted-foreground">
        <p>Credit bureau integration coming soon</p>
        <p className="text-xs">Debts will be manually entered in the next step</p>
      </div>
    </div>
  );
}
