import { useLead, useUpdateLead } from '@/hooks/useLeads';
import { useCurrentStaff } from '@/hooks/useStaff';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { checkClientEmailDuplicate, type DuplicateMatch } from '@/hooks/useDuplicateDetection';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Check, ChevronLeft, ChevronRight, Loader2, AlertTriangle, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  EnrollmentWizardProvider,
  useEnrollmentWizard,
  ENROLLMENT_STEPS,
} from './EnrollmentWizardContext';

// Step Components
import { IntakeEligibilityStep } from './steps/IntakeEligibilityStep';
import { ClientInfoStep } from './steps/ClientInfoStep';
import { EmploymentHardshipStep } from './steps/EmploymentHardshipStep';
import { CreditAuthStep } from './steps/CreditAuthStep';
import { DebtSelectionStep } from './steps/DebtSelectionStep';
import { PlanSelectionStep } from './steps/PlanSelectionStep';
import { BankingDisclosureStep } from './steps/BankingDisclosureStep';
import { ReviewSubmitStep } from './steps/ReviewSubmitStep';

interface EnrollmentWizardProps {
  leadId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

// Client duplicate blocking dialog
function ClientDuplicateDialog({
  open,
  onOpenChange,
  duplicate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicate: DuplicateMatch | null;
}) {
  const navigate = useNavigate();

  const handleViewClient = () => {
    if (duplicate) {
      onOpenChange(false);
      navigate(`/clients/${duplicate.id}`);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Email Already Exists
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                This email is already associated with an existing client. You cannot
                proceed with enrollment using this email address.
              </p>
              {duplicate && (
                <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-primary" />
                    <span className="font-medium">{duplicate.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {duplicate.email}
                    {duplicate.serviceNumber && (
                      <span> • Service: {duplicate.serviceNumber}</span>
                    )}
                  </div>
                </div>
              )}
              <p className="text-sm">
                Please update the lead's email address in the Client Info step or work
                with the existing client record.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Go Back</AlertDialogCancel>
          <AlertDialogAction onClick={handleViewClient}>
            View Existing Client
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function WizardContent({ onClose, onSuccess }: Omit<EnrollmentWizardProps, 'leadId'>) {
  const {
    leadId,
    currentStep,
    currentStepIndex,
    data,
    goToNextStep,
    goToPrevStep,
    canProceed,
    totalEnrolledDebt,
    enrolledDebtCount,
  } = useEnrollmentWizard();

  const { data: currentStaff } = useCurrentStaff();
  const updateLead = useUpdateLead();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Duplicate detection state
  const [duplicateClient, setDuplicateClient] = useState<DuplicateMatch | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);

  const progress = ((currentStepIndex + 1) / ENROLLMENT_STEPS.length) * 100;
  const isLastStep = currentStepIndex === ENROLLMENT_STEPS.length - 1;
  const isFirstStep = currentStepIndex === 0;

  const handleComplete = async () => {
    if (!currentStaff?.company_id) return;

    setIsSubmitting(true);

    try {
      // Check for client email duplicate before proceeding
      if (data.email) {
        const existingClient = await checkClientEmailDuplicate(data.email);
        if (existingClient) {
          setDuplicateClient(existingClient);
          setShowDuplicateDialog(true);
          setIsSubmitting(false);
          return;
        }
      }

      // 1. Create client
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert([{
          first_name: data.first_name,
          middle_name: data.middle_name || null,
          last_name: data.last_name,
          email: data.email || null,
          date_of_birth: data.date_of_birth || null,
          company_id: currentStaff.company_id,
          tcpa_consent: data.tcpa_consent,
          tcpa_consent_date: data.tcpa_consent ? new Date().toISOString() : null,
          ssn_encrypted: data.ssn_last4 || null,
        }])
        .select()
        .single();

      if (clientError) throw clientError;

      // 2. Add phone if provided
      if (data.phone) {
        await supabase.from('client_phones').insert([{
          client_id: client.id,
          phone_number: data.phone,
          phone_type: data.phone_type || 'mobile',
          is_primary: true,
        }]);
      }

      // 3. Add address if provided
      if (data.address_line1 && data.city && data.address_state && data.zip_code) {
        await supabase.from('client_addresses').insert([{
          client_id: client.id,
          address_line1: data.address_line1,
          address_line2: data.address_line2 || null,
          city: data.city,
          state: data.address_state,
          zip_code: data.zip_code,
          address_type: 'home',
          is_primary: true,
        }]);
      }

      // 4. Create client service
      const { data: clientService, error: serviceError } = await supabase
        .from('client_services')
        .insert([{
          owning_company_id: currentStaff.company_id,
          primary_client_id: client.id,
          status: 'active',
          enrolled_date: new Date().toISOString().split('T')[0],
          service_number: '',
          program_type: 'consumer_defense',
          term_months: data.selected_term_months,
          monthly_payment: data.selected_monthly_draft,
          first_payment_date: data.first_payment_date,
          payment_frequency: data.payment_frequency || 'monthly',
          total_enrolled_debt: totalEnrolledDebt,
          settlement_fee_percentage: 25,
          plan_type: data.plan_type || 'glg_standard',
          first_draft_date: data.first_payment_date,
        }] as any)
        .select()
        .single();

      if (serviceError) throw serviceError;

      // 5. Link client to service
      await supabase.from('client_service_clients').insert([{
        client_service_id: clientService.id,
        client_id: client.id,
        relationship: 'primary_client',
        is_primary: true,
      }]);

      // 6. Create liabilities from enrolled debts
      for (const debt of data.debts.filter(d => d.is_enrolled)) {
        await supabase.from('liabilities').insert([{
          client_service_id: clientService.id,
          current_creditor_id: debt.creditor_id || null,
          original_creditor_id: debt.creditor_id || null,
          liability_type: debt.account_type,
          original_balance: debt.original_balance || debt.current_balance,
          current_balance: debt.current_balance,
          enrolled_balance: debt.current_balance,
          account_number: debt.account_number_last4 || null,
          status: 'enrolled',
        }]);
      }

      // 7. Update lead status to converted
      await updateLead.mutateAsync({
        id: leadId,
        status: 'converted',
        converted_service_id: clientService.id,
      });

      // 8. Register with Forth Pay (non-blocking - enrollment proceeds even if this fails)
      if (data.address_line1 && data.city && data.address_state && data.zip_code) {
        try {
          const forthRequest = {
            client_id: client.id,
            client_service_id: clientService.id,
            client_data: {
              first_name: data.first_name,
              last_name: data.last_name,
              middle_name: data.middle_name || undefined,
              address: data.address_line1,
              city: data.city,
              state: data.address_state,
              zip: data.zip_code,
              email: data.email || '',
              phone: data.phone || '',
              date_of_birth: data.date_of_birth || '',
              ssn: data.ssn_last4 || undefined,
            },
            banking: data.routing_number && data.account_number ? {
              bank_name: data.bank_name || 'Unknown Bank',
              routing_number: data.routing_number,
              account_number: data.account_number,
              account_type: (data.bank_account_type || 'checking') as 'checking' | 'savings',
            } : undefined,
            debts: data.debts.filter(d => d.is_enrolled).map(d => ({
              creditor_name: d.creditor_name,
              account_type: d.account_type,
              current_balance: d.current_balance,
              original_balance: d.original_balance,
              account_number: d.account_number_last4,
            })),
          };

          await supabase.functions.invoke('forth-register-client', {
            body: forthRequest,
          });
          console.log('Client registered with Forth Pay');
        } catch (forthError) {
          // Log error but don't block enrollment
          console.error('Forth registration failed (non-blocking):', forthError);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['client_services'] });

      toast({ title: 'Enrollment completed successfully!' });
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Enrollment failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'eligibility':
        return <IntakeEligibilityStep />;
      case 'client_info':
        return <ClientInfoStep />;
      case 'employment':
        return <EmploymentHardshipStep />;
      case 'credit_auth':
        return <CreditAuthStep />;
      case 'debt_selection':
        return <DebtSelectionStep />;
      case 'plan_selection':
        return <PlanSelectionStep />;
      case 'banking':
        return <BankingDisclosureStep />;
      case 'review':
        return <ReviewSubmitStep />;
      default:
        return null;
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-heading text-xl">CONSUMER DEFENSE ENROLLMENT</DialogTitle>
        <DialogDescription>
          Complete the intake process to enroll this lead in the Consumer Defense program.
        </DialogDescription>
      </DialogHeader>

      {/* Progress Indicator */}
      <div className="space-y-4">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between overflow-x-auto pb-2">
          {ENROLLMENT_STEPS.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                'flex flex-col items-center gap-1 min-w-[60px]',
                index <= currentStepIndex ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium',
                  index < currentStepIndex
                    ? 'bg-primary text-primary-foreground'
                    : index === currentStepIndex
                    ? 'bg-primary/20 border-2 border-primary text-primary'
                    : 'bg-muted'
                )}
              >
                {index < currentStepIndex ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  step.stepNumber
                )}
              </div>
              <span className="text-[10px] font-medium text-center">{step.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Bar */}
      {currentStepIndex >= 4 && (
        <div className="flex gap-4 p-3 bg-muted/50 rounded-lg text-sm">
          <div>
            <span className="text-muted-foreground">Enrolled Debts:</span>{' '}
            <span className="font-semibold">{enrolledDebtCount}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Total Debt:</span>{' '}
            <span className="font-semibold">${totalEnrolledDebt.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="min-h-[350px] py-4 overflow-y-auto">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={isFirstStep ? onClose : goToPrevStep}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          {isFirstStep ? 'Cancel' : 'Back'}
        </Button>

        {isLastStep ? (
          <Button onClick={handleComplete} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enrolling...
              </>
            ) : (
              'Complete Enrollment'
            )}
          </Button>
        ) : (
          <Button onClick={goToNextStep} disabled={!canProceed}>
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      <ClientDuplicateDialog
        open={showDuplicateDialog}
        onOpenChange={setShowDuplicateDialog}
        duplicate={duplicateClient}
      />
    </>
  );
}

export function EnrollmentWizard({ leadId, onClose, onSuccess }: EnrollmentWizardProps) {
  const { data: lead } = useLead(leadId ?? undefined);

  if (!leadId) return null;

  return (
    <Dialog open={!!leadId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <EnrollmentWizardProvider leadId={leadId} lead={lead}>
          <WizardContent onClose={onClose} onSuccess={onSuccess} />
        </EnrollmentWizardProvider>
      </DialogContent>
    </Dialog>
  );
}
