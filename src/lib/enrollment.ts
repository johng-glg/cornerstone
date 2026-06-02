/**
 * Consumer Defense program pricing. Mirrors the reference design:
 * - Program cost ≈ enrolled debt × (estimated settlement rate + settlement fee).
 * - Monthly draft = program cost spread over the term, floored at a $350 minimum.
 * - Total program cost = monthly draft × term (so the floor is reflected in the total).
 */

export const MIN_MONTHLY_DRAFT = 350;
export const PROGRAM_TERMS = [18, 24, 36, 48] as const;

export type PlanType = "glg_standard" | "glg_adjustable" | "glg_exception";

export interface PlanOption {
  type: PlanType;
  label: string;
  settlementRate: number; // share of balance expected to settle at
  feePercentage: number; // settlement fee as a share of enrolled debt
  note: string;
}

export const PLAN_OPTIONS: PlanOption[] = [
  {
    type: "glg_standard",
    label: "GLG 2.0 Standard",
    settlementRate: 0.55,
    feePercentage: 0.25,
    note: "25% settlement fee, est. 55% settlement rate",
  },
  {
    type: "glg_adjustable",
    label: "GLG Adjustable",
    settlementRate: 0.65,
    feePercentage: 0.25,
    note: "Higher settlement % (55-70%) for aggressive creditors",
  },
  {
    type: "glg_exception",
    label: "GLG Exception",
    settlementRate: 0.55,
    feePercentage: 0.25,
    note: "Extended terms up to 54 months · requires approval",
  },
];

/** Monthly draft for a given enrolled debt, term, and plan — floored at the minimum. */
export function monthlyDraft(totalDebt: number, termMonths: number, plan: PlanOption): number {
  if (termMonths <= 0) return MIN_MONTHLY_DRAFT;
  const programCost = totalDebt * (plan.settlementRate + plan.feePercentage);
  return Math.max(MIN_MONTHLY_DRAFT, Math.round(programCost / termMonths));
}

/** Total program cost = monthly draft × term. */
export function totalProgramCost(totalDebt: number, termMonths: number, plan: PlanOption): number {
  return monthlyDraft(totalDebt, termMonths, plan) * termMonths;
}

export function planByType(type: PlanType): PlanOption {
  return PLAN_OPTIONS.find((p) => p.type === type) ?? PLAN_OPTIONS[0];
}
