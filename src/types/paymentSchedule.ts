import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

// Database types
export type PaymentSchedule = Tables<'payment_schedules'>;
export type PaymentScheduleInsert = TablesInsert<'payment_schedules'>;
export type PaymentScheduleUpdate = TablesUpdate<'payment_schedules'>;

// Enum types
export type PaymentFrequency = 'monthly' | 'semi_monthly' | 'bi_weekly';
export type ScheduleStatus = 'active' | 'paused' | 'completed' | 'cancelled';

// Schedule with related data
export interface PaymentScheduleWithService extends PaymentSchedule {
  client_service?: {
    id: string;
    service_number: string;
    primary_client?: {
      id: string;
      first_name: string;
      last_name: string;
    } | null;
  } | null;
}

// Schedule generation parameters
export interface ScheduleGenerationParams {
  clientServiceId: string;
  firstDraftDate: Date;
  frequency: PaymentFrequency;
  termMonths: number;
  draftAmount: number;
  processorFeeAmount?: number; // Defaults to 10
}

// Generated transaction for batch insert
export interface GeneratedTransaction {
  client_service_id: string;
  transaction_type: 'draft' | 'processor_fee';
  amount: number;
  scheduled_date: string;
  status: 'open';
  sequence_number: number;
  description: string;
  schedule_id?: string;
  parent_transaction_id?: string;
}

// Schedule summary for UI display
export interface ScheduleSummary {
  id: string;
  frequency: PaymentFrequency;
  draftAmount: number;
  processorFeeAmount: number;
  totalDrafts: number;
  draftsGenerated: number;
  draftsCleared: number;
  draftsPending: number;
  draftsCancelled: number;
  nextDraftDate: Date | null;
  progressPercentage: number;
  status: ScheduleStatus;
  firstDraftDate: Date;
  estimatedCompletionDate: Date;
}

// Draft modification options
export interface DraftModification {
  transactionId: string;
  action: 'skip' | 'reschedule';
  newDate?: Date; // Required for reschedule
  reason?: string;
}

// Frequency display labels
export const FREQUENCY_LABELS: Record<PaymentFrequency, string> = {
  monthly: 'Monthly',
  semi_monthly: 'Semi-Monthly (2x/month)',
  bi_weekly: 'Bi-Weekly',
};

// Frequency calculation helpers
export const FREQUENCY_CONFIG: Record<PaymentFrequency, {
  label: string;
  draftsPerYear: number;
  intervalDescription: string;
}> = {
  monthly: {
    label: 'Monthly',
    draftsPerYear: 12,
    intervalDescription: 'Once per month',
  },
  semi_monthly: {
    label: 'Semi-Monthly',
    draftsPerYear: 24,
    intervalDescription: 'Twice per month (1st and 15th)',
  },
  bi_weekly: {
    label: 'Bi-Weekly',
    draftsPerYear: 26,
    intervalDescription: 'Every two weeks',
  },
};

// Business rule constants
export const MINIMUM_DRAFT_AMOUNT = 350;
export const DEFAULT_PROCESSOR_FEE = 10;
export const DRAFT_CALCULATION_FACTOR = 0.82; // (Total Debt * 0.82) / Term
export const MIN_TERM_MONTHS = 18;
export const MAX_TERM_MONTHS_STANDARD = 48;
export const MAX_TERM_MONTHS_EXCEPTION = 54;
