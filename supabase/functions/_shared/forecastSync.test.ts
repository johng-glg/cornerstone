import { assertEquals } from "jsr:@std/assert@1";
import {
  mapForthTransaction,
  mapSettlementOffer,
  normalizeInOut,
  normalizeStatus,
  toDate,
} from "./forecastSync.ts";

const CO = "11111111-1111-1111-1111-111111111111";

Deno.test("toDate normalizes ISO timestamps and date-only", () => {
  assertEquals(toDate("2026-06-04T12:30:00Z"), "2026-06-04");
  assertEquals(toDate("2026-06-04"), "2026-06-04");
  assertEquals(toDate(""), null);
  assertEquals(toDate(null), null);
});

Deno.test("normalizeInOut maps many spellings + falls back to net sign", () => {
  assertEquals(normalizeInOut({ in_out: "O" }), "O");
  assertEquals(normalizeInOut({ direction: "debit" }), "O");
  assertEquals(normalizeInOut({ inout: "credit" }), "I");
  assertEquals(normalizeInOut({ net_amount: -50 }), "O");
  assertEquals(normalizeInOut({}), "I");
});

Deno.test("normalizeStatus maps Forth vocab to engine vocab; title-cases unknown", () => {
  assertEquals(normalizeStatus("pending"), "Pending");
  assertEquals(normalizeStatus("settled"), "Cleared");
  assertEquals(normalizeStatus("low_balance"), "Low Balance");
  assertEquals(normalizeStatus("NSF"), "Returned");
  assertEquals(normalizeStatus("something weird"), "Something Weird");
  assertEquals(normalizeStatus(""), null);
});

Deno.test("mapForthTransaction derives net_amount from direction when absent", () => {
  const row = mapForthTransaction(
    {
      id: 9001,
      contact_id: 42,
      debt_id: 7,
      amount: 250,
      in_out: "O",
      status: "pending",
      process_date: "2026-07-01",
    },
    CO,
  )!;
  assertEquals(row.id, 9001);
  assertEquals(row.contact_id, 42);
  assertEquals(row.amount, 250);
  assertEquals(row.net_amount, -250); // outflow
  assertEquals(row.status_name, "Pending");
  assertEquals(row.process_date, "2026-07-01");
});

Deno.test("mapForthTransaction prefers explicit net_amount and uses fallback contact", () => {
  const row = mapForthTransaction({ id: 1, amount: 100, in_out: "I", net_amount: 95 }, CO, 555)!;
  assertEquals(row.contact_id, 555);
  assertEquals(row.net_amount, 95);
  assertEquals(row.amount, 100);
});

Deno.test(
  "mapForthTransaction maps the forthpay reports/transactions shape (client_id, sub_type)",
  () => {
    // Client deposit (inflow) — type implies direction, amount unsigned.
    const inflow = mapForthTransaction(
      {
        id: 5002,
        client_id: 42,
        transaction_type: "ACH Client Debit",
        sub_type: "Recurring",
        amount: 529.67,
        transaction_status: "Cleared",
        process_date: "2026-07-10",
      },
      CO,
    )!;
    assertEquals(inflow.contact_id, 42); // forthpay client_id == Forth contact id
    assertEquals(inflow.inout, "I");
    assertEquals(inflow.net_amount, 529.67);
    assertEquals(inflow.transaction_subtype_name, "Recurring");

    // Custodial fee (outflow) — inferred from the type name.
    const fee = mapForthTransaction(
      { id: 5003, client_id: 42, transaction_type: "FORTH Custodial Fee", amount: 10.95 },
      CO,
    )!;
    assertEquals(fee.inout, "O");
    assertEquals(fee.net_amount, -10.95);

    // Signed amount wins regardless of type.
    const signed = mapForthTransaction(
      { id: 5004, client_id: 42, transaction_type: "Misc", amount: -200 },
      CO,
    )!;
    assertEquals(signed.inout, "O");
    assertEquals(signed.net_amount, -200);
    assertEquals(signed.amount, 200);
  },
);

Deno.test("mapForthTransaction returns null without a usable id or contact", () => {
  assertEquals(mapForthTransaction({ amount: 10 }, CO), null);
  assertEquals(mapForthTransaction({ id: 5, amount: 10 }, CO), null); // no contact, no fallback
});

Deno.test("mapSettlementOffer parses json:payments/fees with seq + fee_rate normalization", () => {
  const m = mapSettlementOffer(
    {
      id: 8001,
      debt_id: 7,
      settlement_amount: 1200,
      offer_status: { label: "Accepted" },
      fee_percentage: 27, // percent form -> 0.27
      json: {
        payments: [
          { amount: 300, due_date: "2026-08-01" },
          { amount: 300, due_date: "2026-09-01" },
        ],
        fees: [{ amount: 81, due_date: "2026-08-05" }],
      },
    },
    CO,
    42,
  )!;
  assertEquals(m.offer.offer_id, 8001);
  assertEquals(m.offer.status, "Accepted");
  assertEquals(m.offer.settled_amount, 1200);
  assertEquals(m.offer.fee_rate, 0.27);
  assertEquals(m.payments.length, 2);
  assertEquals(m.payments[0].seq, 1);
  assertEquals(m.payments[1].process_date, "2026-09-01");
  assertEquals(m.fees[0].amount, 81);
  assertEquals(m.fees[0].seq, 1);
});

Deno.test("mapSettlementOffer falls back to settlementSchedule + default fee rate", () => {
  const m = mapSettlementOffer(
    {
      id: 9,
      settlement_amount: 500,
      settlementSchedule: [{ amount: 500, due_date: "2026-10-01" }],
    },
    CO,
    42,
    0.3,
  )!;
  assertEquals(m.payments.length, 1);
  assertEquals(m.offer.fee_rate, 0.3);
  assertEquals(m.fees.length, 0);
});
