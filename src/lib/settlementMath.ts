// Settlement calculator — the single place all settlement-builder money math lives.
//
// Ported from GLG's Snowflake views (NG & PPD Queries), so the builder matches the Forth
// "Settlements & Negotiations" page:
//   • VW_MASS_SETTLEMENT_OFFER_CALCULATIONS — the funds-availability calc (running "Client Balance"
//     over the transaction timeline; MIN(running) < floor ⇒ "CLIENT GOES SHORT"; additional funds
//     needed = floor − MIN). Settlement payments are outflows of (−amount − $6 custodial); EPF fees
//     are outflows of (−amount). MIN is taken over rows on/after the offer's first payment date,
//     while the running balance accumulates from the start of the timeline.
//   • VW_TRANSACTIONS_2 — NET_AMOUNT = (INOUT='O' ? −AMOUNT : AMOUNT).
//   • VW_SETTLEMENT_OFFER_PARSED_PAYMENTS / _FEES — the per-offer payment + EPF schedules.
//
// The view's hard floor is 0 ("goes short" < 0); the Forth page exposes a per-offer "Maintain Min
// Balance" the builder passes as `floor`. The performance fee (the 27% badge) is a % of the
// ENROLLED debt (confirmed J.G., 2026-06-05); the builder still lets you override the dollar amount.

export interface ScheduledPayment {
  due_date: string; // YYYY-MM-DD
  amount: number;
}

export type Cadence = "monthly" | "biweekly";
export type FeeMethod = "split" | "lump_sum";

const round2 = (n: number) => Math.round(n * 100) / 100;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** Settlement percentage of the enrolled/original balance (null when unknown/zero). */
export function settlementPercent(
  offer: number,
  enrolled: number | null | undefined,
): number | null {
  if (!enrolled || enrolled <= 0) return null;
  return round2((offer / enrolled) * 100);
}

/** Gross savings vs. the original balance (before the performance fee). */
export function grossSavings(enrolled: number | null | undefined, offer: number): number {
  return round2((enrolled ?? 0) - offer);
}

/**
 * Performance (settlement) fee = feeRatePct% of the basis. GLG's basis is the ENROLLED debt, so the
 * builder passes the enrolled balance. The result is editable in the builder.
 */
export function performanceFee(basisAmount: number, feeRatePct: number | null | undefined): number {
  if (!feeRatePct || basisAmount <= 0) return 0;
  return round2((basisAmount * feeRatePct) / 100);
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
 * Per-payment EPF preview aligned to the schedule. "split" spreads the fee across payments due on or
 * after the offset; "lump_sum" puts it all on the first eligible payment.
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

/** One existing transaction on the client's timeline (already status-filtered, signed NET_AMOUNT). */
export interface TimelineTx {
  process_date: string;
  net_amount: number;
}

export interface OfferFeasibility {
  firstPaymentDate: string | null;
  minRunningBalance: number | null;
  verdict: "OK" | "CLIENT GOES SHORT" | null;
  additionalFundsNeeded: number | null; // floor − min, when short
  minBalanceRemaining: number | null; // min, when ok
  feasible: boolean;
}

const CUSTODIAL_BUFFER = 6; // VW: settlement payments are (−amount − 6)

/**
 * Port of VW_MASS_SETTLEMENT_OFFER_CALCULATIONS for a *draft* offer: overlay this offer's payments
 * (−amount − $6) and EPF fees (−amount) onto the client's existing transaction timeline, accumulate
 * the running balance, and take the minimum over rows on/after the offer's first payment date.
 * `floor` is the Maintain-Min-Balance (the view uses 0). Tie-break on a shared date follows the
 * view's RECORD_SOURCE ordering: existing transactions, then fees, then payments.
 */
export function projectOfferFeasibility(
  existing: TimelineTx[],
  payments: ScheduledPayment[],
  fees: ScheduledPayment[],
  floor = 0,
): OfferFeasibility {
  if (payments.length === 0 && fees.length === 0) {
    return {
      firstPaymentDate: null,
      minRunningBalance: null,
      verdict: null,
      additionalFundsNeeded: null,
      minBalanceRemaining: null,
      feasible: true,
    };
  }
  const firstPaymentDate = [...payments, ...fees]
    .map((p) => p.due_date)
    .filter(Boolean)
    .sort()[0];

  type Ev = { date: string; net: number; rank: number; seq: number };
  const events: Ev[] = [
    ...existing.map((r, i) => ({ date: r.process_date, net: r.net_amount, rank: 0, seq: i })),
    ...fees.map((f, i) => ({ date: f.due_date, net: -f.amount, rank: 1, seq: i })),
    ...payments.map((p, i) => ({
      date: p.due_date,
      net: -(p.amount + CUSTODIAL_BUFFER),
      rank: 2,
      seq: i,
    })),
  ];
  events.sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : a.rank - b.rank || a.seq - b.seq,
  );

  let bal = 0;
  let min: number | null = null;
  for (const e of events) {
    bal = round2(bal + e.net);
    if (e.date >= firstPaymentDate && (min === null || bal < min)) min = bal;
  }
  if (min === null) {
    return {
      firstPaymentDate,
      minRunningBalance: null,
      verdict: "OK",
      additionalFundsNeeded: null,
      minBalanceRemaining: null,
      feasible: true,
    };
  }
  const short = min < floor;
  return {
    firstPaymentDate,
    minRunningBalance: min,
    verdict: short ? "CLIENT GOES SHORT" : "OK",
    additionalFundsNeeded: short ? round2(floor - min) : null,
    minBalanceRemaining: short ? null : min,
    feasible: !short,
  };
}
