/**
 * Ops alerting for the money-critical branches of /api/confirm, over ZeptoMail.
 *
 * WHY THIS EXISTS. /api/confirm already logged "PAID BUT NOT BOOKED" at error
 * level, with a comment saying it must be loud. It was not loud — it was a line
 * in a dashboard nobody opens. Three customers were charged and never booked
 * over six days (2026-08-18 Norwood, 08-21 Quintero, 08-24 Carey) and the first
 * anyone knew was a notary emailing to ask why a client had no appointment.
 *
 * A log is a record. An alert is an interruption. Email, because that is where
 * this team already is — it is how the failure was reported in the first place.
 *
 * NOTE FOR glg-ron-orchestration: its alertOps() posts to a Slack webhook and
 * returns early when OPS_SLACK_WEBHOOK_URL is unset. There is no Slack here and
 * never was, so every alert that service has raised since July — refund
 * confirmations, sessions ending without completion — has been a log and
 * nothing more. It should be moved onto this transport too.
 *
 * The alert carries the customer's name, email and phone on purpose: whoever
 * opens it has to be able to pick up the telephone without first opening a
 * database. It goes only to ALERT_TO, which is internal.
 */

/** Hard cap so a slow or hanging mail API cannot delay the customer's response. */
const ALERT_TIMEOUT_MS = 4000;

/** US data centre by default; set ZEPTOMAIL_HOST if the account is EU or IN. */
const host = () => (process.env.ZEPTOMAIL_HOST || 'https://api.zeptomail.com').replace(/\/$/, '');

/** ZeptoMail wants the whole "Zoho-enczapikey xxxx" string; tolerate a bare key. */
function authHeader(token) {
  const t = token.trim();
  return /^Zoho-enczapikey\s/i.test(t) ? t : `Zoho-enczapikey ${t}`;
}

const recipients = () =>
  (process.env.ALERT_TO || '')
    .split(',').map((s) => s.trim()).filter(Boolean)
    .map((address) => ({ email_address: { address } }));

const esc = (v) => String(v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Ordered key: value lines. `action` is pulled to the end where it reads as the ask. */
function render(details) {
  const entries = Object.entries(details).filter(([, v]) => v !== null && v !== undefined && v !== '');
  const action = entries.find(([k]) => k === 'action');
  const rest = entries.filter(([k]) => k !== 'action');
  const line = ([k, v]) => `${k.replace(/_/g, ' ')}: ${typeof v === 'object' ? JSON.stringify(v) : v}`;
  const text = [...rest.map(line), '', action ? `WHAT TO DO — ${action[1]}` : ''].join('\n').trim();
  const html =
    '<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:15px;line-height:1.6">' +
    rest.map(([k, v]) =>
      `<div><strong>${esc(k.replace(/_/g, ' '))}:</strong> ${esc(typeof v === 'object' ? JSON.stringify(v) : v)}</div>`).join('') +
    (action ? `<p style="margin-top:16px;padding:12px 14px;background:#F4EFE6;border-left:4px solid #7E5C1E">
       <strong>What to do</strong><br>${esc(action[1])}</p>` : '') +
    '</div>';
  return { text, html };
}

/**
 * @param {string} subject   one line, written for whoever is on the phone
 * @param {object} details   enough to act without opening a database
 *
 * Never throws and never rejects. An alerting failure must not change what the
 * customer sees, and must not turn a recoverable booking failure into a 500.
 */
export async function alertOps(subject, details = {}) {
  // The structured log goes out first and unconditionally: if mail is
  // misconfigured, the record still exists.
  try {
    console.error(JSON.stringify({
      severity: 'ERROR', alert: subject, ...details, at: new Date().toISOString(),
    }));
  } catch { /* a log that cannot serialise must not break a booking */ }

  const token = process.env.ZEPTOMAIL_TOKEN;
  const from = process.env.ALERT_FROM;
  const to = recipients();
  if (!token || !from || !to.length) {
    return { sent: false, reason: 'alert_email_not_configured' };
  }

  // The customer's name in the subject so it is actionable from a lock screen.
  const who = details.customer || details.email;
  const line = `Notaryous: ${subject}${who ? ` — ${who}` : ''}`;
  const body = render(details);

  try {
    const res = await fetch(`${host()}/v1.1/email`, {
      method: 'POST',
      headers: { authorization: authHeader(token), 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        from: { address: from, name: 'Notaryous Booking' },
        to,
        // Replies go back to the whole group, not to the noreply sender. These
        // alerts need one person to say "I've got this" — with three people on
        // the list and no reply path, the risk is everyone assuming someone
        // else picked up the phone.
        reply_to: to.map((t) => ({ address: t.email_address.address })),
        subject: line,
        textbody: body.text,
        htmlbody: body.html,
      }),
      signal: AbortSignal.timeout(ALERT_TIMEOUT_MS),
    });
    if (!res.ok) {
      // The response body says why — wrong token, unverified sender, bad
      // region. Logged because a silently undelivered alert is this whole
      // problem happening a second time.
      const detail = await res.text().catch(() => '');
      console.error(JSON.stringify({
        severity: 'ERROR', alert: 'ops_alert_rejected', status: res.status, detail: detail.slice(0, 500),
      }));
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
