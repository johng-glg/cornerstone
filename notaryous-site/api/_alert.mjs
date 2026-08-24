/**
 * Ops alerting for the money-critical branches of /api/confirm.
 *
 * WHY THIS EXISTS. /api/confirm already logged "PAID BUT NOT BOOKED" at error
 * level, with a comment saying it must be loud. It was not loud — it was a line
 * in a dashboard nobody opens. Three customers were charged and never booked
 * over six days (2026-08-18 Norwood, 08-21 Quintero, 08-24 Carey) and the first
 * anyone knew was a notary emailing to ask why a client had no appointment.
 *
 * A log is a record. An alert is an interruption. This turns the first into the
 * second, and it is deliberately limited to the cases where a customer's card
 * has been charged and they have nothing to show for it.
 *
 * Mirrors alertOps() in glg-ron-orchestration so both services read the same
 * way in the same channel. Needs OPS_SLACK_WEBHOOK_URL on THIS project — it is
 * currently set on the orchestration project only. Without it this degrades to
 * exactly the behaviour that failed us: a structured log and nothing else.
 */

/** Hard cap so a slow or hanging Slack cannot delay the customer's response. */
const ALERT_TIMEOUT_MS = 3000;

/**
 * @param {string} subject   one line, written for whoever is on the phone
 * @param {object} details   enough to act without opening a database
 *
 * Never throws and never rejects. An alerting failure must not change what the
 * customer sees, and must not turn a recoverable booking failure into a 500.
 */
export async function alertOps(subject, details = {}) {
  // The structured log goes out first and unconditionally: if Slack is
  // misconfigured, the record still exists.
  try {
    console.error(JSON.stringify({
      severity: 'ERROR', alert: subject, ...details, at: new Date().toISOString(),
    }));
  } catch { /* a log that cannot serialise must not break a booking */ }

  const url = process.env.OPS_SLACK_WEBHOOK_URL;
  if (!url) return { sent: false, reason: 'no_webhook_configured' };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text: `:rotating_light: *Notaryous booking* — ${subject}\n\`\`\`${JSON.stringify(details, null, 2)}\`\`\``,
      }),
      signal: AbortSignal.timeout(ALERT_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(JSON.stringify({ severity: 'ERROR', alert: 'ops_alert_rejected', status: res.status }));
      return { sent: false, reason: `http_${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.error(JSON.stringify({
      severity: 'ERROR', alert: 'ops_alert_failed', error: String(err?.message || err),
    }));
    return { sent: false, reason: 'threw' };
  }
}
