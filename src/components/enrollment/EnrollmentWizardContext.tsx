import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { Tables, Enums } from '@/integrations/supabase/types';

export type EnrollmentStep = 
  | 'eligibility'
  | 'client_info'
  | 'employment'
  | 'credit_auth'
  | 'debt_selection'
  | 'plan_selection'
  | 'banking'
  | 'review';

export const ENROLLMENT_STEPS: { id: EnrollmentStep; label: string; stepNumber: number }[] = [
  { id: 'eligibility', label: 'Eligibility', stepNumber: 1 },
  { id: 'client_info', label: 'Client Info', stepNumber: 2 },
  { id: 'employment', label: 'Employment', stepNumber: 3 },
  { id: 'credit_auth', label: 'Credit Auth', stepNumber: 4 },
  { id: 'debt_selection', label: 'Debts', stepNumber: 5 },
  { id: 'plan_selection', label: 'Plan', stepNumber: 6 },
  { id: 'banking', label: 'Banking', stepNumber: 7 },
  { id: 'review', label: 'Review', stepNumber: 8 },
];

export interface LeadDebt {
  id?: string;
  creditor_id?: string | null;
  creditor_name: string;
  account_type: Enums<'liability_type'>;
  original_balance?: number | null;
  current_balance: number;
  account_number_last4?: string;
  is_enrolled: boolean;
}

export interface PlanOption {
  termMonths: number;
  monthlyDraft: number;
  totalCost: number;
  isMinimumDraft: boolean;
}

export interface EnrollmentData {
  // Step 1: Eligibility
  state?: string;
  in_bankruptcy: boolean;
  has_federal_accounts: boolean;
  secured_credit_resolved: boolean;
  has_security_clearance: boolean;
  
  // Step 2: Client Info
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth?: string;
  email?: string;
  phone?: string;
  phone_type?: Enums<'phone_type'>;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  address_state?: string;
  zip_code?: string;
  ssn_last4?: string;
  tcpa_consent: boolean;
  
  // Step 3: Employment
  employment_status?: 'employed' | 'unemployed' | 'self_employed' | 'retired' | 'disabled';
  employer_name?: string;
  job_title?: string;
  monthly_income?: number;
  hardship_reason?: 'job_loss' | 'medical_emergency' | 'divorce' | 'reduced_income' | 'business_failure' | 'other';
  hardship_notes?: string;
  
  // Step 4: Credit Auth
  credit_auth_given: boolean;
  credit_auth_date?: string;
  
  // Step 5: Debts
  debts: LeadDebt[];
  
  // Step 6: Plan
  selected_term_months?: number;
  selected_monthly_draft?: number;
  first_payment_date?: string;
  payment_frequency?: 'monthly' | 'semi_monthly' | 'bi_weekly';
  plan_type?: 'glg_standard' | 'glg_adjustable' | 'glg_exception';
  
  // Step 7: Banking
  bank_name?: string;
  routing_number?: string;
  account_number?: string;
  bank_account_type?: 'checking' | 'savings';
  
  // Disclosures
  disclosure_credit_impact: boolean;
  disclosure_collection_calls: boolean;
  disclosure_lawsuits: boolean;
  disclosure_negotiations: boolean;
  disclosure_not_guaranteed: boolean;
}

const DEFAULT_ENROLLMENT_DATA: EnrollmentData = {
  in_bankruptcy: false,
  has_federal_accounts: false,
  secured_credit_resolved: true,
  has_security_clearance: false,
  first_name: '',
  last_name: '',
  tcpa_consent: false,
  credit_auth_given: false,
  debts: [],
  disclosure_credit_impact: false,
  disclosure_collection_calls: false,
  disclosure_lawsuits: false,
  disclosure_negotiations: false,
  disclosure_not_guaranteed: false,
};

interface EnrollmentWizardContextType {
  leadId: string;
  currentStep: EnrollmentStep;
  currentStepIndex: number;
  data: EnrollmentData;
  isLoading: boolean;
  setCurrentStep: (step: EnrollmentStep) => void;
  goToNextStep: () => void;
  goToPrevStep: () => void;
  updateData: (updates: Partial<EnrollmentData>) => void;
  canProceed: boolean;
  setCanProceed: (can: boolean) => void;
  totalEnrolledDebt: number;
  enrolledDebtCount: number;
  planOptions: PlanOption[];
}

const EnrollmentWizardContext = createContext<EnrollmentWizardContextType | null>(null);

export function useEnrollmentWizard() {
  const context = useContext(EnrollmentWizardContext);
  if (!context) {
    throw new Error('useEnrollmentWizard must be used within EnrollmentWizardProvider');
  }
  return context;
}

interface EnrollmentWizardProviderProps {
  leadId: string;
  lead?: Tables<'leads'> | null;
  children: ReactNode;
}

export function EnrollmentWizardProvider({ leadId, lead, children }: EnrollmentWizardProviderProps) {
  const [currentStep, setCurrentStep] = useState<EnrollmentStep>('eligibility');
  const [canProceed, setCanProceed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Initialize data from lead if available
  const [data, setData] = useState<EnrollmentData>(() => {
    if (lead) {
      return {
        ...DEFAULT_ENROLLMENT_DATA,
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email || '',
        phone: lead.phone || '',
        state: (lead as any).state || '',
        date_of_birth: (lead as any).date_of_birth || '',
        in_bankruptcy: (lead as any).in_bankruptcy || false,
        has_federal_accounts: (lead as any).has_federal_accounts || false,
        secured_credit_resolved: (lead as any).secured_credit_resolved ?? true,
        has_security_clearance: (lead as any).has_security_clearance || false,
        employment_status: (lead as any).employment_status,
        employer_name: (lead as any).employer_name || '',
        job_title: (lead as any).job_title || '',
        monthly_income: (lead as any).monthly_income,
        hardship_reason: (lead as any).hardship_reason,
        hardship_notes: (lead as any).hardship_notes || '',
        credit_auth_given: (lead as any).credit_auth_given || false,
      };
    }
    return DEFAULT_ENROLLMENT_DATA;
  });

  const currentStepIndex = ENROLLMENT_STEPS.findIndex(s => s.id === currentStep);

  const goToNextStep = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < ENROLLMENT_STEPS.length) {
      setCurrentStep(ENROLLMENT_STEPS[nextIndex].id);
      setCanProceed(false);
    }
  }, [currentStepIndex]);

  const goToPrevStep = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(ENROLLMENT_STEPS[prevIndex].id);
      setCanProceed(true);
    }
  }, [currentStepIndex]);

  const updateData = useCallback((updates: Partial<EnrollmentData>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  // Calculate totals
  const totalEnrolledDebt = data.debts
    .filter(d => d.is_enrolled)
    .reduce((sum, d) => sum + (d.current_balance || 0), 0);
  
  const enrolledDebtCount = data.debts.filter(d => d.is_enrolled).length;

  // Calculate plan options
  const planOptions: PlanOption[] = [18, 24, 36, 48].map(termMonths => {
    const rawDraft = (totalEnrolledDebt * 0.82) / termMonths;
    const monthlyDraft = Math.max(rawDraft, 350);
    const isMinimumDraft = rawDraft < 350;
    const totalCost = monthlyDraft * termMonths;
    return { termMonths, monthlyDraft, totalCost, isMinimumDraft };
  });

  return (
    <EnrollmentWizardContext.Provider
      value={{
        leadId,
        currentStep,
        currentStepIndex,
        data,
        isLoading,
        setCurrentStep,
        goToNextStep,
        goToPrevStep,
        updateData,
        canProceed,
        setCanProceed,
        totalEnrolledDebt,
        enrolledDebtCount,
        planOptions,
      }}
    >
      {children}
    </EnrollmentWizardContext.Provider>
  );
}
