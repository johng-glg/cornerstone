import { addMonths, addWeeks, addDays, format, startOfMonth, setDate } from 'date-fns';
import type { 
  PaymentFrequency, 
  ScheduleGenerationParams, 
  GeneratedTransaction,
  MINIMUM_DRAFT_AMOUNT,
  DEFAULT_PROCESSOR_FEE,
  DRAFT_CALCULATION_FACTOR,
} from '@/types/paymentSchedule';

// Re-export constants for convenience
export const MINIMUM_DRAFT = 350;
export const PROCESSOR_FEE = 10;
export const CALCULATION_FACTOR = 0.82;

/**
 * Calculate the total number of drafts based on frequency and term
 */
export function calculateTotalDrafts(
  frequency: PaymentFrequency, 
  termMonths: number
): number {
  switch (frequency) {
    case 'monthly':
      return termMonths;
    case 'semi_monthly':
      return termMonths * 2;
    case 'bi_weekly':
      // 26 payments per year, prorated to term
      return Math.ceil(termMonths * 26 / 12);
    default:
      return termMonths;
  }
}

/**
 * Calculate the draft date for a given index based on frequency
 */
export function calculateDraftDate(
  firstDraftDate: Date,
  frequency: PaymentFrequency,
  draftIndex: number
): Date {
  switch (frequency) {
    case 'monthly':
      return addMonths(firstDraftDate, draftIndex);
    
    case 'semi_monthly': {
      // First draft on original day, second on 15 days later pattern
      const monthOffset = Math.floor(draftIndex / 2);
      const baseMonth = addMonths(firstDraftDate, monthOffset);
      
      if (draftIndex % 2 === 0) {
        // Even indices: same day as first draft
        return setDate(baseMonth, firstDraftDate.getDate());
      } else {
        // Odd indices: approximately 15 days later
        const targetDay = Math.min(firstDraftDate.getDate() + 15, 28);
        return setDate(baseMonth, targetDay);
      }
    }
    
    case 'bi_weekly':
      return addWeeks(firstDraftDate, draftIndex * 2);
    
    default:
      return addMonths(firstDraftDate, draftIndex);
  }
}

/**
 * Calculate recommended draft amount based on enrolled debt and term
 */
export function calculateRecommendedDraft(
  totalEnrolledDebt: number,
  termMonths: number
): number {
  const calculated = (totalEnrolledDebt * CALCULATION_FACTOR) / termMonths;
  return Math.max(calculated, MINIMUM_DRAFT);
}

/**
 * Generate all transactions for a payment schedule
 * Returns draft transactions and their associated processor fees
 */
export function generateScheduleTransactions(
  params: ScheduleGenerationParams
): GeneratedTransaction[] {
  const {
    clientServiceId,
    firstDraftDate,
    frequency,
    termMonths,
    draftAmount,
    processorFeeAmount = PROCESSOR_FEE,
  } = params;

  const totalDrafts = calculateTotalDrafts(frequency, termMonths);
  const transactions: GeneratedTransaction[] = [];

  for (let i = 0; i < totalDrafts; i++) {
    const draftDate = calculateDraftDate(firstDraftDate, frequency, i);
    const formattedDate = format(draftDate, 'yyyy-MM-dd');

    // Create draft transaction
    transactions.push({
      client_service_id: clientServiceId,
      transaction_type: 'draft',
      amount: draftAmount,
      scheduled_date: formattedDate,
      status: 'open',
      sequence_number: i + 1,
      description: `Draft ${i + 1} of ${totalDrafts}`,
    });

    // Create processor fee (1 day after draft)
    const feeDate = addDays(draftDate, 1);
    transactions.push({
      client_service_id: clientServiceId,
      transaction_type: 'processor_fee',
      amount: processorFeeAmount,
      scheduled_date: format(feeDate, 'yyyy-MM-dd'),
      status: 'open',
      sequence_number: i + 1,
      description: `Processor fee for draft ${i + 1}`,
    });
  }

  return transactions;
}

/**
 * Validate schedule generation parameters
 */
export function validateScheduleParams(
  params: Partial<ScheduleGenerationParams>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!params.clientServiceId) {
    errors.push('Client service ID is required');
  }

  if (!params.firstDraftDate) {
    errors.push('First draft date is required');
  } else if (params.firstDraftDate < new Date()) {
    errors.push('First draft date must be in the future');
  }

  if (!params.termMonths) {
    errors.push('Term months is required');
  } else if (params.termMonths < 18 || params.termMonths > 54) {
    errors.push('Term must be between 18 and 54 months');
  }

  if (!params.draftAmount) {
    errors.push('Draft amount is required');
  } else if (params.draftAmount < MINIMUM_DRAFT) {
    errors.push(`Draft amount must be at least $${MINIMUM_DRAFT}`);
  }

  if (!params.frequency) {
    errors.push('Payment frequency is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate the estimated completion date
 */
export function calculateCompletionDate(
  firstDraftDate: Date,
  frequency: PaymentFrequency,
  termMonths: number
): Date {
  const totalDrafts = calculateTotalDrafts(frequency, termMonths);
  return calculateDraftDate(firstDraftDate, frequency, totalDrafts - 1);
}

/**
 * Format draft amount for display
 */
export function formatDraftAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
