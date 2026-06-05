import { assertEquals } from "jsr:@std/assert@1";
import { solveModification, type TimelineRow } from "./forecastSolver.ts";

const TODAY = "2026-06-05";
const row = (date: string, runningBalance: number, isFutureDraft = false): TimelineRow => ({
  date,
  runningBalance,
  isFutureDraft,
});

Deno.test("no breach => no proposals", () => {
  const r = solveModification([row("2026-07-01", 500), row("2026-08-01", 300)], 100, TODAY);
  assertEquals(r.breach, false);
  assertEquals(r.shortfall, 0);
  assertEquals(r.proposals.length, 0);
});

Deno.test("draft lever preferred when future drafts precede the breach", () => {
  const r = solveModification(
    [
      row("2026-07-01", 80, true), // breach: needs 20 over 1 draft
      row("2026-08-01", 60, true), // breach: needs 40 over 2 drafts -> 20 each
      row("2026-09-01", 200),
    ],
    100,
    TODAY,
  );
  assertEquals(r.breach, true);
  assertEquals(r.min_balance, 60);
  assertEquals(r.shortfall, 40); // floor - min
  // preferred proposal is the recurring-draft adjustment
  const draft = r.proposals[0];
  assertEquals(draft.lever, "adjust_recurring_draft");
  assertEquals(draft.feasible, true);
  assertEquals(draft.per_draft_increase, 20);
  assertEquals(draft.drafts_affected, 2);
  assertEquals(draft.total_added, 40);
  assertEquals(draft.projected_min_after, 100); // cured exactly to floor
  // fallback is the one-time deposit = shortfall
  const dep = r.proposals[1];
  assertEquals(dep.lever, "one_time_deposit");
  assertEquals(dep.amount, 40);
  assertEquals(dep.effective_by, "2026-07-01");
  assertEquals(dep.projected_min_after, 100);
});

Deno.test("draft lever infeasible when breach precedes any future draft => deposit cures", () => {
  const r = solveModification(
    [
      row("2026-07-01", 50), // breach, no future draft on/before it
      row("2026-08-01", 90, true),
    ],
    100,
    TODAY,
  );
  assertEquals(r.breach, true);
  const draft = r.proposals[0];
  assertEquals(draft.lever, "adjust_recurring_draft");
  assertEquals(draft.feasible, false);
  const dep = r.proposals[1];
  assertEquals(dep.feasible, true);
  assertEquals(dep.amount, 50); // floor - min(50,90) = 50
  assertEquals(dep.effective_by, "2026-07-01");
});

Deno.test("per-draft increase rounds UP to the cent so the cure never under-funds", () => {
  const r = solveModification([row("2026-07-01", 33.34, true)], 100, TODAY);
  // single draft, shortfall 66.66 over 1 draft -> 66.66
  assertEquals(r.proposals[0].per_draft_increase, 66.66);

  const r2 = solveModification(
    [row("2026-07-01", 0, true), row("2026-08-01", 0, true), row("2026-09-01", 0, true)],
    100,
    TODAY,
  );
  // worst breach needs 100 over up-to-3 drafts; first row has only 1 draft -> 100/1 = 100
  assertEquals(r2.proposals[0].per_draft_increase, 100);
});

Deno.test("past rows (before today) are ignored", () => {
  const r = solveModification([row("2026-01-01", -500), row("2026-07-01", 400)], 100, TODAY);
  assertEquals(r.breach, false); // the only in-window row is above floor
});
