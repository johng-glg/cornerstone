import { useEffect } from 'react';
import { useEnrollmentWizard } from '../EnrollmentWizardContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Briefcase, 
  DollarSign, 
  Calendar, 
  Building2, 
  CheckCircle2,
  MapPin,
  Phone,
  Mail
} from 'lucide-react';

export function ReviewSubmitStep() {
  const { 
    data, 
    setCanProceed, 
    totalEnrolledDebt, 
    enrolledDebtCount 
  } = useEnrollmentWizard();

  // Always allow submission from review step
  useEffect(() => {
    setCanProceed(true);
  }, [setCanProceed]);

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return '-';
    return `$${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Review & Submit</h3>
        <p className="text-sm text-muted-foreground">
          Review all information before completing the enrollment.
        </p>
      </div>

      {/* Client Information */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" />
            Client Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">Name:</span>{' '}
              <span className="font-medium">
                {data.first_name} {data.middle_name} {data.last_name}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">DOB:</span>{' '}
              <span className="font-medium">{data.date_of_birth || '-'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Mail className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium">{data.email || '-'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Phone className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium">{data.phone || '-'}</span>
            </div>
          </div>
          {data.address_line1 && (
            <div className="flex items-start gap-1 text-sm pt-1">
              <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
              <span className="font-medium">
                {data.address_line1}
                {data.address_line2 && `, ${data.address_line2}`}
                <br />
                {data.city}, {data.address_state} {data.zip_code}
              </span>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            {data.tcpa_consent && (
              <Badge variant="outline" className="text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                TCPA Consent
              </Badge>
            )}
            {data.credit_auth_given && (
              <Badge variant="outline" className="text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Credit Authorized
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Employment & Hardship */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
            <Briefcase className="h-4 w-4" />
            Employment & Hardship
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">Status:</span>{' '}
              <span className="font-medium capitalize">
                {data.employment_status?.replace('_', ' ') || '-'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Monthly Income:</span>{' '}
              <span className="font-medium">{formatCurrency(data.monthly_income)}</span>
            </div>
            {data.employer_name && (
              <div>
                <span className="text-muted-foreground">Employer:</span>{' '}
                <span className="font-medium">{data.employer_name}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Hardship:</span>{' '}
              <span className="font-medium capitalize">
                {data.hardship_reason?.replace('_', ' ') || '-'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enrolled Debts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            Enrolled Debts ({enrolledDebtCount})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.debts.filter(d => d.is_enrolled).map((debt, index) => (
              <div 
                key={index}
                className="flex justify-between items-center text-sm py-1 border-b last:border-0"
              >
                <div>
                  <span className="font-medium">{debt.creditor_name || 'Unknown Creditor'}</span>
                  <span className="text-muted-foreground ml-2 capitalize">
                    ({debt.account_type.replace('_', ' ')})
                  </span>
                </div>
                <span className="font-medium">{formatCurrency(debt.current_balance)}</span>
              </div>
            ))}
            <Separator className="my-2" />
            <div className="flex justify-between items-center font-semibold">
              <span>Total Enrolled Debt</span>
              <span className="text-primary">{formatCurrency(totalEnrolledDebt)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Details */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Selected Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Plan Type:</span>{' '}
              <span className="font-medium capitalize">
                {data.plan_type?.replace('glg_', 'GLG ').replace('_', ' ')}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Term:</span>{' '}
              <span className="font-medium">{data.selected_term_months} months</span>
            </div>
            <div>
              <span className="text-muted-foreground">Monthly Draft:</span>{' '}
              <span className="font-medium text-primary">
                {formatCurrency(data.selected_monthly_draft)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">First Payment:</span>{' '}
              <span className="font-medium">{data.first_payment_date}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Frequency:</span>{' '}
              <span className="font-medium capitalize">
                {data.payment_frequency?.replace('_', ' ')}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Settlement Fee:</span>{' '}
              <span className="font-medium">25%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Banking (if provided) */}
      {data.bank_name && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              Banking Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
              <div>
                <span className="text-muted-foreground">Bank:</span>{' '}
                <span className="font-medium">{data.bank_name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Account Type:</span>{' '}
                <span className="font-medium capitalize">{data.bank_account_type}</span>
              </div>
              {data.routing_number && (
                <div>
                  <span className="text-muted-foreground">Routing #:</span>{' '}
                  <span className="font-medium font-mono">****{data.routing_number.slice(-4)}</span>
                </div>
              )}
              {data.account_number && (
                <div>
                  <span className="text-muted-foreground">Account #:</span>{' '}
                  <span className="font-medium font-mono">****{data.account_number.slice(-4)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disclosures Summary */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="text-xs">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Credit Impact Acknowledged
        </Badge>
        <Badge variant="secondary" className="text-xs">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Collection Calls Acknowledged
        </Badge>
        <Badge variant="secondary" className="text-xs">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Lawsuits Acknowledged
        </Badge>
        <Badge variant="secondary" className="text-xs">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Negotiations Acknowledged
        </Badge>
        <Badge variant="secondary" className="text-xs">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          No Guarantee Acknowledged
        </Badge>
      </div>
    </div>
  );
}
