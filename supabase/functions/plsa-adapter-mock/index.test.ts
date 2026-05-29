import { assert, assertEquals } from "jsr:@std/assert@1";
import { mockResponse, MockInputSchema, OPERATIONS } from "./logic.ts";

Deno.test("mockResponse returns ack + provider_id for every operation", () => {
  for (const op of OPERATIONS) {
    const r = mockResponse(op);
    assertEquals(r.success, true);
    assertEquals(r.provider_id, "mock");
    assertEquals(r.ack, true);
  }
});

Deno.test("mockResponse shapes match ADR-009 expectations", () => {
  assert(typeof mockResponse("register_client").external_account_id === "string");
  assert(typeof mockResponse("create_draft").external_draft_id === "string");
  assert(String(mockResponse("payment_to_creditor").external_payment_id).startsWith("mock-pay"));
  const bal = mockResponse("fetch_balance").balance_snapshot as { balance_cents: number };
  assertEquals(bal.balance_cents, 123456);
  assertEquals(mockResponse("poll_transactions").transactions, []);
});

Deno.test("MockInputSchema rejects an unknown operation", () => {
  assertEquals(MockInputSchema.safeParse({ operation: "bogus" }).success, false);
});

Deno.test("MockInputSchema passes through extra fields", () => {
  const r = MockInputSchema.safeParse({ operation: "create_draft", transaction_id: "x", extra: 1 });
  assertEquals(r.success, true);
});
