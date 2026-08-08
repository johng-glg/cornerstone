/**
 * Notaryous booking calendar — front end.
 *
 * Reads availability from /api/availability. Until that route exists it falls
 * back to deterministic fixture data and says so in the beta bar, so the page
 * is testable and reviewable before any Zoho credential exists. The fallback is
 * only ever reached on a 404 — a 500 is an error and is shown as one, because
 * silently pretending a broken backend is fine is how a booking page lies.
 *
 * Layout follows the spec: a two-week day grid on desktop that reveals one
 * day's slots, and on mobile the same day panels stacked as a scrolling list
 * with their chips inline. One set of DOM nodes, switched by CSS — no duplicate
 * content for a screen reader to read twice.
 */

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Common US zones first, then whatever the browser reports if it is not listed. */
const ZONES = [
  ['America/Los_Angeles', 'Pacific Time'],
  ['America/Denver', 'Mountain Time'],
  ['America/Phoenix', 'Arizona'],
  ['America/Chicago', 'Central Time'],
  ['America/New_York', 'Eastern Time'],
  ['America/Anchorage', 'Alaska Time'],
  ['Pacific/Honolulu', 'Hawaii'],
];

const pad = (n) => String(n).padStart(2, '0');

/**
 * Memoised Intl formatters, keyed by zone + shape.
 *
 * Constructing an Intl.DateTimeFormat is expensive — it resolves locale data
 * each time. A fortnight of availability is ~90 chips, each needing a clock
 * label, an aria-label and a day key, so building formatters inline meant
 * several hundred constructions per repaint. On a throttled mobile CPU that
 * alone was most of the page's blocking time. There are only ever a handful of
 * distinct (zone, shape) pairs, so build once and reuse.
 */
const FMT = new Map();
function fmt(tz, shape, opts) {
  const key = tz + '\u0000' + shape;
  let f = FMT.get(key);
  if (!f) { f = new Intl.DateTimeFormat('en-US', { timeZone: tz, ...opts }); FMT.set(key, f); }
  return f;
}

function partsIn(instant, tz) {
  const p = fmt(tz, 'parts', {
    year: 'numeric', month: 'numeric', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short',
  }).formatToParts(instant);
  const g = (t) => p.find((x) => x.type === t)?.value ?? '';
  return { y: g('year'), m: Number(g('month')), d: g('day'), hh: g('hour'), mm: g('minute'), dow: g('weekday') };
}

/** 'YYYY-MM-DD' in the given zone — the key everything is grouped by. */
function dayKey(instant, tz) {
  const p = partsIn(instant, tz);
  return `${p.y}-${pad(p.m)}-${p.d}`;
}

/** '9:15 am' — lower-case meridiem, matching the tone of the rest of the site. */
function clockLabel(instant, tz) {
  return fmt(tz, 'clock', { hour: 'numeric', minute: '2-digit', hour12: true }).format(instant).replace(/ /g, ' ').toLowerCase();
}

function dayLabel(instant, tz) {
  return fmt(tz, 'day', { weekday: 'long', month: 'long', day: 'numeric' }).format(instant);
}

function zoneLabel(tz) {
  const known = ZONES.find(([z]) => z === tz);
  if (known) return known[1];
  try {
    const p = fmt(tz, 'zonename', { timeZoneName: 'long' })
      .formatToParts(new Date()).find((x) => x.type === 'timeZoneName');
    return p ? p.value : tz;
  } catch { return tz; }
}

function detectZone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch { return 'America/Los_Angeles'; }
}

/**
 * Deterministic fixture availability. No Math.random: the same day always has
 * the same slots, so screenshots and tests are stable.
 *
 * Shaped like a real notary's diary rather than a full grid — weekends closed,
 * one day deliberately empty so the empty state is reachable without waiting
 * for it to happen by chance.
 */
export function fixtureSlots(fromDate, days, tz) {
  const out = [];
  const startOfToday = new Date(fromDate);
  startOfToday.setUTCHours(0, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const base = new Date(startOfToday.getTime() + i * 86400000);
    const p = partsIn(base, tz);
    const dow = DOW.indexOf(p.dow);
    if (dow === 0 || dow === 6) continue;         // closed weekends
    if (i === 3) continue;                        // a fully booked weekday
    const hours = (i % 3 === 0) ? [9, 10, 11, 13, 14] : [9, 10, 11, 12, 13, 14, 15, 16];
    for (const h of hours) {
      for (const min of (i % 2 ? [0, 30] : [0])) {
        // 17:00Z ≈ 09:00 Pacific. Fixtures only need to be plausible, not exact.
        const inst = new Date(Date.UTC(
          Number(p.y), p.m - 1, Number(p.d), h + 8, min, 0,
        ));
        if (inst > fromDate) out.push(inst.toISOString());
      }
    }
  }
  return out;
}

async function loadAvailability(from, to) {
  const url = `/api/availability?from=${encodeURIComponent(from.toISOString())}` +
              `&to=${encodeURIComponent(to.toISOString())}`;
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (res.status === 404) return { fixture: true };            // route not deployed yet
  if (!res.ok) throw new Error(`availability ${res.status}`);
  const body = await res.json();
  if (!Array.isArray(body.slots)) throw new Error('availability: malformed response');
  return { fixture: false, slots: body.slots };
}

function groupByDay(isoSlots, tz, fromDate, days) {
  const start = new Date(fromDate);
  const buckets = new Map();
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    buckets.set(dayKey(d, tz), { instant: d, slots: [] });
  }
  for (const iso of isoSlots) {
    const inst = new Date(iso);
    const k = dayKey(inst, tz);
    if (buckets.has(k)) buckets.get(k).slots.push(inst);
  }
  for (const b of buckets.values()) b.slots.sort((a, z) => a - z);
  return [...buckets.entries()].map(([key, v]) => ({ key, ...v }));
}

export function renderCalendar(opts) {
  const { calEl, gridEl, tzEl, formEl, betaEl, days = 14 } = opts;
  const state = { tz: detectZone(), selectedDay: null, selectedSlot: null, buckets: [], fixture: false };

  // --- timezone select -----------------------------------------------------
  const zones = ZONES.some(([z]) => z === state.tz) ? ZONES : [[state.tz, zoneLabel(state.tz)], ...ZONES];
  tzEl.innerHTML = zones.map(([z, label]) =>
    `<option value="${z}"${z === state.tz ? ' selected' : ''}>${label}</option>`).join('');
  tzEl.addEventListener('change', () => {
    state.tz = tzEl.value;
    state.selectedSlot = null;
    paint();
  });

  // Delegation, not a listener per element. A fortnight of slots is ~90 chips,
  // and re-binding a closure to each one on every repaint was the bulk of the
  // page's blocking time.
  gridEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.daybtn[data-day]');
    if (!btn || btn.disabled) return;
    state.selectedDay = btn.dataset.day;
    state.selectedSlot = null;
    paint();
  });

  calEl.addEventListener('click', (e) => {
    const chip = e.target.closest('.slot[data-slot]');
    if (!chip) return;
    state.selectedSlot = chip.dataset.slot;
    paint();
    renderForm();
    formEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    formEl.querySelector('input')?.focus({ preventScroll: true });
  });

  // --- data ----------------------------------------------------------------
  const from = new Date();
  const to = new Date(from.getTime() + days * 86400000);

  async function load() {
    calEl.setAttribute('aria-busy', 'true');
    try {
      const r = await loadAvailability(from, to);
      state.fixture = r.fixture;
      const slots = r.fixture ? fixtureSlots(from, days, state.tz) : r.slots;
      state.buckets = groupByDay(slots, state.tz, from, days);
      if (!r.fixture && betaEl) {
        // The banner ships with the longer fixture wording so it never grows
        // after load; only a working API shortens it.
        betaEl.textContent = 'Staging build against live availability. Not linked from the live site.';
      }
      paint();
    } catch (err) {
      showError(err);
    } finally {
      calEl.setAttribute('aria-busy', 'false');
    }
  }

  function showError(err) {
    gridEl.innerHTML = '';
    calEl.innerHTML = '';
    const box = document.createElement('div');
    box.className = 'errbox';
    box.setAttribute('role', 'alert');
    const p = document.createElement('p');
    p.textContent = "We couldn't load available times just now.";
    const btn = document.createElement('button');
    btn.className = 'btn ghost';
    btn.type = 'button';
    btn.textContent = 'Try again';
    btn.addEventListener('click', load);
    const alt = document.createElement('p');
    alt.className = 'fineprint';
    alt.innerHTML = 'Or call <a href="tel:+17146942423">(714) 694-2423</a> and we will book it for you.';
    box.append(p, btn, alt);
    calEl.append(box);
    if (console && err) console.error('[calendar]', err);
  }

  // --- render --------------------------------------------------------------
  function paint() {
    // regroup for the current zone — a zone change can move a slot across midnight
    const flat = state.buckets.flatMap((b) => b.slots.map((d) => d.toISOString()));
    state.buckets = groupByDay(flat, state.tz, from, days);

    const withSlots = state.buckets.filter((b) => b.slots.length);
    if (state.selectedDay == null || !state.buckets.some((b) => b.key === state.selectedDay && b.slots.length)) {
      state.selectedDay = withSlots.length ? withSlots[0].key : null;
    }

    // Nothing at all in the next fortnight. Empty days are omitted from the
    // list, so without this the page would just render a heading and a void.
    // This is the empty state that actually happens in practice — a single day
    // with no slots simply disappears from the list.
    if (!withSlots.length) {
      gridEl.innerHTML = '';
      calEl.innerHTML = '';
      const box = document.createElement('div');
      box.className = 'errbox';
      const p1 = document.createElement('p');
      p1.textContent = `No times left in the next ${days} days.`;
      const p2 = document.createElement('p');
      p2.className = 'fineprint';
      p2.innerHTML = 'Call <a href="tel:+17146942423">(714) 694-2423</a> and we will find you one.';
      box.append(p1, p2);
      calEl.append(box);
      formEl.hidden = true; formEl.innerHTML = '';
      return;
    }

    gridEl.innerHTML = '';
    for (const b of state.buckets) {
      const p = partsIn(b.instant, state.tz);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'daybtn';
      btn.disabled = b.slots.length === 0;
      btn.setAttribute('aria-pressed', String(b.key === state.selectedDay));
      const n = b.slots.length;
      btn.innerHTML =
        `<span class="dow">${p.dow}</span><span class="dnum">${Number(p.d)}</span>` +
        `<span class="cnt">${n ? `${n} time${n === 1 ? '' : 's'}` : 'none'}</span>`;
      btn.setAttribute('aria-label',
        `${dayLabel(b.instant, state.tz)} — ${n ? `${n} time${n === 1 ? '' : 's'} available` : 'no times available'}`);
      btn.dataset.day = b.key;
      gridEl.append(btn);
    }

    calEl.innerHTML = '';
    for (const b of state.buckets) {
      // A day with nothing is omitted from the mobile list entirely rather than
      // rendered greyed — same rule the slot chips follow.
      if (!b.slots.length && b.key !== state.selectedDay) continue;
      const sec = document.createElement('section');
      sec.className = 'day' + (b.key === state.selectedDay ? ' is-open' : '');
      const h = document.createElement('h2');
      h.textContent = dayLabel(b.instant, state.tz);
      sec.append(h);

      if (!b.slots.length) {
        const none = document.createElement('p');
        none.className = 'none';
        none.textContent = 'No times left on this day.';
        sec.append(none);
      } else {
        const list = document.createElement('div');
        list.className = 'slots';
        for (const inst of b.slots) {
          const iso = inst.toISOString();
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'slot';
          chip.textContent = clockLabel(inst, state.tz);
          chip.setAttribute('aria-pressed', String(state.selectedSlot === iso));
          chip.setAttribute('aria-label', `${clockLabel(inst, state.tz)} on ${dayLabel(inst, state.tz)}`);
          chip.dataset.slot = iso;
          list.append(chip);
        }
        sec.append(list);
      }
      calEl.append(sec);
    }

    if (!state.selectedSlot) { formEl.hidden = true; formEl.innerHTML = ''; }
  }

  // --- form ----------------------------------------------------------------
  function renderForm() {
    const inst = new Date(state.selectedSlot);
    formEl.hidden = false;
    formEl.innerHTML = `
      <form class="panel" novalidate>
        <p class="chosen"><b>${clockLabel(inst, state.tz)} · ${dayLabel(inst, state.tz)}</b>${zoneLabel(state.tz)} · $25 flat</p>
        <div class="field">
          <label for="f-name">Your name</label>
          <input id="f-name" name="name" type="text" autocomplete="name" required>
        </div>
        <div class="field">
          <label for="f-email">Email</label>
          <input id="f-email" name="email" type="email" inputmode="email" autocomplete="email" required>
        </div>
        <div class="field">
          <label for="f-phone">Mobile number</label>
          <input id="f-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required>
        </div>
        <button class="btn" type="submit">Continue to payment</button>
        <p class="fineprint">Payment is taken now. Your session is confirmed once it clears.</p>
      </form>`;

    const form = formEl.querySelector('form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validate(form)) return;
      startCheckout(form);
    });
  }

  function setError(input, message) {
    const field = input.closest('.field');
    field.querySelector('.err')?.remove();
    if (!message) { input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby'); return false; }
    input.setAttribute('aria-invalid', 'true');
    const id = input.id + '-err';
    input.setAttribute('aria-describedby', id);
    const s = document.createElement('span');
    s.className = 'err';
    s.id = id;
    s.textContent = message;
    field.append(s);
    return true;
  }

  function validate(form) {
    const name = form.elements.name, email = form.elements.email, phone = form.elements.phone;
    let bad = false;
    bad = setError(name, name.value.trim() ? '' : 'Please enter your name.') || bad;
    // Deliberately permissive: the job is to catch a typo, not to adjudicate
    // RFC 5322. Anything with a local part, an @ and a dotted domain passes.
    bad = setError(email, /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())
      ? '' : 'Please enter an email we can send the session link to.') || bad;
    const digits = phone.value.replace(/\D/g, '');
    bad = setError(phone, digits.length >= 10 ? '' : 'Please enter a mobile number, including area code.') || bad;
    if (bad) form.querySelector('[aria-invalid="true"]')?.focus();
    return !bad;
  }

  async function startCheckout(form) {
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Starting…';
    if (state.fixture) {
      btn.textContent = 'Continue to payment';
      btn.disabled = false;
      setPanelNotice(form,
        'This is the staging build. Payment is not wired up yet, so nothing was charged and no appointment was made.');
      return;
    }
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          slot: state.selectedSlot,
          timezone: state.tz,
          name: form.elements.name.value.trim(),
          email: form.elements.email.value.trim(),
          phone: form.elements.phone.value.trim(),
        }),
      });
      if (res.status === 409) {
        setPanelNotice(form, 'Sorry — that time was taken while you were filling this in. Pick another and we will hold it for you.');
        state.selectedSlot = null;
        await load();
        return;
      }
      if (!res.ok) throw new Error(`checkout ${res.status}`);
      const { payment_session_id } = await res.json();
      // Widget mount happens here once Zoho Payments credentials exist. The
      // appointment is never created from its callback — the confirmation view
      // polls the server, which is what actually confirms the booking.
      openPaymentWidget(payment_session_id);
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Continue to payment';
      setPanelNotice(form, 'We could not start the payment. Please try again, or call (714) 694-2423.');
      if (console) console.error('[checkout]', err);
    }
  }

  function setPanelNotice(form, text) {
    form.querySelector('.notice-inline')?.remove();
    const p = document.createElement('p');
    p.className = 'fineprint notice-inline';
    p.setAttribute('role', 'status');
    p.textContent = text;
    form.append(p);
  }

  function openPaymentWidget() {
    throw new Error('payment widget not wired: awaiting Zoho Payments credentials');
  }

  load();
  return state;
}
