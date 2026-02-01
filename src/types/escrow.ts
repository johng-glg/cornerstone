// Escrow projection types for settlement offer builder

export type TransactionType = 'draft' | 'processor_fee' | 'settlement_payment' | 'contingency_fee';
export type TransactionStatus = 'open' | 'pending' | 'cleared' | 'cancelled';
export type FeeCollectionMethod = 'split' | 'lump_sum';

export interface ScheduledTransaction {
  id?: string;
  type: TransactionType;
  amount: number;
  scheduledDate: Date;
  status: TransactionStatus;
  description?: string;
  settlementId?: string;
  liabilityId?: string;
}

export interface MonthlyProjection {
  month: Date;
  label: string;
  draftIn: number;
  processorFee: number;
  settlementOut: number;
  contingencyFee: number;
  otherOut: number;
  balance: number;
  status: 'ok' | 'warning' | 'danger' | 'negative';
}

export interface ProposedSettlement {
  amount: number;
  numberOfPayments: number;
  firstPaymentDate: Date;
  feeCollectionMethod: FeeCollectionMethod;
  feeStartOffsetMonths: number;
}

export interface AdjustmentSuggestion {
  id: string;
  type: 'increase_draft' | 'one_time_payment' | 'delay_start' | 'extend_term';
  label: string;
  description: string;
  value: number;
  unit: string;
  impact: string;
}

export interface EscrowProjectionResult {
  projections: MonthlyProjection[];
  isViable: boolean;
  shortfall: number;
  maxNegativeBalance: number;
  firstNegativeMonth: Date | null;
  suggestions: AdjustmentSuggestion[];
  totalSettlementPayments: number;
  totalContingencyFees: number;
  contingencyFeeAmount: number;
}

// Constants
export const PROCESSOR_FEE_AMOUNT = 10;
export const CONTINGENCY_FEE_PERCENTAGE = 0.27;
