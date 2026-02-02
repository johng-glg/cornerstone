import type { Enums } from '@/integrations/supabase/types';

export interface ThresholdCriteria {
  min: number;
  max?: number;
  points: number;
}

export interface BooleanCriteria {
  points: number;
  only_for_interest_types?: string[];
}

export interface ScoringCriteria {
  estimated_debt?: {
    thresholds: ThresholdCriteria[];
  };
  number_of_debts?: {
    thresholds: ThresholdCriteria[];
  };
  has_active_lawsuit?: BooleanCriteria;
  credit_auth_given?: {
    points: number;
  };
  email_provided?: {
    points: number;
  };
  phone_provided?: {
    points: number;
  };
  source_quality?: Record<string, number>;
  monthly_income?: {
    thresholds: ThresholdCriteria[];
  };
}

export interface ScoringProfile {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  interest_type: Enums<'lead_interest'> | null;
  source: Enums<'lead_source'> | null;
  is_default: boolean;
  is_active: boolean;
  criteria: ScoringCriteria;
  created_at: string;
  updated_at: string;
}

export type ScoringProfileInsert = Omit<ScoringProfile, 'id' | 'created_at' | 'updated_at'>;
export type ScoringProfileUpdate = Partial<ScoringProfileInsert>;

export interface ScoreBreakdown {
  estimated_debt?: number;
  number_of_debts?: number;
  has_active_lawsuit?: number;
  credit_auth_given?: number;
  email_provided?: number;
  phone_provided?: number;
  source_quality?: number;
  monthly_income?: number;
}

// Labels for score breakdown display
export const SCORE_FACTOR_LABELS: Record<string, string> = {
  estimated_debt: 'Estimated Debt',
  number_of_debts: 'Number of Debts',
  has_active_lawsuit: 'Active Lawsuit',
  credit_auth_given: 'Credit Auth',
  email_provided: 'Email Provided',
  phone_provided: 'Phone Provided',
  source_quality: 'Source Quality',
  monthly_income: 'Monthly Income',
};

// Default scoring criteria template
export const DEFAULT_SCORING_CRITERIA: ScoringCriteria = {
  estimated_debt: {
    thresholds: [
      { min: 10000, max: 24999, points: 10 },
      { min: 25000, max: 49999, points: 20 },
      { min: 50000, points: 30 },
    ],
  },
  number_of_debts: {
    thresholds: [
      { min: 3, max: 4, points: 10 },
      { min: 5, points: 15 },
    ],
  },
  has_active_lawsuit: {
    points: 20,
    only_for_interest_types: ['litigation'],
  },
  credit_auth_given: { points: 15 },
  email_provided: { points: 5 },
  phone_provided: { points: 5 },
  source_quality: {
    referral: 10,
    phone: 8,
    web_form: 6,
    advertisement: 4,
    walk_in: 5,
    other: 2,
  },
};
