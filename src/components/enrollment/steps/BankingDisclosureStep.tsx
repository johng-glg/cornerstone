import { useEffect, useMemo } from 'react';
import { useEnrollmentWizard } from '../EnrollmentWizardContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Building2, FileWarning } from 'lucide-react';

const DISCLOSURES = [
  {
    key: 'disclosure_credit_impact',
    title: 'Credit Score Impact',
    description: 'I understand that my credit score may be negatively impacted during the program as I stop making payments to creditors.',
  },
  {
    key: 'disclosure_collection_calls',
    title: 'Collection Activity',
    description: 'I understand that creditors may continue collection efforts, including phone calls and letters, during the program.',
  },
  {
    key: 'disclosure_lawsuits',
    title: 'Potential Lawsuits',
    description: 'I understand that creditors may file lawsuits during the program, and I will be notified of any legal action.',
  },
  {
    key: 'disclosure_negotiations',
    title: 'Negotiation Process',
    description: 'I understand that settlements are negotiated with creditors and the final settlement amounts may vary from estimates.',
  },
  {
    key: 'disclosure_not_guaranteed',
    title: 'Results Not Guaranteed',
    description: 'I understand that enrollment in this program does not guarantee any specific results or that all debts will be settled.',
  },
] as const;

export function BankingDisclosureStep() {
  const { data, updateData, setCanProceed } = useEnrollmentWizard();

  // Check if all disclosures are acknowledged
  const allDisclosuresAcknowledged = useMemo(() => {
    return DISCLOSURES.every(d => data[d.key]);
  }, [data]);

  // Check for creditor conflict (bank name matches enrolled creditor name)
  const hasCreditorConflict = useMemo(() => {
    if (!data.bank_name) return false;
    const bankNameLower = data.bank_name.toLowerCase();
    return data.debts.some(
      debt => debt.is_enrolled && debt.creditor_name.toLowerCase().includes(bankNameLower)
    );
  }, [data.bank_name, data.debts]);

  // Require all disclosures to proceed (banking is optional for now)
  useEffect(() => {
    setCanProceed(allDisclosuresAcknowledged);
  }, [allDisclosuresAcknowledged, setCanProceed]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Banking & Disclosures</h3>
        <p className="text-sm text-muted-foreground">
          Enter payment details and review required disclosures.
        </p>
      </div>

      {/* Banking Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Banking Information
            <span className="text-xs font-normal text-muted-foreground">(Optional for now)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bank_name">Bank Name</Label>
              <Input
                id="bank_name"
                value={data.bank_name || ''}
                onChange={(e) => updateData({ bank_name: e.target.value })}
                placeholder="e.g., Chase, Bank of America"
              />
            </div>
            <div className="space-y-2">
              <Label>Account Type</Label>
              <Select
                value={data.bank_account_type || 'checking'}
                onValueChange={(value) => updateData({ bank_account_type: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Checking</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="routing_number">Routing Number</Label>
              <Input
                id="routing_number"
                value={data.routing_number || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 9);
                  updateData({ routing_number: value });
                }}
                placeholder="9 digits"
                maxLength={9}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account_number">Account Number</Label>
              <Input
                id="account_number"
                value={data.account_number || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  updateData({ account_number: value });
                }}
                placeholder="Account number"
              />
            </div>
          </div>

          {hasCreditorConflict && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Potential Conflict</AlertTitle>
              <AlertDescription>
                The bank name matches one of the enrolled creditors. This may cause issues with payment processing.
                Consider using a different bank account.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Disclosures */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileWarning className="h-4 w-4" />
            Required Disclosures
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The client must acknowledge all disclosures before proceeding.
          </p>

          <div className="space-y-3">
            {DISCLOSURES.map((disclosure) => (
              <div 
                key={disclosure.key}
                className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
              >
                <Checkbox
                  id={disclosure.key}
                  checked={data[disclosure.key]}
                  onCheckedChange={(checked) => 
                    updateData({ [disclosure.key]: checked === true } as any)
                  }
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <label 
                    htmlFor={disclosure.key} 
                    className="text-sm font-medium cursor-pointer block"
                  >
                    {disclosure.title}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {disclosure.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {!allDisclosuresAcknowledged && (
            <p className="text-sm text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              All disclosures must be acknowledged to continue
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
