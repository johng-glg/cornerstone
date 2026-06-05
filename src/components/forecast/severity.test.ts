import { describe, it, expect } from "vitest";
import { severityRank, compareAlerts } from "./severity";

describe("severityRank", () => {
  it("orders critical < high < medium < low < unknown", () => {
    expect(severityRank("critical")).toBeLessThan(severityRank("high"));
    expect(severityRank("high")).toBeLessThan(severityRank("medium"));
    expect(severityRank("medium")).toBeLessThan(severityRank("low"));
    expect(severityRank("low")).toBeLessThan(severityRank("whatever"));
    expect(severityRank(null)).toBe(4);
  });
});

describe("compareAlerts", () => {
  const mk = (severity: string, breach_date: string | null, lead_days: number | null) => ({
    severity,
    breach_date,
    lead_days,
  });

  it("sorts by severity first", () => {
    const rows = [mk("medium", "2026-07-01", 30), mk("critical", "2026-09-01", 90)];
    rows.sort(compareAlerts);
    expect(rows[0].severity).toBe("critical");
  });

  it("breaks severity ties by soonest breach date", () => {
    const rows = [mk("high", "2026-08-01", 60), mk("high", "2026-06-15", 10)];
    rows.sort(compareAlerts);
    expect(rows[0].breach_date).toBe("2026-06-15");
  });

  it("breaks date ties by shortest lead time", () => {
    const rows = [mk("high", "2026-06-15", 20), mk("high", "2026-06-15", 5)];
    rows.sort(compareAlerts);
    expect(rows[0].lead_days).toBe(5);
  });
});
