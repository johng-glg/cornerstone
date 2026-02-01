import { useEffect } from 'react';
import { useEnrollmentWizard, LeadDebt } from '../EnrollmentWizardContext';
import { useCreditors } from '@/hooks/useCreditors';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Enums } from '@/integrations/supabase/types';

const LIABILITY_TYPES: { value: Enums<'liability_type'>; label: string }[] = [
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'medical', label: 'Medical' },
  { value: 'personal_loan', label: 'Personal Loan' },
  { value: 'auto_loan', label: 'Auto Loan' },
  { value: 'student_loan', label: 'Student Loan' },
  { value: 'other', label: 'Other' },
];

export function DebtSelectionStep() {
  const { data, updateData, setCanProceed, totalEnrolledDebt, enrolledDebtCount } = useEnrollmentWizard();
  const { data: creditors } = useCreditors();

  // Require at least one enrolled debt to proceed
  useEffect(() => {
    setCanProceed(enrolledDebtCount > 0);
  }, [enrolledDebtCount, setCanProceed]);

  const addDebt = () => {
    const newDebt: LeadDebt = {
      creditor_name: '',
      account_type: 'credit_card',
      current_balance: 0,
      is_enrolled: true,
    };
    updateData({ debts: [...data.debts, newDebt] });
  };

  const updateDebt = (index: number, updates: Partial<LeadDebt>) => {
    const newDebts = [...data.debts];
    newDebts[index] = { ...newDebts[index], ...updates };
    updateData({ debts: newDebts });
  };

  const removeDebt = (index: number) => {
    updateData({ debts: data.debts.filter((_, i) => i !== index) });
  };

  const selectCreditor = (index: number, creditorId: string) => {
    const creditor = creditors?.find(c => c.id === creditorId);
    if (creditor) {
      updateDebt(index, { 
        creditor_id: creditorId, 
        creditor_name: creditor.name 
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1">Debt Selection</h3>
          <p className="text-sm text-muted-foreground">
            Enter the debts to be enrolled in the program.
          </p>
        </div>
        <Button onClick={addDebt} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Debt
        </Button>
      </div>

      {/* Debts List */}
      {data.debts.length === 0 ? (
        <Card className="bg-muted/50">
          <CardContent className="py-12 text-center">
            <DollarSign className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground font-medium">No debts added yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Add debts to calculate program options
            </p>
            <Button onClick={addDebt} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add First Debt
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.debts.map((debt, index) => (
            <Card 
              key={index} 
              className={cn(
                "transition-colors",
                !debt.is_enrolled && "opacity-60 bg-muted/30"
              )}
            >
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={debt.is_enrolled}
                      onCheckedChange={(checked) => 
                        updateDebt(index, { is_enrolled: checked === true })
                      }
                    />
                    <span className="text-sm font-medium">
                      Debt #{index + 1}
                      {!debt.is_enrolled && ' (Not Enrolled)'}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeDebt(index)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Creditor</Label>
                    <Select
                      value={debt.creditor_id || ''}
                      onValueChange={(value) => selectCreditor(index, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select creditor" />
                      </SelectTrigger>
                      <SelectContent>
                        {creditors?.map((creditor) => (
                          <SelectItem key={creditor.id} value={creditor.id}>
                            {creditor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!debt.creditor_id && (
                      <Input
                        value={debt.creditor_name}
                        onChange={(e) => updateDebt(index, { creditor_name: e.target.value })}
                        placeholder="Or enter creditor name"
                        className="mt-2"
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Account Type</Label>
                    <Select
                      value={debt.account_type}
                      onValueChange={(value) => 
                        updateDebt(index, { account_type: value as Enums<'liability_type'> })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LIABILITY_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Original Balance</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        type="number"
                        value={debt.original_balance || ''}
                        onChange={(e) => updateDebt(index, { 
                          original_balance: parseFloat(e.target.value) || undefined 
                        })}
                        placeholder="0.00"
                        className="pl-7"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Current Balance *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        type="number"
                        value={debt.current_balance || ''}
                        onChange={(e) => updateDebt(index, { 
                          current_balance: parseFloat(e.target.value) || 0 
                        })}
                        placeholder="0.00"
                        className="pl-7"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Used for calculations</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Account # (Last 4)</Label>
                    <Input
                      value={debt.account_number_last4 || ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                        updateDebt(index, { account_number_last4: value });
                      }}
                      placeholder="####"
                      maxLength={4}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      {data.debts.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Enrolled Debts</p>
                <p className="text-2xl font-bold">{enrolledDebtCount}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Enrolled Debt</p>
                <p className="text-2xl font-bold text-primary">
                  ${totalEnrolledDebt.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
