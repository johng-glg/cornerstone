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
