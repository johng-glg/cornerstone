// Pure alert derivation + reconciliation for the settlement forecasting engine (spec §8).
// Turns a Mode-B projection verdict into desired forecast_alert rows, and diffs them against the
// currently-open alerts so the orchestrator knows what to upsert vs resolve. Side-effect-free and
// unit-tested (forecastAlerts.test.ts).

export interface Verdict {
  min_balance: number | null;
  breach: boolean | null;
  additional_needed: number | null;
  headroom: number | null;
  breach_date: string | null;
  start_date: string | null;
}

export interface DesiredAlert {
  company_id: string;
  contact_id: number;
  type: string;
  severity: string;
  breach_date: string | null;
  lead_days: number | null;
  shortfall_amount: number | null;
  threatened_offer_id: number | null;
  threatened_debt_id: number | null;
  status: "open";
}

export interface OpenAlert {
  id: string;
  threatened_offer_id: number | null;
  breach_date: string | null;
}

/** Whole calendar days from `fromISO` to `toISO` (negative if the breach is already in the past). */
export function daysBetween(fromISO: string, toISO: string): number {
  const a = Date.parse(fromISO + "T00:00:00Z");
  const b = Date.parse(toISO + "T00:00:00Z");
  return Math.round((b - a) / 86_400_000);
}

/** Lead-time -> severity bucket. Past-due/imminent breaches are the most severe. */
export function severityForLead(leadDays: number): string {
  if (leadDays <= 7) return "critical";
  if (leadDays <= 21) return "high";
  return "medium";
}

/**
 * Derive the desired open alerts for a contact from its latest verdict. v1 emits a single
 * pool-level `floor_breach` (threatened_offer_id null) when the projected balance dips below the
 * floor within the horizon. Breaches beyond the horizon produce no alert yet (they re-surface as
 * the date approaches); already-past breaches still alert (critical).
 */
export function deriveAlerts(
  verdict: Verdict,
  contactId: number,
  companyId: string,
  todayISO: string,
  horizonDays: number,
): DesiredAlert[] {
  if (!verdict.breach || !verdict.breach_date) return [];
  const leadDays = daysBetween(todayISO, verdict.breach_date);
  if (leadDays > horizonDays) return [];
  return [
    {
      company_id: companyId,
      contact_id: contactId,
      type: "floor_breach",
      severity: severityForLead(leadDays),
      breach_date: verdict.breach_date,
      lead_days: leadDays,
      shortfall_amount: verdict.additional_needed,
      threatened_offer_id: null,
      threatened_debt_id: null,
      status: "open",
    },
  ];
}

const key = (offerId: number | null, breachDate: string | null) =>
  `${offerId ?? "null"}|${breachDate ?? "null"}`;

/**
 * Diff desired alerts against the currently-open ones for a contact:
 *  - toUpsert: every desired alert (insert-or-update on the dedupe key)
 *  - toResolveIds: open alerts no longer desired (breach cured or moved) -> mark resolved
 */
export function reconcileAlerts(
  desired: DesiredAlert[],
  openExisting: OpenAlert[],
): { toUpsert: DesiredAlert[]; toResolveIds: string[] } {
  const desiredKeys = new Set(desired.map((d) => key(d.threatened_offer_id, d.breach_date)));
  const toResolveIds = openExisting
    .filter((o) => !desiredKeys.has(key(o.threatened_offer_id, o.breach_date)))
    .map((o) => o.id);
  return { toUpsert: desired, toResolveIds };
}
