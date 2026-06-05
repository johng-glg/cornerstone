// Settlement calculator — the single place all settlement-builder money math lives.
//
// ⚠️ ASSUMPTIONS TO CONFIRM AGAINST THE GLG SETTLEMENT CALCULATOR. These are industry-standard
// defaults, not GLG's proprietary formulas (which weren't available when this was written). Each is
// isolated here so the real logic drops in by editing this one file — the builder UI reads only
// these functions. The two that most need sign-off are marked (CONFIRM):
//   1. settlement %        = offer / enrolled × 100
//   2. gross savings       = enrolled − offer
//   3. performance fee     = feeRatePct% × enrolled_balance         (CONFIRM the basis: enrolled vs
//                                                                    savings vs offer)
//   4. net savings         = enrolled − offer − fee
//   5. schedule            = equal installments by cadence, rounding remainder onto the last
//   6. fee split ("split") = fee spread equally over payments on/after fee_start_offset_months;
//                            ("lump_sum") = whole fee on the first eligible payment   (CONFIRM)
//   7. feasibility         = escrow_now + recurring draft − this offer's payments (+incidental
//                            buffer) must stay ≥ floor. Does NOT yet net other concurrent offers.

export interface ScheduledPayment {
  due_date: string; // YYYY-MM-DD
  amount: number;
}

export type Cadence = "monthly" | "biweekly";
export type FeeMethod = "split" | "lump_sum";

const round2 = (n: number) => Math.round(n * 100) / 100;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** Settlement percentage of the enrolled balance (null when enrolled is unknown/zero). */
export function settlementPercent(
  offer: number,
  enrolled: number | null | undefined,
): number | null {
  if (!enrolled || enrolled <= 0) return null;
  return round2((offer / enrolled) * 100);
}

/** Gross savings vs. the enrolled balance (before fees). */
export function grossSavings(enrolled: number | null | undefined, offer: number): number {
  return round2((enrolled ?? 0) - offer);
}

/** Performance/attorney fee. (CONFIRM basis — defaults to a % of the enrolled balance.) */
export function performanceFee(
  enrolled: number | null | undefined,
  feeRatePct: number | null | undefined,
): number {
  if (!feeRatePct) return 0;
  return round2(((enrolled ?? 0) * feeRatePct) / 100);
}

/** Net savings to the client after the performance fee. */
export function netSavings(
  enrolled: number | null | undefined,
  offer: number,
  fee: number,
): number {
  return round2((enrolled ?? 0) - offer - fee);
}

const addMonths = (start: Date, n: number) => {
  const d = new Date(start);
  d.setMonth(d.getMonth() + n);
  return d;
};
const addDays = (start: Date, n: number) => {
  const d = new Date(start);
  d.setDate(d.getDate() + n);
  return d;
};

/** Equal-installment schedule by cadence; the rounding remainder lands on the final payment. */
export function buildCadenceSchedule(
  total: number,
  count: number,
  firstDate: string | null,
  cadence: Cadence = "monthly",
): ScheduledPayment[] {
  if (!count || count < 1) return [];
  const start = firstDate ? new Date(firstDate) : new Date();
  if (Number.isNaN(start.getTime())) return [];
  const per = round2(total / count);
  const out: ScheduledPayment[] = [];
  let allocated = 0;
  for (let i = 0; i < count; i++) {
    const d = cadence === "biweekly" ? addDays(start, i * 14) : addMonths(start, i);
    const amount = i === count - 1 ? round2(total - allocated) : per;
    allocated = round2(allocated + amount);
    out.push({ due_date: isoDay(d), amount });
  }
  return out;
}

export const scheduleSum = (schedule: ScheduledPayment[]): number =>
  round2(schedule.reduce((s, p) => s + (Number(p.amount) || 0), 0));

/** Does the schedule reconcile to the offer (within a cent)? */
export const scheduleReconciles = (schedule: ScheduledPayment[], offer: number): boolean =>
  Math.abs(scheduleSum(schedule) - offer) < 0.01;

/**
 * Per-payment fee preview aligned to the schedule. "split" spreads the fee across payments due on
 * or after the offset; "lump_sum" puts it all on the first eligible payment. (CONFIRM with GLG.)
 */
export function splitFee(
  fee: number,
  schedule: ScheduledPayment[],
  method: FeeMethod,
  offsetMonths: number,
  firstDate: string | null,
): number[] {
  const fees = schedule.map(() => 0);
  if (fee <= 0 || schedule.length === 0) return fees;
  const start = firstDate ? new Date(firstDate) : new Date(schedule[0].due_date);
  const feeStart = isoDay(addMonths(start, offsetMonths || 0));
  const eligible = schedule.map((p, i) => ({ i, ok: p.due_date >= feeStart })).filter((x) => x.ok);
  if (eligible.length === 0) return fees;
  if (method === "lump_sum") {
    fees[eligible[0].i] = round2(fee);
    return fees;
  }
  const per = round2(fee / eligible.length);
  let allocated = 0;
  eligible.forEach((e, k) => {
    const amt = k === eligible.length - 1 ? round2(fee - allocated) : per;
    allocated = round2(allocated + amt);
    fees[e.i] = amt;
  });
  return fees;
}

export interface FeasibilityInput {
  escrowNow: number;
  monthlyDeposit: number;
  offerSchedule: ScheduledPayment[];
  floor: number;
  today: string;
  incidental?: number; // per-payment buffer (system_setting), default $6
  horizonMonths?: number; // minimum look-ahead, default 12
}

export interface FeasibilityResult {
  projectedMin: number;
  feasible: boolean;
  shortfall: number; // 0 when feasible
}

/**
 * Will this offer keep the client's escrow pool above the floor? Projects the current escrow forward
 * with the recurring draft and this offer's outflows. On a shared date, the outflow is applied
 * before the deposit (conservative: "are the funds there when the payment hits?").
 */
export function projectEscrowFeasibility(input: FeasibilityInput): FeasibilityResult {
  const { escrowNow, monthlyDeposit, offerSchedule, floor, today } = input;
  const incidental = input.incidental ?? 6;
  const horizonMonths = input.horizonMonths ?? 12;
  const start = new Date(today);

  const lastOffer = offerSchedule.reduce((m, p) => (p.due_date > m ? p.due_date : m), today);
  const monthsToLast = Math.max(
    horizonMonths,
    Math.ceil((new Date(lastOffer).getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)),
  );

  type Ev = { date: string; amount: number; out: boolean };
  const events: Ev[] = [];
  for (let m = 1; m <= monthsToLast; m++) {
    events.push({ date: isoDay(addMonths(start, m)), amount: monthlyDeposit, out: false });
  }
  for (const p of offerSchedule) {
    events.push({ date: p.due_date, amount: -(p.amount + incidental), out: true });
  }
  // Chronological; on a tie, outflows first.
  events.sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : a.out === b.out ? 0 : a.out ? -1 : 1,
  );

  let bal = escrowNow;
  let min = escrowNow;
  for (const e of events) {
    bal = round2(bal + e.amount);
    if (bal < min) min = bal;
  }
  const feasible = min >= floor;
  return { projectedMin: round2(min), feasible, shortfall: feasible ? 0 : round2(floor - min) };
}
