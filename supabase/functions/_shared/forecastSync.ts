// Pure mapping helpers for the Forth -> mirror sync (settlement forecasting engine).
// Kept side-effect-free so the field-name defensiveness is unit-tested (forecastSync.test.ts);
// HTTP + persistence live in ../forth-mirror-sync/index.ts.

// deno-lint-ignore no-explicit-any
export type Raw = any;

export const FORTHCRM = "https://api.forthcrm.com/v1";

/** First non-null/empty among candidate keys. */
function pick(o: Raw, keys: string[]): unknown {
  for (const k of keys) {
    const v = o?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}

const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Normalize a Forth-ish id (object stub or scalar) to a number. */
export function idOf(v: unknown): number | null {
  if (v && typeof v === "object") return numOrNull((v as Raw).id ?? (v as Raw).debt_id);
  return numOrNull(v);
}

/** ISO/`YYYY-MM-DD` date-ish -> `YYYY-MM-DD` (or null). */
export function toDate(v: unknown): string | null {
  if (!v) return null;
  const s = String(v);
  const m = s.match(/^\d{4}-\d{2}-\d{2}/);
  if (m) return m[0];
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

// Forth transaction types that move money OUT of escrow (creditor payments, fees, disbursements).
// Used to infer direction when the forthpay report gives an unsigned amount and no inout flag.
// CONFIRM the full type vocabulary with GLG if any outflow shows up as an inflow.
const OUTFLOW_TYPE_RE = /fee|settlement|creditor|custodial|disburse|payment|refund|chargeback|stop/;

/** Normalize direction to 'O' (outflow to creditor/fee) or 'I' (inflow / client draft). */
export function normalizeInOut(raw: Raw): "O" | "I" {
  const v = String(pick(raw, ["in_out", "inout", "direction", "io"]) ?? "").toLowerCase();
  if (v === "o" || v === "out" || v === "outbound" || v === "debit" || v === "withdrawal")
    return "O";
  if (v === "i" || v === "in" || v === "inbound" || v === "credit" || v === "deposit") return "I";
  // Explicit signed net/amount wins next.
  const net = numOrNull(pick(raw, ["net_amount", "net"]));
  if (net !== null) return net < 0 ? "O" : "I";
  const amt = numOrNull(pick(raw, ["amount", "gross_amount", "transaction_amount"]));
  if (amt !== null && amt < 0) return "O";
  // Fall back to the transaction type/subtype name (forthpay report gives no direction flag).
  const typeText = `${pick(raw, ["transaction_type_name", "transaction_type", "type"]) ?? ""} ${
    pick(raw, ["sub_type", "transaction_subtype_name", "transaction_subtype", "subtype"]) ?? ""
  }`.toLowerCase();
  if (typeText.trim() && OUTFLOW_TYPE_RE.test(typeText)) return "O";
  return "I";
}

// Forth's (lowercase, varied) status vocabulary -> the engine's title-case vocabulary that
// fn_project_balance filters on. Unknown statuses are title-cased verbatim so they're visible
// (and, being outside the inclusion set, excluded from the projection rather than silently summed).
const STATUS_MAP: Record<string, string> = {
  open: "Open",
  pending: "Pending",
  scheduled: "Pending",
  processing: "Pending",
  cleared: "Cleared",
  completed: "Cleared",
  settled: "Cleared",
  shipped: "Shipped",
  "low balance": "Low Balance",
  low_balance: "Low Balance",
  returned: "Returned",
  nsf: "Returned",
  failed: "Returned",
  rejected: "Returned",
  cancelled: "Cancelled",
  canceled: "Cancelled",
  voided: "Cancelled",
};

export function normalizeStatus(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const mapped = STATUS_MAP[s.toLowerCase()];
  if (mapped) return mapped;
  return s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

export interface ForthTransactionRow {
  id: number;
  company_id: string;
  contact_id: number;
  debt_id: number | null;
  offer_id: number | null;
  linked_to: number | null;
  process_date: string | null;
  draft_date: string | null;
  cleared_date: string | null;
  returned_date: string | null;
  inout: "O" | "I";
  amount: number | null;
  net_amount: number | null;
  transaction_type_name: string | null;
  transaction_subtype_name: string | null;
  status_name: string | null;
  payee_name: string | null;
}

/**
 * Map one raw Forth transaction onto a forth_transaction row. Returns null when the record lacks a
 * usable id (can't be a stable mirror key). net_amount is taken as-is when Forth supplies it, else
 * derived from direction so the projection's running sum is correct (outflow negative).
 */
export function mapForthTransaction(
  raw: Raw,
  companyId: string,
  fallbackContactId?: number,
): ForthTransactionRow | null {
  const id = idOf(pick(raw, ["id", "transaction_id", "txn_id"]));
  if (id === null) return null;
  const contactId =
    idOf(pick(raw, ["contact_id", "customer_id", "client_id"])) ?? fallbackContactId ?? null;
  if (contactId === null) return null;

  const inout = normalizeInOut(raw);
  const amount = numOrNull(pick(raw, ["amount", "gross_amount", "transaction_amount"]));
  const explicitNet = numOrNull(pick(raw, ["net_amount", "net"]));
  const net =
    explicitNet ?? (amount === null ? null : inout === "O" ? -Math.abs(amount) : Math.abs(amount));

  return {
    id,
    company_id: companyId,
    contact_id: contactId,
    debt_id: idOf(pick(raw, ["debt_id", "debt"])),
    offer_id: idOf(pick(raw, ["settlement_offer_id", "offer_id", "settlement_id"])),
    linked_to: idOf(pick(raw, ["linked_to", "linked_transaction_id", "parent_id"])),
    process_date: toDate(
      pick(raw, ["process_date", "scheduled_date", "date", "processed_at", "processed_date"]),
    ),
    draft_date: toDate(pick(raw, ["draft_date", "created_date", "created_at"])),
    cleared_date: toDate(pick(raw, ["cleared_date", "cleared_at"])),
    returned_date: toDate(pick(raw, ["returned_date", "returned_at", "nsf_date"])),
    inout,
    amount: amount === null ? null : Math.abs(amount),
    net_amount: net,
    transaction_type_name:
      (pick(raw, ["transaction_type_name", "transaction_type", "type"]) as string) ?? null,
    transaction_subtype_name:
      (pick(raw, [
        "transaction_subtype_name",
        "transaction_subtype",
        "sub_type",
        "subtype",
      ]) as string) ?? null,
    status_name: normalizeStatus(pick(raw, ["status_name", "status", "transaction_status"])),
    payee_name: (pick(raw, ["payee_name", "payee", "creditor_name", "company"]) as string) ?? null,
  };
}

/**
 * Fill offer_id/debt_id from linked_to when it points at a known settlement offer. This is one of
 * VW_TRANSACTIONS_2's two link paths (a transaction whose LINKED_TO is a settlement-offer id); the
 * transitive path (LINKED_TO -> another 'S' transaction -> offer) is not yet resolved here.
 * Needed so earned-fee recognition can attribute a cleared creditor payment to its offer.
 */
export function attachOfferLinks(
  transactions: ForthTransactionRow[],
  offerDebtById: Map<number, number | null>,
): ForthTransactionRow[] {
  return transactions.map((t) => {
    if (t.offer_id == null && t.linked_to != null && offerDebtById.has(t.linked_to)) {
      return {
        ...t,
        offer_id: t.linked_to,
        debt_id: t.debt_id ?? offerDebtById.get(t.linked_to) ?? null,
      };
    }
    return t;
  });
}

export interface OfferScheduleRow {
  company_id: string;
  offer_id: number;
  debt_id: number | null;
  contact_id: number;
  seq: number;
  process_date: string | null;
  amount: number | null;
}

export interface MappedOffer {
  offer: {
    offer_id: number;
    company_id: string;
    debt_id: number | null;
    contact_id: number;
    status: string | null;
    settled_amount: number | null;
    fee_rate: number;
  };
  payments: OfferScheduleRow[];
  fees: OfferScheduleRow[];
}

function offerStatus(raw: Raw): string | null {
  const s = raw?.offer_status ?? raw?.status;
  if (s && typeof s === "object") return (s.label ?? s.status ?? null) as string | null;
  return (s as string) ?? null;
}

/** Parse a schedule array ({amount, due_date|date|process_date}) into seq'd rows. */
function parseSchedule(
  arr: Raw,
  base: { company_id: string; offer_id: number; debt_id: number | null; contact_id: number },
): OfferScheduleRow[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((item, i) => ({
    ...base,
    seq: numOrNull(pick(item, ["payment_num", "seq", "number"])) ?? i + 1,
    process_date: toDate(pick(item, ["process_date", "due_date", "date", "scheduled_date"])),
    amount: numOrNull(pick(item, ["amount", "value"])),
  }));
}

/**
 * Map a raw Forth settlement offer into the engine's header + payment/fee schedule rows. Prefers the
 * embedded `json:{payments,fees}` shape; falls back to `settlementSchedule` for payments. Returns
 * null when the offer has no usable id. fee_rate falls back to defaultFeeRate (system_setting).
 */
export function mapSettlementOffer(
  raw: Raw,
  companyId: string,
  contactId: number,
  defaultFeeRate = 0.27,
): MappedOffer | null {
  const offerId = idOf(pick(raw, ["id", "offer_id", "settlement_offer_id"]));
  if (offerId === null) return null;
  const debtId = idOf(pick(raw, ["debt_id", "debt"]));
  const base = { company_id: companyId, offer_id: offerId, debt_id: debtId, contact_id: contactId };

  const json = raw?.json ?? {};
  const payments = parseSchedule(json.payments ?? raw.settlementSchedule ?? raw.payments, base);
  const fees = parseSchedule(json.fees ?? raw.fees, base);

  const feeRate = numOrNull(pick(raw, ["fee_rate", "fee_percentage"]));
  return {
    offer: {
      offer_id: offerId,
      company_id: companyId,
      debt_id: debtId,
      contact_id: contactId,
      status: offerStatus(raw),
      settled_amount: numOrNull(
        pick(raw, ["settlement_amount", "settled_amount", "offer_amount", "amount"]),
      ),
      fee_rate: feeRate !== null ? (feeRate > 1 ? feeRate / 100 : feeRate) : defaultFeeRate,
    },
    payments,
    fees,
  };
}
