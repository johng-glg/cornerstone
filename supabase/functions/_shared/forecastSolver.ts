// Modification solver for the settlement forecasting engine (spec §9).
//
// Advisory only: given a client's projected balance timeline, it proposes how to cure a floor
// breach. Per product decision (J.G., 2026-06-05) it uses exactly two levers and NEVER touches
// accepted settlements / creditor-payment dates ("preserve settlements first"):
//   1. adjust the recurring client draft  (preferred)
//   2. a one-time deposit top-up          (fallback / always feasible)
//
// It does not mutate anything — pushing changes to Forth is a separate, human-authorized step.
// Pure + unit-tested (forecastSolver.test.ts); the timeline comes from fn_project_balance.

export interface TimelineRow {
  date: string; // YYYY-MM-DD (process_date)
  runningBalance: number;
  isFutureDraft: boolean; // a future client inflow draft we're allowed to scale up
}

export interface Proposal {
  lever: "adjust_recurring_draft" | "one_time_deposit";
  feasible: boolean;
  reason?: string;
  per_draft_increase?: number; // draft lever: added to each future draft
  drafts_affected?: number; // draft lever: how many future drafts
  total_added?: number; // total extra dollars the client contributes
  amount?: number; // deposit lever: the lump amount
  effective_by?: string; // deposit by / first draft on or before this date
  projected_min_after: number; // projected trough once the proposal is applied (>= floor when feasible)
}

export interface SolverResult {
  breach: boolean;
  floor: number;
  min_balance: number;
  shortfall: number; // floor - min_balance (0 when no breach)
  proposals: Proposal[]; // preferred first
}

/** Round money UP to the cent so a proposal never under-funds the cure. */
const ceilCent = (n: number): number => Math.ceil(n * 100 - 1e-6) / 100;
const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Solve for the cheapest-to-disrupt cure of a projected floor breach, restricted to the draft and
 * deposit levers. Returns proposals preferred-first (draft, then deposit). When the breach occurs
 * before any future draft can help, the draft lever is reported infeasible and only the deposit
 * proposal cures it.
 */
export function solveModification(
  timeline: TimelineRow[],
  floor: number,
  todayISO: string,
): SolverResult {
  const rows = [...timeline]
    .filter((r) => r.date >= todayISO)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  if (rows.length === 0) {
    return { breach: false, floor, min_balance: floor, shortfall: 0, proposals: [] };
  }

  // Prefix count of future drafts up to and including each row (drafts land "into" that balance).
  const draftsUpTo: number[] = [];
  let running = 0;
  for (const r of rows) {
    if (r.isFutureDraft) running += 1;
    draftsUpTo.push(running);
  }
  const totalFutureDrafts = running;

  const minBalance = Math.min(...rows.map((r) => r.runningBalance));
  if (minBalance >= floor) {
    return { breach: false, floor, min_balance: round2(minBalance), shortfall: 0, proposals: [] };
  }
  const shortfall = ceilCent(floor - minBalance);

  const breachIdx = rows.map((_, i) => i).filter((i) => rows[i].runningBalance < floor);
  const firstBreachDate = rows[breachIdx[0]].date;

  // ── Deposit lever (always feasible): one lump = shortfall, by the first breach date. ──
  const deposit: Proposal = {
    lever: "one_time_deposit",
    feasible: true,
    amount: shortfall,
    effective_by: firstBreachDate,
    total_added: shortfall,
    projected_min_after: floor,
  };

  // ── Draft lever (preferred): raise each future draft by a flat delta. The cumulative lift at a
  // breach point t is delta × (future drafts on/before t). Cure needs that >= floor − balance_t for
  // every breach point; if any breach point has no prior future draft, drafts alone can't cure it. ──
  let draftDelta = 0;
  let draftFeasible = totalFutureDrafts > 0;
  let infeasibleReason: string | undefined;
  for (const i of breachIdx) {
    const cnt = draftsUpTo[i];
    if (cnt === 0) {
      draftFeasible = false;
      infeasibleReason = "breach occurs before any future draft; a deposit is required";
      break;
    }
    draftDelta = Math.max(draftDelta, ceilCent((floor - rows[i].runningBalance) / cnt));
  }

  const proposals: Proposal[] = [];
  if (draftFeasible) {
    const projectedMin = Math.min(
      ...rows.map((r, i) => r.runningBalance + draftDelta * draftsUpTo[i]),
    );
    proposals.push({
      lever: "adjust_recurring_draft",
      feasible: true,
      per_draft_increase: draftDelta,
      drafts_affected: totalFutureDrafts,
      total_added: round2(draftDelta * totalFutureDrafts),
      effective_by: firstBreachDate,
      projected_min_after: round2(projectedMin),
    });
  } else {
    proposals.push({
      lever: "adjust_recurring_draft",
      feasible: false,
      reason: infeasibleReason ?? "no future drafts available to adjust",
      projected_min_after: round2(minBalance),
    });
  }
  proposals.push(deposit);

  return { breach: true, floor, min_balance: round2(minBalance), shortfall, proposals };
}
