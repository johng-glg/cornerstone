import { describe, it, expect } from "vitest";
import {
  MIN_MONTHLY_DRAFT,
  PLAN_OPTIONS,
  monthlyDraft,
  planByType,
  totalProgramCost,
} from "./enrollment";

const standard = planByType("glg_standard");

describe("enrollment pricing", () => {
  it("floors the monthly draft at the minimum for zero/low debt", () => {
    expect(monthlyDraft(0, 24, standard)).toBe(MIN_MONTHLY_DRAFT);
    expect(monthlyDraft(1000, 48, standard)).toBe(MIN_MONTHLY_DRAFT);
  });

  it("total cost = monthly draft × term", () => {
    expect(totalProgramCost(0, 18, standard)).toBe(MIN_MONTHLY_DRAFT * 18);
    expect(totalProgramCost(0, 24, standard)).toBe(MIN_MONTHLY_DRAFT * 24);
  });

  it("scales the draft with enrolled debt above the floor", () => {
    // 30k debt, standard plan (0.55 + 0.25 = 0.80) over 24 months = 24000/24 = 1000
    expect(monthlyDraft(30000, 24, standard)).toBe(1000);
    expect(totalProgramCost(30000, 24, standard)).toBe(24000);
  });

  it("adjustable plan costs more than standard for the same debt", () => {
    const adjustable = planByType("glg_adjustable");
    expect(monthlyDraft(50000, 24, adjustable)).toBeGreaterThan(monthlyDraft(50000, 24, standard));
  });

  it("planByType falls back to the first plan for unknown types", () => {
    // @ts-expect-error testing the fallback path
    expect(planByType("nope")).toBe(PLAN_OPTIONS[0]);
  });
});
