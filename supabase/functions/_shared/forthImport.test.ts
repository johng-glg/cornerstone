import { assert, assertEquals } from "jsr:@std/assert@1";
import {
  creditorName,
  dummyFirstName,
  extractContactId,
  hashId,
  isEnrolledDebt,
  liabilityStatusFromDebt,
  mapContact,
  mapDebts,
  mapForthStatusToService,
  mapLiabilityType,
  mapOffers,
  mapProgramDetails,
  mapSettlementStatus,
  maskPII,
  parseContactList,
  parseForthNotes,
  parseList,
  serviceStatusFromContact,
  unwrapContact,
} from "./forthImport.ts";

const RAW = {
  response: {
    id: 884412,
    first_name: "Maria",
    last_name: "Gonzalez",
    middle_name: "L",
    email: "maria.gonzalez@gmail.com",
    home_phone: "(602) 555-1234",
    address: "123 Real St",
    city: "Phoenix",
    state: "AZ",
    zip: "85001",
    date_of_birth: "1984-07-19",
    ssn: "123-45-6789",
    status: "Active",
    enrolled_date: "2025-02-10",
    monthly_payment: 412.5,
    term_months: 36,
    settlement_fee_percentage: 25,
    debts: [
      { creditor_name: "Chase", current_balance: 8200 },
      { creditor_name: "Capital One", current_balance: 4150.55 },
    ],
  },
};

Deno.test("mapContact strips every PII / contact field", () => {
  const blob = JSON.stringify(mapContact(RAW)).toLowerCase();
  for (const pii of [
    "maria",
    "gonzalez",
    "gmail",
    "602",
    "555-1234",
    "123-45-6789",
    "real st",
    "phoenix",
    "85001",
    "1984-07-19",
  ]) {
    assert(!blob.includes(pii), `PII leaked into output: ${pii}`);
  }
});

Deno.test("mapContact emits a realistic 'First Test' dummy name", () => {
  const m = mapContact(RAW)!;
  assertEquals(m.client.last_name, "Test"); // surname always "Test"
  assert(m.client.first_name.length > 0 && m.client.first_name !== "Test"); // realistic first name
  assertEquals(m.client.first_name, dummyFirstName(hashId("884412"))); // deterministic
  assert(m.client.email.endsWith("@example.com"));
  assertEquals(m.client.ssn_last4, null);
  assertEquals(m.client.middle_name, null);
  assertEquals(m.client.date_of_birth, "1984-01-01"); // year only, no exact DOB
});

Deno.test("mapContact keeps the real Forth contact id (for later re-fetch)", () => {
  const m = mapContact(RAW)!;
  assertEquals(m.client.forth_crm_id, "884412"); // real id, not an ANON hash
  assertEquals(m.source_key, "884412"); // dedupe key == real id
  assert(m.client.notes.includes("Forth contact 884412"));
});

Deno.test("mapDebts maps the real Forth debt shape", () => {
  const d = mapDebts([
    {
      id: 167172123,
      original_debt_amount: 7500,
      current_debt_amount: 7000,
      creditor: {
        object: "creditor",
        company_name: "Chase",
        first_name: "First",
        last_name: "Last",
      },
      og_account_num: "12345678",
      creditor_account_num: "6033912",
      legal_account: "No",
      has_summons: false,
      settled: false,
      settlement_id: 0,
      debt_type: 0, // numeric Forth code -> default type
      __offers: [{ offer_amount: 3500, status: "accepted" }],
    },
  ])[0];
  assertEquals(d.current_balance, 7000);
  assertEquals(d.original_balance, 7500);
  assertEquals(d.enrolled_balance, 7000);
  assertEquals(d.creditor_name, "Chase");
  assert(/^\d{4}$/.test(d.account_number!)); // dummy last-4, not the real PII account number
  assertEquals(d.liability_type, "credit_card");
  assertEquals(d.status, "enrolled");
  assertEquals(d.settlements.length, 1);
  const blob = JSON.stringify(d);
  assert(!blob.includes("12345678") && !blob.includes("6033912")); // account numbers scrubbed
});

Deno.test(
  "mapDebts handles the live enrolled-debt shape (string numbers, debt_type object)",
  () => {
    const d = mapDebts([
      {
        id: "412566458",
        original_debt_amount: "6229.00",
        current_debt_amount: "6229.00",
        creditor: { object: "creditors", company_name: "Capital One\t", first_name: "***" },
        legal_account: "***",
        has_summons: "0",
        settled: "0",
        settlement_id: null,
        enrolled: "1",
        debt_type: { type_id: "1", label: "Credit Card", est_settlement: "0.00" },
        og_account_num: "***",
        creditor_account_num: "***",
        settlement_offers: [],
      },
    ])[0];
    assertEquals(d.current_balance, 6229); // string "6229.00" parsed
    assertEquals(d.original_balance, 6229);
    assertEquals(d.creditor_name, "Capital One"); // trailing tab trimmed
    assertEquals(d.liability_type, "credit_card"); // from debt_type.label
    assertEquals(d.status, "enrolled");
    assertEquals(d.settlements.length, 0);
  },
);

Deno.test("mapOffers maps the live settlement_offer shape", () => {
  const o = {
    id: "253123",
    settlement_amount: "5500.00",
    debt_amount: "8500.55",
    offer_status: { status_id: "1", label: "In-Review" },
    offer_status_date: "2016-06-30",
    offer_valid_date: "2016-07-04",
    settlementSchedule: [
      { due_date: "2024-11-20", amount: "50", status: "Pending" },
      { due_date: "2024-12-20", amount: "50", status: "Pending" },
    ],
  };
  const s = mapOffers([o], 8500.55)[0];
  assertEquals(s.offer_amount, 5500); // from settlement_amount
  assertEquals(s.offer_percentage, 64.7); // settlement_amount / debt_amount
  assertEquals(s.status, "offered"); // In-Review -> offered
  assertEquals(s.payment_type, "payment_plan"); // 2 scheduled payments
  assertEquals(s.number_of_payments, 2);
  assertEquals(s.first_payment_date, "2024-11-20");
  assertEquals(s.payment_schedule.length, 2);
  assertEquals(s.payment_schedule[0].amount, 50);
});

Deno.test("mapOffers maps a voided offer to cancelled", () => {
  const s = mapOffers(
    [{ settlement_amount: "120", debt_amount: "8500.55", offer_status: { label: "Voided" } }],
    null,
  )[0];
  assertEquals(s.status, "cancelled");
});

Deno.test("mapProgramDetails maps engagement financials", () => {
  const pd = mapProgramDetails({
    program_cost: 15453,
    estimated_savings: 3400.77,
    time_in_program: 24,
    payment: 454.98,
    payment_schedule: [{ payment_num: "1", payment_date: "2022-05-06" }],
  });
  assertEquals(pd.monthly_payment, 454.98);
  assertEquals(pd.term_months, 24);
  assertEquals(pd.program_start_date, "2022-05-06");
  assertEquals(pd.estimated_completion_date, "2024-05-06");
});

Deno.test("mapContact folds in program-details + escrow", () => {
  const m = mapContact(
    { id: 5, enrolled: 1, total_debt: 22500, enrolled_date: "2017-02-08" },
    {
      programDetails: {
        payment: 454.98,
        time_in_program: 24,
        payment_schedule: [{ payment_date: "2022-05-06" }],
      },
      escrowBalance: 500,
    },
  )!;
  assertEquals(m.service.monthly_payment, 454.98);
  assertEquals(m.service.term_months, 24);
  assertEquals(m.service.escrow_balance, 500);
  assertEquals(m.service.program_start_date, "2022-05-06");
});

Deno.test("mapDebts resolves debt_type via the types lookup", () => {
  const typeMap = { "1": "Credit Card", "2": "Personal Loan" };
  const byCode = mapDebts([{ id: "9", current_debt_amount: "100", debt_type: 2 }], "", typeMap)[0];
  assertEquals(byCode.liability_type, "personal_loan");
  const byLabel = mapDebts(
    [{ id: "9", current_debt_amount: "100", debt_type: { type_id: "2", label: "Personal Loan" } }],
    "",
    typeMap,
  )[0];
  assertEquals(byLabel.liability_type, "personal_loan");
});

Deno.test("parseForthNotes extracts content + skips empties", () => {
  const raw = {
    response: {
      results: [
        {
          note_id: "397728630",
          content: "File Approved: ",
          note_created_date: "2020-02-21 15:59:03",
        },
        { note_id: "397743564", content: "", note_created_date: "2020-02-21 16:26:49" }, // empty -> skip
        { note_id: "405329517", note_created_date: "2020-03-12 17:16:41" }, // no content -> skip
      ],
      count: "35",
    },
    status: { code: 200 },
  };
  const notes = parseForthNotes(raw);
  assertEquals(notes.length, 1);
  assertEquals(notes[0].content, "File Approved:"); // trimmed, verbatim
  assertEquals(notes[0].external_id, "397728630");
  assertEquals(notes[0].created_at, "2020-02-21T15:59:03.000Z");
});

Deno.test("liabilityStatusFromDebt derives status from flags (incl. Forth string booleans)", () => {
  assertEquals(liabilityStatusFromDebt({ settled: true }), "settled");
  assertEquals(liabilityStatusFromDebt({ settled: "1" }), "settled");
  assertEquals(liabilityStatusFromDebt({ settlement_id: 4200 }), "settled");
  assertEquals(liabilityStatusFromDebt({ has_summons: true }), "in_litigation");
  assertEquals(liabilityStatusFromDebt({ has_summons: "1" }), "in_litigation");
  assertEquals(liabilityStatusFromDebt({ legal_account: "Yes" }), "in_litigation");
  assertEquals(liabilityStatusFromDebt({ settled: "0", has_summons: "0" }), "enrolled");
  assertEquals(liabilityStatusFromDebt({}), "enrolled");
});

Deno.test("creditorName reads the nested creditor object", () => {
  assertEquals(creditorName({ creditor: { company_name: "Chase" } }), "Chase");
  assertEquals(creditorName({ creditor: { first_name: "Jane", last_name: "Doe" } }), "Jane Doe");
  assertEquals(creditorName({ debt_buyer: { company_name: "Buyer Co" } }), "Buyer Co");
  assertEquals(creditorName({ creditor_name: "Legacy" }), "Legacy");
  assertEquals(creditorName({}), null);
});

Deno.test("serviceStatusFromContact uses lifecycle flags then labels", () => {
  assertEquals(serviceStatusFromContact({ enrolled: 1 }), "active");
  assertEquals(serviceStatusFromContact({ graduated: 1 }), "graduated");
  assertEquals(serviceStatusFromContact({ dropped: 1 }), "dropped");
  assertEquals(serviceStatusFromContact({ paused: 1 }), "suspended");
  assertEquals(serviceStatusFromContact({ enrolled: 0, stage_label: "Lead" }), "prospect");
});

Deno.test("maskPII redacts Forth account-number fields", () => {
  const m = maskPII({
    og_account_num: "12345678",
    creditor_account_num: "999",
    current_debt_amount: 7000,
  });
  assertEquals(m.og_account_num, "***");
  assertEquals(m.creditor_account_num, "***");
  assertEquals(m.current_debt_amount, 7000);
});

Deno.test("isEnrolledDebt keeps enrolled, drops excluded", () => {
  assert(isEnrolledDebt({ enrolled: true }));
  assert(isEnrolledDebt({ is_enrolled: 1 }));
  assert(isEnrolledDebt({ status: "Enrolled" }));
  assert(isEnrolledDebt({ status: "active" }));
  assert(!isEnrolledDebt({ enrolled: false }));
  assert(!isEnrolledDebt({ is_enrolled: 0 }));
  assert(!isEnrolledDebt({ status: "excluded" }));
  assert(!isEnrolledDebt({ status: "not enrolled" }));
  assert(isEnrolledDebt({ balance: 100 })); // unknown shape -> keep
});

Deno.test("mapContact preserves non-PII program structure", () => {
  const m = mapContact(RAW)!;
  assertEquals(m.service.total_enrolled_debt, 12350.55); // summed from debts
  assertEquals(m.service.monthly_payment, 412.5);
  assertEquals(m.service.term_months, 36);
  assertEquals(m.service.status, "active");
  assertEquals(m.service.enrolled_date, "2025-02-10");
  assertEquals(m.service.estimated_completion_date, "2028-02-10"); // enrolled + term
  assert(m.service.notes.includes("2 enrolled debt"));
});

Deno.test("mapContact is deterministic / idempotent", () => {
  assertEquals(JSON.stringify(mapContact(RAW)), JSON.stringify(mapContact(RAW)));
  assertEquals(hashId("884412"), hashId("884412"));
});

Deno.test("explicit total_enrolled_debt overrides debt sum and parses currency", () => {
  const m = mapContact({ id: 5, total_enrolled_debt: "99,000", status: "settled" })!;
  assertEquals(m.service.total_enrolled_debt, 99000);
  assertEquals(m.service.status, "graduated");
});

Deno.test("mapForthStatusToService covers the enum", () => {
  assertEquals(mapForthStatusToService("Active"), "active");
  assertEquals(mapForthStatusToService("enrolled"), "active");
  assertEquals(mapForthStatusToService("Graduated"), "graduated");
  assertEquals(mapForthStatusToService("completed"), "graduated");
  assertEquals(mapForthStatusToService("CANCELLED"), "cancelled");
  assertEquals(mapForthStatusToService("paused"), "suspended");
  assertEquals(mapForthStatusToService("prospect"), "prospect");
  assertEquals(mapForthStatusToService("pending review"), "pending");
  assertEquals(mapForthStatusToService("closed"), "closed");
  assertEquals(mapForthStatusToService(""), "active"); // safe default
  assertEquals(mapForthStatusToService(null), "active");
});

Deno.test("contact unwrap + id extraction handle envelopes", () => {
  assertEquals(extractContactId(RAW), "884412");
  assertEquals(extractContactId({ data: { contact_id: "abc" } }), "abc");
  assertEquals(extractContactId({ first_name: "x" }), null);
  assertEquals(unwrapContact({ contact: { id: 1 } }).id, 1);
});

Deno.test("parseContactList pulls arrays out of common envelopes", () => {
  assertEquals(parseContactList({ response: { data: [RAW, RAW] } }).length, 2);
  assertEquals(parseContactList({ contacts: [RAW] }).length, 1);
  assertEquals(parseContactList([RAW]).length, 1);
  assertEquals(parseContactList({ nothing: true }).length, 0);
});

Deno.test("mapContact returns null when no usable id", () => {
  assertEquals(mapContact({ first_name: "x", email: "y@z.com" }), null);
});

Deno.test("mapLiabilityType maps Forth account types onto the enum", () => {
  assertEquals(mapLiabilityType("Credit Card"), "credit_card");
  assertEquals(mapLiabilityType("Visa"), "credit_card");
  assertEquals(mapLiabilityType("Medical Bill"), "medical");
  assertEquals(mapLiabilityType("Auto Loan"), "auto_loan");
  assertEquals(mapLiabilityType("Student Loan"), "student_loan");
  assertEquals(mapLiabilityType("Personal Loan"), "personal_loan");
  assertEquals(mapLiabilityType("Mortgage"), "mortgage");
  assertEquals(mapLiabilityType("Timeshare"), "other");
  assertEquals(mapLiabilityType(""), "credit_card"); // default
});

Deno.test("mapSettlementStatus maps onto the settlement_status enum", () => {
  assertEquals(mapSettlementStatus("accepted"), "accepted");
  assertEquals(mapSettlementStatus("rejected"), "rejected");
  assertEquals(mapSettlementStatus("completed"), "completed");
  assertEquals(mapSettlementStatus("NSF"), "defaulted");
  assertEquals(mapSettlementStatus("cancelled"), "cancelled");
  assertEquals(mapSettlementStatus("pending"), "offered"); // default
});

Deno.test("mapDebts builds anonymized liabilities with nested settlements", () => {
  const debts = mapDebts(
    [
      {
        id: 1,
        creditor_name: "Chase",
        account_type: "Credit Card",
        account_number: "1234567890",
        current_balance: 8200,
        original_balance: 9000,
        status: "in negotiation",
        __offers: [
          { offer_amount: 4100, status: "accepted", number_of_payments: 2 },
          { amount: 3000, status: "offered" },
        ],
      },
    ],
    "2026-06-03",
  );
  assertEquals(debts.length, 1);
  const d = debts[0];
  assert(/^\d{4}$/.test(d.account_number!)); // dummy last-4
  assert(d.account_number !== "1234567890"); // real account number scrubbed
  assertEquals(d.liability_type, "credit_card");
  assertEquals(d.current_balance, 8200);
  assertEquals(d.original_balance, 9000);
  assertEquals(d.enrolled_balance, 8200); // falls back to current
  assertEquals(d.status, "in_negotiation");
  assertEquals(d.creditor_name, "Chase"); // institution kept (not PII), linked via creditor record
  assert(d.notes.includes("Forth debt 1")); // provenance note references the Forth debt id
  assertEquals(d.settlements.length, 2);
  assertEquals(d.settlements[0].offer_amount, 4100);
  assertEquals(d.settlements[0].payment_type, "payment_plan"); // 2 payments
  assertEquals(d.settlements[0].status, "accepted");
  assertEquals(d.settlements[0].offer_percentage, 50); // 4100 / 8200
  assertEquals(d.settlements[1].payment_type, "lump_sum");
});

Deno.test("mapDebts scrubs no PII into the output", () => {
  const blob = JSON.stringify(
    mapDebts([
      {
        id: 9,
        creditor_name: "Capital One",
        account_number: "9999000011112222",
        current_balance: 500,
      },
    ]),
  );
  assert(!blob.includes("9999000011112222"));
});

Deno.test("mapOffers skips offers with no amount and infers percentage", () => {
  const offers = mapOffers([{ status: "offered" }, { offer_amount: 250 }], 1000);
  assertEquals(offers.length, 1);
  assertEquals(offers[0].offer_amount, 250);
  assertEquals(offers[0].offer_percentage, 25); // 250 / 1000
});

Deno.test("parseList pulls arrays out of Forth list envelopes", () => {
  assertEquals(parseList({ response: { data: [1, 2, 3] } }).length, 3);
  assertEquals(parseList({ data: [1] }).length, 1);
  assertEquals(parseList([1, 2]).length, 2);
  assertEquals(parseList({ nope: true }).length, 0);
});

Deno.test("maskPII redacts identifying keys, keeps structure", () => {
  const masked = maskPII({
    first_name: "Maria",
    account_number: "12345",
    current_balance: 8200,
    nested: { ssn: "111-22-3333", offer_amount: 400 },
  });
  assertEquals(masked.first_name, "***");
  assertEquals(masked.account_number, "***");
  assertEquals(masked.current_balance, 8200);
  assertEquals(masked.nested.ssn, "***");
  assertEquals(masked.nested.offer_amount, 400);
});
