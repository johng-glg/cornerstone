// Pure Forth business logic (no I/O) — shared by the forth-* draft/poll adapters and unit-tested
// under `deno test`. Transcribed from the Lovable forth-poll-transactions / forth-cancel-draft
// quirks (see docs/forth_integration_audit.md §8).

export type LocalTxStatus = "pending" | "cleared" | "cancelled" | "failed";

const FORTH_STATUS_MAP: Record<string, LocalTxStatus> = {
  open: "pending",
  pending: "pending",
  scheduled: "pending",
  processing: "pending",
  cleared: "cleared",
  completed: "cleared",
  settled: "cleared",
  cancelled: "cancelled",
  canceled: "cancelled",
  failed: "failed",
  nsf: "failed",
  returned: "failed",
  rejected: "failed",
};

/** Map a Forth Pay draft status to our canonical transaction status (default: pending). */
export function mapForthStatus(forthStatus: string | null | undefined): LocalTxStatus {
  if (!forthStatus) return "pending";
  return FORTH_STATUS_MAP[forthStatus.toLowerCase()] ?? "pending";
}

export interface ForthTx {
  id?: string | number;
  draft_id?: string | number;
  status?: string;
  return_code?: string;
  error_message?: string;
  cleared_at?: string;
  processed_at?: string;
}

/** NSF detection: status 'nsf', ACH return code R01, or "insufficient" in the error message. */
export function isNSF(forthTx: ForthTx): boolean {
  return (
    forthTx.status?.toLowerCase() === "nsf" ||
    forthTx.return_code === "R01" ||
    (forthTx.error_message?.toLowerCase().includes("insufficient") ?? false)
  );
}

/** Match a Forth transaction to a local external_id by either `id` or `draft_id`. */
export function findForthTx(transactions: ForthTx[], externalId: string): ForthTx | undefined {
  return transactions.find((t) => String(t.id) === externalId || String(t.draft_id) === externalId);
}

/**
 * Forth Pay locks drafts within 7 days of the scheduled processing date — modify/cancel must
 * then go through Forth directly. Returns true when the draft is locked.
 */
export function isWithinLockWindow(
  scheduledDate: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!scheduledDate) return false;
  const scheduled = new Date(scheduledDate);
  const diffDays = (scheduled.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 7;
}
