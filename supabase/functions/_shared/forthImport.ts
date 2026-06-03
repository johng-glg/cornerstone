// Pure (dependency-free) logic for forth-import-anonymized.
//
// Pulls real Forth contact objects and produces *de-identified* Cornerstone client + engagement
// rows: every PII / contact field is replaced with obvious dummy data, while the non-PII program
// "structure" (debt totals, monthly payment, term, status, dates) is preserved for realistic
// testing. Kept free of remote imports so it can be unit-tested offline (matches forthLogic.ts).
//
// Anonymization is deterministic from a one-way hash of the real Forth id, so:
//   * re-imports are idempotent (same anon key => dedupe), and
//   * the stored forth_crm_id ("ANON-xxxx") cannot be reversed back to the real contact.
//
// TODO(forth-docs): confirm the exact GET /contacts/{id} response shape. Field extraction below is
// intentionally defensive (tries several key paths) because the live shape isn't pinned in-repo.

/** Non-cryptographic, stable djb2 hash -> base36. Used only as a de-identified dedupe key. */
export function hashId(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  }
  return h.toString(36).padStart(7, "0");
}

export function anonKey(realId: string | number): string {
  return "ANON-" + hashId(String(realId));
}

// ---- defensive extraction from an opaque Forth contact object ---------------------------------

// deno-lint-ignore no-explicit-any
type Raw = any;

function firstDefined<T>(...vals: T[]): T | undefined {
  for (const v of vals) if (v !== undefined && v !== null && v !== "") return v;
  return undefined;
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Unwrap a single contact from the various envelopes Forth/our helpers use. */
export function unwrapContact(raw: Raw): Raw {
  if (!raw || typeof raw !== "object") return raw;
  if (raw.contact && typeof raw.contact === "object") return raw.contact;
  if (raw.response && typeof raw.response === "object" && !Array.isArray(raw.response)) {
    return raw.response.data ?? raw.response;
  }
  if (raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)) return raw.data;
  return raw;
}

/** Pull a list of raw contact objects from a list/search response (best-effort). */
export function parseContactList(raw: Raw): Raw[] {
  const candidates = [
    raw?.response?.data,
    raw?.response,
    raw?.data,
    raw?.contacts,
    raw?.results,
    raw,
  ];
  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }
  return [];
}

export function extractContactId(raw: Raw): string | null {
  const c = unwrapContact(raw);
  const id = firstDefined(c?.id, c?.contact_id, c?.client_id, c?.crm_id);
  return id === undefined ? null : String(id);
}

/** Year-of-birth only (drops the identifying month/day) for the dummy DOB; null if unparseable. */
function birthYear(raw: Raw): number | null {
  const dob = firstDefined<string>(raw?.date_of_birth, raw?.dob, raw?.birth_date, raw?.birthdate);
  if (!dob) return null;
  const m = String(dob).match(/(\d{4})/);
  const y = m ? Number(m[1]) : NaN;
  return y >= 1900 && y <= 2025 ? y : null;
}

function isoDate(v: unknown): string | null {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function addMonths(isoDay: string | null, months: number | null): string | null {
  if (!isoDay || !months) return null;
  const d = new Date(isoDay + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

// ---- status mapping ---------------------------------------------------------------------------

/** Map a free-form Forth status onto our service_status enum. Defaults to 'active' (enrolled). */
export function mapForthStatusToService(status: unknown): string {
  const s = String(status ?? "")
    .toLowerCase()
    .trim();
  if (/(graduat|complet|settl)/.test(s)) return "graduated";
  if (/(cancel)/.test(s)) return "cancelled";
  if (/(drop|terminat|withdraw)/.test(s)) return "dropped";
  if (/(suspend|paus|hold)/.test(s)) return "suspended";
  if (/(prospect|lead|new)/.test(s)) return "prospect";
  if (/(pending|review|intake)/.test(s)) return "pending";
  if (/(closed)/.test(s)) return "closed";
  if (/(active|enroll|in.?progress|current)/.test(s)) return "active";
  return "active";
}

/** clients.status enum is only active|inactive. */
function clientStatusFor(serviceStatus: string): "active" | "inactive" {
  return ["active", "graduated", "suspended", "pending"].includes(serviceStatus)
    ? "active"
    : "inactive";
}

/** Map a Forth debt account-type string onto our liability_type enum. */
export function mapLiabilityType(t: unknown): string {
  const s = String(t ?? "").toLowerCase();
  if (/(medical|hospital)/.test(s)) return "medical";
  if (/(\bauto\b|vehicle|\bcar\b)/.test(s)) return "auto_loan";
  if (/(student|education)/.test(s)) return "student_loan";
  if (/(mortgage|home)/.test(s)) return "mortgage";
  if (/(personal|installment|signature)/.test(s)) return "personal_loan";
  if (/(credit.?card|card|revolving|visa|mastercard|amex|discover)/.test(s)) return "credit_card";
  return s ? "other" : "credit_card";
}

/** Map a Forth debt status onto our liability_status enum. Defaults to 'enrolled'. */
export function mapLiabilityStatus(status: unknown): string {
  const s = String(status ?? "").toLowerCase();
  if (/(settl|paid|complet|resolved)/.test(s)) return "settled";
  if (/(negotiat|offer|in.?progress|working)/.test(s)) return "in_negotiation";
  if (/(litig|lawsuit|summons|legal)/.test(s)) return "in_litigation";
  if (/(dismiss)/.test(s)) return "dismissed";
  if (/(cancel|removed|dropped|excluded)/.test(s)) return "cancelled";
  return "enrolled";
}

/** Map a Forth offer/settlement status onto our settlement_status enum. Defaults to 'offered'. */
export function mapSettlementStatus(status: unknown): string {
  const s = String(status ?? "").toLowerCase();
  if (/(accept|approv)/.test(s)) return "accepted";
  if (/(reject|declin)/.test(s)) return "rejected";
  if (/(complet|paid|settl|fulfil)/.test(s)) return "completed";
  if (/(default|nsf|fail)/.test(s)) return "defaulted";
  if (/(cancel|void|withdraw)/.test(s)) return "cancelled";
  return "offered";
}

/** Pull an array out of a Forth list response from any of the common envelopes. */
export function parseList(raw: Raw): Raw[] {
  const candidates = [raw?.response?.data, raw?.response, raw?.data, raw?.results, raw];
  for (const c of candidates) if (Array.isArray(c)) return c;
  return [];
}

/** Recursively redact obvious PII so a raw Forth sample can be shown safely for diagnostics. */
export function maskPII(value: Raw, depth = 0): Raw {
  if (depth > 6 || value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.slice(0, 3).map((v) => maskPII(v, depth + 1));
  if (typeof value !== "object") return value;
  const PII =
    /(ssn|social|tax_id|account_number|routing|first_name|last_name|middle_name|full_name|^name$|email|phone|fax|dob|birth|address|street|city|state|zip|postal)/i;
  const out: Record<string, Raw> = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = PII.test(k) ? "***" : maskPII(v, depth + 1);
  }
  return out;
}

// ---- debts -> liabilities, offers -> settlements (anonymized; structure kept) -----------------

export interface AnonSettlement {
  offer_amount: number;
  offer_percentage: number | null;
  payment_type: "lump_sum" | "payment_plan";
  number_of_payments: number;
  status: string;
  offered_date: string | null;
  accepted_date: string | null;
  completed_date: string | null;
  notes: string;
}

export interface AnonLiability {
  account_number: null; // scrubbed (PII)
  liability_type: string;
  original_balance: number | null;
  current_balance: number | null;
  enrolled_balance: number | null;
  status: string;
  priority: number;
  creditor_name: string | null; // institution name kept (not PII)
  notes: string;
  settlements: AnonSettlement[];
}

/** Map Forth offer objects -> anonymized settlement rows. `balance` lets us infer percentage. */
export function mapOffers(rawOffers: Raw[], balance: number | null, tag = ""): AnonSettlement[] {
  const out: AnonSettlement[] = [];
  for (const o of rawOffers ?? []) {
    const amount = firstDefined(
      toNumber(o?.offer_amount),
      toNumber(o?.amount),
      toNumber(o?.settlement_amount),
      toNumber(o?.total_amount),
    );
    if (amount === undefined || amount === null) continue; // offer_amount is NOT NULL
    const count =
      firstDefined(
        toNumber(o?.number_of_payments),
        toNumber(o?.num_payments),
        toNumber(o?.payments),
      ) ?? 1;
    let pct = firstDefined(toNumber(o?.offer_percentage), toNumber(o?.percentage)) ?? null;
    if (pct === null && balance && balance > 0) pct = Number(((amount / balance) * 100).toFixed(2));
    out.push({
      offer_amount: amount,
      offer_percentage: pct,
      payment_type: count > 1 ? "payment_plan" : "lump_sum",
      number_of_payments: Math.max(1, Math.round(count)),
      status: mapSettlementStatus(firstDefined(o?.status, o?.offer_status, o?.settlement_status)),
      offered_date: isoDate(firstDefined(o?.offered_date, o?.offer_date, o?.created_date, o?.date)),
      accepted_date: isoDate(firstDefined(o?.accepted_date, o?.approved_date)),
      completed_date: isoDate(firstDefined(o?.completed_date, o?.paid_date, o?.settled_date)),
      notes: `Imported from Forth (anonymized)${tag ? " " + tag : ""}.`,
    });
  }
  return out;
}

/**
 * Map Forth debt objects -> anonymized liability rows (with nested settlements). Each debt may
 * carry its offers under `__offers` (attached by the caller) or a nested offers/settlements field.
 */
export function mapDebts(rawDebts: Raw[], tag = ""): AnonLiability[] {
  const out: AnonLiability[] = [];
  for (const d of rawDebts ?? []) {
    const current = firstDefined(toNumber(d?.current_balance), toNumber(d?.balance)) ?? null;
    const original =
      firstDefined(toNumber(d?.original_balance), toNumber(d?.original_amount)) ?? current;
    const enrolled =
      firstDefined(toNumber(d?.enrolled_balance), toNumber(d?.enrolled_amount)) ?? current;
    const creditor =
      firstDefined<string>(
        d?.creditor_name,
        d?.creditor,
        d?.original_creditor,
        d?.current_creditor,
        d?.collector_name,
      ) ?? null;
    const rawOffers =
      firstDefined<Raw[]>(d?.__offers, d?.offers, d?.settlements, d?.settlement_offers) ?? [];
    out.push({
      account_number: null,
      liability_type: mapLiabilityType(firstDefined(d?.account_type, d?.debt_type, d?.type)),
      original_balance: original,
      current_balance: current,
      enrolled_balance: enrolled,
      status: mapLiabilityStatus(firstDefined(d?.status, d?.debt_status)),
      priority: toNumber(d?.priority) ?? 0,
      creditor_name: creditor,
      notes:
        `Imported from Forth (anonymized)${tag ? " " + tag : ""}.` +
        (creditor ? ` Creditor: ${creditor}.` : ""),
      settlements: mapOffers(Array.isArray(rawOffers) ? rawOffers : [], enrolled ?? current, tag),
    });
  }
  return out;
}

// ---- the mapper -------------------------------------------------------------------------------

export interface AnonClient {
  forth_crm_id: string;
  first_name: string;
  last_name: string;
  middle_name: null;
  email: string;
  date_of_birth: string | null;
  ssn_last4: null;
  status: "active" | "inactive";
  is_active: boolean;
  notes: string;
}

export interface AnonService {
  status: string;
  program_type: string;
  plan_type: string;
  payment_frequency: string;
  term_months: number | null;
  monthly_payment: number | null;
  total_enrolled_debt: number;
  settlement_fee_percentage: number | null;
  estimated_settlement_percentage: number | null;
  escrow_balance: number;
  enrolled_date: string | null;
  program_start_date: string | null;
  estimated_completion_date: string | null;
  notes: string;
}

export interface MappedContact {
  source_key: string; // anon key (also stored as forth_crm_id)
  client: AnonClient;
  service: AnonService;
}

export interface MapOptions {
  importTag?: string; // e.g. an ISO date, embedded in notes for traceability
  defaultPlanType?: string;
}

/**
 * Map one raw Forth contact -> de-identified client + engagement. Pure: no I/O, no PII retained.
 * Returns null if the contact has no usable id.
 */
export function mapContact(raw: Raw, opts: MapOptions = {}): MappedContact | null {
  const c = unwrapContact(raw);
  const realId = extractContactId(raw);
  if (!realId) return null;

  const h = hashId(realId);
  const key = "ANON-" + h;
  const suffix = h.toUpperCase();

  // ---- scrub: obvious dummy PII, derived from the hash so it's stable across re-imports --------
  // (the clients table holds no phone column — phones live elsewhere — so none is emitted here.)
  const yob = birthYear(c);
  const tag = opts.importTag ?? "";

  // ---- keep: non-PII program structure --------------------------------------------------------
  const debts = Array.isArray(c?.debts) ? c.debts : [];
  const debtSum = debts.reduce(
    (acc: number, d: Raw) => acc + (toNumber(d?.current_balance ?? d?.balance) ?? 0),
    0,
  );
  const totalDebt =
    firstDefined(
      toNumber(c?.total_enrolled_debt),
      toNumber(c?.enrolled_debt),
      toNumber(c?.debt_total),
      debtSum > 0 ? debtSum : undefined,
    ) ?? 0;
  const debtCount =
    firstDefined(
      debts.length || undefined,
      toNumber(c?.number_of_debts) ?? undefined,
      toNumber(c?.num_debts) ?? undefined,
    ) ?? debts.length;

  const term =
    firstDefined(toNumber(c?.term_months), toNumber(c?.term), toNumber(c?.num_payments)) ?? null;
  const monthly =
    firstDefined(
      toNumber(c?.monthly_payment),
      toNumber(c?.draft_amount),
      toNumber(c?.payment_amount),
    ) ?? null;
  const feePct =
    firstDefined(toNumber(c?.settlement_fee_percentage), toNumber(c?.fee_percentage)) ?? null;
  const enrolled = isoDate(
    firstDefined(c?.enrolled_date, c?.enrollment_date, c?.date_added, c?.created_date),
  );

  const serviceStatus = mapForthStatusToService(
    firstDefined(c?.status, c?.contact_status, c?.enrollment_status, c?.file_status),
  );

  const client: AnonClient = {
    forth_crm_id: key,
    first_name: "Test",
    last_name: `Sample-${suffix}`,
    middle_name: null,
    email: `forth-import+${h}@example.com`,
    date_of_birth: yob ? `${yob}-01-01` : null,
    ssn_last4: null,
    status: clientStatusFor(serviceStatus),
    is_active: clientStatusFor(serviceStatus) === "active",
    notes: `Imported from Forth (anonymized)${tag ? " " + tag : ""}. Source key ${key}.`,
  };

  const service: AnonService = {
    status: serviceStatus,
    program_type: "debt_settlement",
    plan_type: opts.defaultPlanType ?? "glg_standard",
    payment_frequency: "monthly",
    term_months: term,
    monthly_payment: monthly,
    total_enrolled_debt: Number(totalDebt.toFixed(2)),
    settlement_fee_percentage: feePct,
    estimated_settlement_percentage: null,
    escrow_balance: 0,
    enrolled_date: enrolled,
    program_start_date: enrolled,
    estimated_completion_date: addMonths(enrolled, term),
    notes:
      `Imported from Forth (anonymized)${tag ? " " + tag : ""}. ` +
      `${debtCount} enrolled debt(s), total $${Number(totalDebt.toFixed(2))}.`,
  };

  return { source_key: key, client, service };
}
