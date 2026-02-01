import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLead } from '@/hooks/useLeads';
import { useCurrentStaff } from '@/hooks/useStaff';
import { useLitigationConversion } from '@/hooks/useLitigationConversion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { LitigationEligibilityStep } from './steps/LitigationEligibilityStep';
import { LitigationCaseDetailsStep } from './steps/LitigationCaseDetailsStep';
import { LitigationDocumentsStep } from './steps/LitigationDocumentsStep';
import { LitigationReviewStep } from './steps/LitigationReviewStep';
import { useToast } from '@/hooks/use-toast';

export type LitigationStep = 'eligibility' | 'case_details' | 'documents' | 'review';

export const LITIGATION_STEPS: { id: LitigationStep; label: string }[] = [
  { id: 'eligibility', label: 'Eligibility' },
  { id: 'case_details', label: 'Case Details' },
  { id: 'documents', label: 'Documents' },
  { id: 'review', label: 'Review' },
];

// States where we can represent clients
export const ELIGIBLE_STATES = ['TX', 'CA', 'FL', 'IL', 'GA'];

export interface LitigationData {
  // Lead reference
  lead_id?: string;
  
  // Eligibility
  state?: string;
  debt_amount?: number;
  case_type?: 'debt_defense' | 'other';
  
  // Case Details
  service_date?: string;
  response_deadline?: string;
  opposing_party?: string;
  court_name?: string;
  case_number?: string;
  
  // Documents
  complaint_uploaded?: boolean;
  complaint_url?: string;
  summons_uploaded?: boolean;
  summons_url?: string;
}

interface LitigationWizardProps {
  leadId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function LitigationWizard({ leadId, onClose, onSuccess }: LitigationWizardProps) {
  const navigate = useNavigate();
  const { data: lead, isLoading } = useLead(leadId ?? undefined);
  const litigationConversion = useLitigationConversion();
  const { data: currentStaff } = useCurrentStaff();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState<LitigationStep>('eligibility');
  const [canProceed, setCanProceed] = useState(false);
  const [data, setData] = useState<LitigationData>({});
  const [eligibilityErrors, setEligibilityErrors] = useState<string[]>([]);

  const currentStepIndex = LITIGATION_STEPS.findIndex(s => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / LITIGATION_STEPS.length) * 100;

  // Reset when lead changes
  useEffect(() => {
    if (lead) {
      setData({
        lead_id: lead.id,
        state: lead.state || '',
        debt_amount: lead.estimated_debt_amount || undefined,
        service_date: (lead as any).service_date || '',
        response_deadline: (lead as any).response_deadline || '',
        opposing_party: (lead as any).opposing_party || '',
        court_name: (lead as any).court_name || '',
        case_number: (lead as any).case_number || '',
        case_type: 'debt_defense',
      });
      setCurrentStep('eligibility');
      setCanProceed(false);
      setEligibilityErrors([]);
    }
  }, [lead]);

  const updateData = (updates: Partial<LitigationData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const checkEligibility = (): string[] => {
    const errors: string[] = [];
    
    // Check state
    if (!data.state || !ELIGIBLE_STATES.includes(data.state)) {
      errors.push(`We can only represent clients in ${ELIGIBLE_STATES.join(', ')}. Client is in ${data.state || 'unknown state'}.`);
    }
    
    // Check debt amount
    if (!data.debt_amount || data.debt_amount < 1000) {
      errors.push(`Debt amount must be at least $1,000. Current amount: $${data.debt_amount?.toLocaleString() || 0}.`);
    }
    
    // Check case type
    if (data.case_type !== 'debt_defense') {
      errors.push('Only debt defense cases are eligible for conversion.');
    }
    
    return errors;
  };

  const handleNext = () => {
    if (currentStep === 'eligibility') {
      const errors = checkEligibility();
      setEligibilityErrors(errors);
      if (errors.length > 0) {
        return;
      }
    }

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < LITIGATION_STEPS.length) {
      setCurrentStep(LITIGATION_STEPS[nextIndex].id);
      setCanProceed(false);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(LITIGATION_STEPS[prevIndex].id);
      setCanProceed(true);
      setEligibilityErrors([]);
    }
  };

  const handleConvert = async () => {
    if (!lead || !currentStaff) return;

    try {
      const result = await litigationConversion.mutateAsync({
        lead,
        data,
        companyId: lead.company_id,
      });

      onSuccess();
      // Navigate to the new client's detail page
      navigate(`/clients/${result.clientId}`);
    } catch (error) {
      // Error is handled in the mutation hook
    }
  };

  if (!leadId) return null;

  return (
    <Dialog open={!!leadId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">LITIGATION CONVERSION</DialogTitle>
          <DialogDescription>
            Convert this lead to a litigation case
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            {LITIGATION_STEPS.map((step, idx) => (
              <span
                key={step.id}
                className={idx <= currentStepIndex ? 'text-primary font-medium' : 'text-muted-foreground'}
              >
                {step.label}
              </span>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto py-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {currentStep === 'eligibility' && (
                <LitigationEligibilityStep
                  data={data}
                  updateData={updateData}
                  setCanProceed={setCanProceed}
                  eligibilityErrors={eligibilityErrors}
                />
              )}
              {currentStep === 'case_details' && (
                <LitigationCaseDetailsStep
                  data={data}
                  updateData={updateData}
                  setCanProceed={setCanProceed}
                />
              )}
              {currentStep === 'documents' && (
                <LitigationDocumentsStep
                  data={data}
                  updateData={updateData}
                  setCanProceed={setCanProceed}
                />
              )}
              {currentStep === 'review' && (
                <LitigationReviewStep
                  lead={lead}
                  data={data}
                  setCanProceed={setCanProceed}
                />
              )}
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStepIndex === 0}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {currentStep === 'review' ? (
            <Button onClick={handleConvert} disabled={litigationConversion.isPending || !canProceed}>
              {litigationConversion.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Convert to Case
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={!canProceed}>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
