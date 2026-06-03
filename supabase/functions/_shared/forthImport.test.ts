import { assert, assertEquals } from "jsr:@std/assert@1";
import {
  anonKey,
  extractContactId,
  hashId,
  mapContact,
  mapForthStatusToService,
  parseContactList,
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

Deno.test("mapContact emits obvious dummy PII", () => {
  const m = mapContact(RAW)!;
  assertEquals(m.client.first_name, "Test");
  assert(m.client.email.endsWith("@example.com"));
  assertEquals(m.client.ssn_last4, null);
  assertEquals(m.client.middle_name, null);
  assertEquals(m.client.date_of_birth, "1984-01-01"); // year only, no exact DOB
  assert(m.client.forth_crm_id.startsWith("ANON-"));
  assertEquals(m.source_key, anonKey(884412));
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
