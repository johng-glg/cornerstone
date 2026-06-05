import { describe, it, expect } from "vitest";
import {
  buildCadenceSchedule,
  grossSavings,
  netSavings,
  performanceFee,
  projectEscrowFeasibility,
  scheduleReconciles,
  scheduleSum,
  settlementPercent,
  splitFee,
} from "./settlementMath";

describe("settlement math", () => {
  it("settlement % and savings", () => {
    expect(settlementPercent(4000, 10000)).toBe(40);
    expect(settlementPercent(4000, 0)).toBeNull();
    expect(grossSavings(10000, 4000)).toBe(6000);
  });

  it("performance fee + net savings (fee = % of enrolled by default)", () => {
    const fee = performanceFee(10000, 27); // 2700
    expect(fee).toBe(2700);
    expect(netSavings(10000, 4000, fee)).toBe(3300);
    expect(performanceFee(10000, null)).toBe(0);
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
    const fees = splitFee(300, sched, "split", 0, "2026-07-01");
    expect(fees).toEqual([100, 100, 100]);
  });

  it("respects the fee_start_offset_months (skips early payments)", () => {
    const fees = splitFee(300, sched, "split", 1, "2026-07-01");
    expect(fees[0]).toBe(0); // first month skipped
    expect(scheduleSum(fees.map((amount) => ({ due_date: "x", amount })))).toBe(300);
  });

  it("lump_sum puts the whole fee on the first eligible payment", () => {
    const fees = splitFee(300, sched, "lump_sum", 0, "2026-07-01");
    expect(fees).toEqual([300, 0, 0]);
  });
});

describe("projectEscrowFeasibility", () => {
  it("feasible when escrow + draft cover the payment", () => {
    const r = projectEscrowFeasibility({
      escrowNow: 2000,
      monthlyDeposit: 300,
      offerSchedule: [{ due_date: "2026-07-05", amount: 1000 }],
      floor: 100,
      today: "2026-06-05",
      incidental: 0,
    });
    expect(r.feasible).toBe(true);
    expect(r.shortfall).toBe(0);
  });

  it("infeasible when the payment drops escrow below the floor", () => {
    const r = projectEscrowFeasibility({
      escrowNow: 500,
      monthlyDeposit: 300,
      offerSchedule: [{ due_date: "2026-07-05", amount: 1000 }],
      floor: 100,
      today: "2026-06-05",
      incidental: 0,
    });
    expect(r.feasible).toBe(false);
    // outflow applied before that month's deposit: 500 - 1000 = -500 -> shortfall 600
    expect(r.projectedMin).toBe(-500);
    expect(r.shortfall).toBe(600);
  });
});
