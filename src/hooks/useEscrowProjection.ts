import { useMemo } from 'react';
import { addMonths, startOfMonth, isSameMonth, isAfter, isBefore, format } from 'date-fns';
import type { Transaction } from './useTransactions';
import type {
  ProposedSettlement,
  MonthlyProjection,
  AdjustmentSuggestion,
  EscrowProjectionResult,
  ScheduledTransaction,
  FeeCollectionMethod,
} from '@/types/escrow';
import { PROCESSOR_FEE_AMOUNT, CONTINGENCY_FEE_PERCENTAGE } from '@/types/escrow';

interface UseEscrowProjectionParams {
  currentEscrowBalance: number;
  monthlyDraft: number;
  scheduledTransactions: Transaction[];
  proposedSettlement?: ProposedSettlement | null;
  projectionMonths?: number;
}

function getTransactionStatus(status: string): 'open' | 'pending' | 'cleared' | 'cancelled' {
  const validStatuses = ['open', 'pending', 'cleared', 'cancelled'];
  return validStatuses.includes(status) ? status as any : 'open';
}

function parseScheduledTransactions(transactions: Transaction[]): ScheduledTransaction[] {
  return transactions
    .filter(t => t.scheduled_date && getTransactionStatus(t.status) !== 'cancelled')
    .map(t => ({
      id: t.id,
      type: (t.transaction_type as any) || 'draft',
      amount: t.amount,
      scheduledDate: new Date(t.scheduled_date!),
      status: getTransactionStatus(t.status),
      description: t.description || undefined,
      settlementId: t.settlement_id || undefined,
      liabilityId: t.liability_id || undefined,
    }));
}

function generateProjectedTransactions(
  proposedSettlement: ProposedSettlement,
  liabilityId?: string
): ScheduledTransaction[] {
  const transactions: ScheduledTransaction[] = [];
  const { amount, numberOfPayments, firstPaymentDate, feeCollectionMethod, feeStartOffsetMonths } = proposedSettlement;
  
  const paymentPerMonth = amount / numberOfPayments;
  const contingencyFee = amount * CONTINGENCY_FEE_PERCENTAGE;
  
  // Generate settlement payment transactions
  for (let i = 0; i < numberOfPayments; i++) {
    const paymentDate = addMonths(firstPaymentDate, i);
    transactions.push({
      type: 'settlement_payment',
      amount: paymentPerMonth,
      scheduledDate: paymentDate,
      status: 'open',
      description: `Settlement payment ${i + 1} of ${numberOfPayments}`,
      liabilityId,
    });
  }
  
  // Generate contingency fee transactions
  const feeStartDate = addMonths(firstPaymentDate, feeStartOffsetMonths);
  
  if (feeCollectionMethod === 'lump_sum') {
    transactions.push({
      type: 'contingency_fee',
      amount: contingencyFee,
      scheduledDate: feeStartDate,
      status: 'open',
      description: 'Contingency fee (lump sum)',
      liabilityId,
    });
  } else {
    // Split fees across same number of payments as settlement
    const feePerMonth = contingencyFee / numberOfPayments;
    for (let i = 0; i < numberOfPayments; i++) {
      const feeDate = addMonths(feeStartDate, i);
      transactions.push({
        type: 'contingency_fee',
        amount: feePerMonth,
        scheduledDate: feeDate,
        status: 'open',
        description: `Contingency fee ${i + 1} of ${numberOfPayments}`,
        liabilityId,
      });
    }
  }
  
  return transactions;
}

function calculateProjections(
  currentBalance: number,
  monthlyDraft: number,
  existingTransactions: ScheduledTransaction[],
  proposedTransactions: ScheduledTransaction[],
  projectionMonths: number
): MonthlyProjection[] {
  const projections: MonthlyProjection[] = [];
  const startMonth = startOfMonth(new Date());
  let runningBalance = currentBalance;
  
  const allTransactions = [...existingTransactions, ...proposedTransactions];
  
  for (let i = 0; i < projectionMonths; i++) {
    const currentMonth = addMonths(startMonth, i);
    
    // Find all transactions for this month
    const monthTransactions = allTransactions.filter(t => 
      isSameMonth(t.scheduledDate, currentMonth) && t.status !== 'cancelled'
    );
    
    // Calculate inflows and outflows
    let draftIn = 0;
    let processorFee = 0;
    let settlementOut = 0;
    let contingencyFee = 0;
    let otherOut = 0;
    
    // Check if there's a draft scheduled this month in existing transactions
    const hasDraft = monthTransactions.some(t => t.type === 'draft');
    if (hasDraft) {
      const draft = monthTransactions.find(t => t.type === 'draft');
      draftIn = draft?.amount || monthlyDraft;
    } else if (i < projectionMonths) {
      // Assume standard monthly draft if no specific transaction
      draftIn = monthlyDraft;
    }
    
    // Check processor fee
    const hasProcessorFee = monthTransactions.some(t => t.type === 'processor_fee');
    if (hasProcessorFee) {
      const fee = monthTransactions.find(t => t.type === 'processor_fee');
      processorFee = fee?.amount || PROCESSOR_FEE_AMOUNT;
    } else {
      processorFee = PROCESSOR_FEE_AMOUNT;
    }
    
    // Sum settlement payments
    settlementOut = monthTransactions
      .filter(t => t.type === 'settlement_payment')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Sum contingency fees
    contingencyFee = monthTransactions
      .filter(t => t.type === 'contingency_fee')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Calculate balance
    runningBalance = runningBalance + draftIn - processorFee - settlementOut - contingencyFee - otherOut;
    
    // Determine status
    let status: MonthlyProjection['status'] = 'ok';
    if (runningBalance < 0) {
      status = 'negative';
    } else if (runningBalance < monthlyDraft * 0.5) {
      status = 'danger';
    } else if (runningBalance < monthlyDraft) {
      status = 'warning';
    }
    
    projections.push({
      month: currentMonth,
      label: format(currentMonth, 'MMM yyyy'),
      draftIn,
      processorFee,
      settlementOut,
      contingencyFee,
      otherOut,
      balance: runningBalance,
      status,
    });
  }
  
  return projections;
}

function generateSuggestions(
  projections: MonthlyProjection[],
  monthlyDraft: number,
  proposedSettlement: ProposedSettlement | null
): AdjustmentSuggestion[] {
  const suggestions: AdjustmentSuggestion[] = [];
  
  const negativeMonths = projections.filter(p => p.balance < 0);
  if (negativeMonths.length === 0) return suggestions;
  
  const maxNegative = Math.abs(Math.min(...projections.map(p => p.balance)));
  const firstNegativeIndex = projections.findIndex(p => p.balance < 0);
  const remainingMonths = projections.length - firstNegativeIndex;
  
  // Suggestion 1: Increase monthly draft
  const draftIncrease = Math.ceil((maxNegative / remainingMonths) * 1.1); // 10% buffer
  if (draftIncrease > 0 && draftIncrease < monthlyDraft * 0.5) {
    suggestions.push({
      id: 'increase_draft',
      type: 'increase_draft',
      label: 'Increase Monthly Draft',
      description: `Increase draft by $${draftIncrease} for ${remainingMonths} months`,
      value: draftIncrease,
      unit: '/month',
      impact: `Adds $${draftIncrease * remainingMonths} to escrow over ${remainingMonths} months`,
    });
  }
  
  // Suggestion 2: One-time payment
  const oneTimeAmount = Math.ceil(maxNegative * 1.15); // 15% buffer
  suggestions.push({
    id: 'one_time_payment',
    type: 'one_time_payment',
    label: 'One-Time Payment',
    description: `Add one-time payment of $${oneTimeAmount} before settlement`,
    value: oneTimeAmount,
    unit: 'one-time',
    impact: `Immediately adds $${oneTimeAmount} to escrow`,
  });
  
  // Suggestion 3: Delay start (if applicable)
  if (proposedSettlement && firstNegativeIndex > 0) {
    const delayMonths = Math.ceil(maxNegative / monthlyDraft) + 1;
    if (delayMonths <= 3) {
      suggestions.push({
        id: 'delay_start',
        type: 'delay_start',
        label: 'Delay First Payment',
        description: `Delay first payment by ${delayMonths} month${delayMonths > 1 ? 's' : ''}`,
        value: delayMonths,
        unit: 'months',
        impact: `Allows ${delayMonths} more draft${delayMonths > 1 ? 's' : ''} before payments begin`,
      });
    }
  }
  
  // Suggestion 4: Extend term
  if (proposedSettlement && proposedSettlement.numberOfPayments < 12) {
    const extendedPayments = proposedSettlement.numberOfPayments + 3;
    const newMonthlyPayment = proposedSettlement.amount / extendedPayments;
    suggestions.push({
      id: 'extend_term',
      type: 'extend_term',
      label: 'Extend Settlement Term',
      description: `Extend to ${extendedPayments} payments ($${newMonthlyPayment.toFixed(2)}/mo)`,
      value: extendedPayments,
      unit: 'payments',
      impact: `Reduces monthly settlement payment by $${((proposedSettlement.amount / proposedSettlement.numberOfPayments) - newMonthlyPayment).toFixed(2)}`,
    });
  }
  
  return suggestions;
}

export function useEscrowProjection({
  currentEscrowBalance,
  monthlyDraft,
  scheduledTransactions,
  proposedSettlement,
  projectionMonths = 24,
}: UseEscrowProjectionParams): EscrowProjectionResult {
  return useMemo(() => {
    const existingTransactions = parseScheduledTransactions(scheduledTransactions);
    
    const proposedTransactions = proposedSettlement
      ? generateProjectedTransactions(proposedSettlement)
      : [];
    
    const projections = calculateProjections(
      currentEscrowBalance,
      monthlyDraft,
      existingTransactions,
      proposedTransactions,
      projectionMonths
    );
    
    const negativeMonths = projections.filter(p => p.balance < 0);
    const isViable = negativeMonths.length === 0;
    const maxNegativeBalance = Math.min(...projections.map(p => p.balance), 0);
    const shortfall = Math.abs(maxNegativeBalance);
    const firstNegativeMonth = negativeMonths.length > 0 ? negativeMonths[0].month : null;
    
    const suggestions = generateSuggestions(projections, monthlyDraft, proposedSettlement || null);
    
    const contingencyFeeAmount = proposedSettlement 
      ? proposedSettlement.amount * CONTINGENCY_FEE_PERCENTAGE 
      : 0;
    
    const totalSettlementPayments = proposedSettlement?.amount || 0;
    const totalContingencyFees = contingencyFeeAmount;
    
    return {
      projections,
      isViable,
      shortfall,
      maxNegativeBalance,
      firstNegativeMonth,
      suggestions,
      totalSettlementPayments,
      totalContingencyFees,
      contingencyFeeAmount,
    };
  }, [currentEscrowBalance, monthlyDraft, scheduledTransactions, proposedSettlement, projectionMonths]);
}
