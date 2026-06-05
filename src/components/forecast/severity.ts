import type { ForecastAlertRow } from "@/lib/forecast-types";

// Lower rank = more urgent. Unknown severities sort last. Used to order the triage queue.
const RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export function severityRank(severity: string | null | undefined): number {
  return RANK[(severity ?? "").toLowerCase()] ?? 4;
}

/** Triage order: most-severe first, then soonest breach, then shortest lead time. */
export function compareAlerts(
  a: Pick<ForecastAlertRow, "severity" | "breach_date" | "lead_days">,
  b: Pick<ForecastAlertRow, "severity" | "breach_date" | "lead_days">,
): number {
  const r = severityRank(a.severity) - severityRank(b.severity);
  if (r !== 0) return r;
  const ad = a.breach_date ?? "9999-12-31";
  const bd = b.breach_date ?? "9999-12-31";
  if (ad !== bd) return ad < bd ? -1 : 1;
  return (a.lead_days ?? Infinity) - (b.lead_days ?? Infinity);
}
