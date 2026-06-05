import { describe, it, expect } from "vitest";
import {
  buildCadenceSchedule,
  grossSavings,
  netSavings,
  performanceFee,
  projectOfferFeasibility,
  scheduleReconciles,
  scheduleSum,
  settlementPercent,
  splitFee,
  type TimelineTx,
} from "./settlementMath";

describe("settlement math", () => {
  it("settlement % and savings", () => {
    expect(settlementPercent(4000, 10000)).toBe(40);
    expect(settlementPercent(4000, 0)).toBeNull();
    expect(grossSavings(10000, 4000)).toBe(6000);
  });

  it("performance fee = rate × basis (savings); net savings nets it out", () => {
    const fee = performanceFee(6000, 27); // 27% of $6,000 savings
    expect(fee).toBe(1620);
    expect(netSavings(10000, 4000, fee)).toBe(4380);
    expect(performanceFee(6000, null)).toBe(0);
  });
});

describe("buildCadenceSchedule", () => {
  it("monthly, remainder on last so it reconciles", () => {
    const s = buildCadenceSchedule(1000, 3, "2026-07-01", "monthly");
    expect(s.map((p) => p.due_date)).toEqual(["2026-07-01", "2026-08-01", "2026-09-01"]);
    expect(s.map((p) => p.amount)).toEqual([333.33, 333.33, 333.34]);
    expect(scheduleSum(s)).toBe(1000);
    expect(scheduleReconciles(s, 1000)).toBe(true);
  });

  it("biweekly steps 14 days", () => {
    const s = buildCadenceSchedule(800, 2, "2026-07-01", "biweekly");
    expect(s.map((p) => p.due_date)).toEqual(["2026-07-01", "2026-07-15"]);
    expect(scheduleSum(s)).toBe(800);
  });
});

describe("splitFee", () => {
  const sched = buildCadenceSchedule(900, 3, "2026-07-01", "monthly");

  it("splits equally across all payments when offset is 0", () => {
    expect(splitFee(300, sched, "split", 0, "2026-07-01")).toEqual([100, 100, 100]);
  });

  it("respects the fee_start_offset_months (skips early payments) and still sums to the fee", () => {
    const fees = splitFee(300, sched, "split", 1, "2026-07-01");
    expect(fees[0]).toBe(0);
    expect(scheduleSum(fees.map((amount) => ({ due_date: "x", amount })))).toBe(300);
  });

  it("lump_sum puts the whole fee on the first eligible payment", () => {
    expect(splitFee(300, sched, "lump_sum", 0, "2026-07-01")).toEqual([300, 0, 0]);
  });
});

describe("projectOfferFeasibility (port of VW_MASS_SETTLEMENT_OFFER_CALCULATIONS)", () => {
  // Two client deposits, then the offer's single payment.
  const existing: TimelineTx[] = [
    { process_date: "2026-06-10", net_amount: 500 },
    { process_date: "2026-07-10", net_amount: 500 },
  ];

  it("OK when the running balance stays at/above the floor (payment carries the −$6 buffer)", () => {
    const r = projectOfferFeasibility(existing, [{ due_date: "2026-07-15", amount: 800 }], [], 0);
    expect(r.firstPaymentDate).toBe("2026-07-15");
    expect(r.minRunningBalance).toBe(194); // 1000 − (800 + 6)
    expect(r.verdict).toBe("OK");
    expect(r.feasible).toBe(true);
    expect(r.minBalanceRemaining).toBe(194);
  });

  it("CLIENT GOES SHORT with additional funds needed when it dips below the floor", () => {
    const r = projectOfferFeasibility(existing, [{ due_date: "2026-07-15", amount: 1200 }], [], 0);
    expect(r.verdict).toBe("CLIENT GOES SHORT");
    expect(r.minRunningBalance).toBe(-206); // 1000 − 1206
    expect(r.additionalFundsNeeded).toBe(206);
    expect(r.feasible).toBe(false);
  });

  it("honors a non-zero Maintain Min Balance floor", () => {
    const r = projectOfferFeasibility(existing, [{ due_date: "2026-07-15", amount: 800 }], [], 300);
    expect(r.verdict).toBe("CLIENT GOES SHORT");
    expect(r.additionalFundsNeeded).toBe(106); // floor 300 − min 194
  });

  it("includes EPF fee outflows in the running balance", () => {
    const r = projectOfferFeasibility(
      existing,
      [{ due_date: "2026-07-15", amount: 700 }],
      [{ due_date: "2026-07-20", amount: 100 }],
      0,
    );
    expect(r.minRunningBalance).toBe(194); // 1000 − 706, then − 100
  });

  it("no offer lines => trivially feasible", () => {
    expect(projectOfferFeasibility(existing, [], [], 0).feasible).toBe(true);
  });
});
