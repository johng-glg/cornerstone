// Pure escrow/balance reconciliation logic — unit-tested under `deno test`.

export interface DriftResult {
  drift: number; // remote - local (dollars)
  drift_detected: boolean;
}

/**
 * Detect material drift between the provider balance and the local escrow projection.
 * Material = absolute drift > $1.00 AND > 5% of the larger of the two balances.
 * (Matches the Lovable Phase 3A threshold.)
 */
export function detectEscrowDrift(localDollars: number, remoteDollars: number): DriftResult {
  const drift = remoteDollars - localDollars;
  const abs = Math.abs(drift);
  const denom = Math.max(Math.abs(localDollars), Math.abs(remoteDollars), 1);
  const drift_detected = abs > 1.0 && abs / denom > 0.05;
  return { drift, drift_detected };
}
