// Pure NSF-retry scheduling logic — unit-tested under `deno test`.

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface RetryStep {
  day_offset: number;
}

export interface RetryInsert {
  original_transaction_id: string;
  policy_id: string;
  attempt_number: number;
  scheduled_for: string;
  status: "scheduled";
}

/**
 * Build the retry-attempt rows for a failed (NSF) draft from a policy's delay pattern.
 * Caps at min(maxAttempts, pattern.length); each attempt is scheduled day_offset days from base.
 */
export function buildRetryInserts(
  originalTransactionId: string,
  policyId: string,
  baseDate: Date,
  pattern: RetryStep[],
  maxAttempts: number,
): RetryInsert[] {
  const n = Math.min(maxAttempts ?? 0, pattern.length);
  const out: RetryInsert[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      original_transaction_id: originalTransactionId,
      policy_id: policyId,
      attempt_number: i + 1,
      scheduled_for: toDateStr(addDays(baseDate, pattern[i].day_offset)),
      status: "scheduled",
    });
  }
  return out;
}
