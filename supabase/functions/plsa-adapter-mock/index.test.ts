import assert from "node:assert/strict";
import { mockResponse, MockInputSchema, OPERATIONS } from "./index.ts";

Deno.test("mockResponse returns ack + provider_id for every operation", () => {
  for (const op of OPERATIONS) {
    const r = mockResponse(op);
    assert.equal(r.success, true);
    assert.equal(r.provider_id, "mock");
    assert.equal(r.ack, true);
  }
});

Deno.test("mockResponse shapes match ADR-009 expectations", () => {
  assert.ok(typeof mockResponse("register_client").external_account_id === "string");
  assert.ok(typeof mockResponse("create_draft").external_draft_id === "string");
  assert.ok(String(mockResponse("payment_to_creditor").external_payment_id).startsWith("mock-pay"));
  const bal = mockResponse("fetch_balance").balance_snapshot as { balance_cents: number };
  assert.equal(bal.balance_cents, 123456);
  assert.deepEqual(mockResponse("poll_transactions").transactions, []);
});

Deno.test("MockInputSchema rejects an unknown operation", () => {
  assert.equal(MockInputSchema.safeParse({ operation: "bogus" }).success, false);
});

Deno.test("MockInputSchema passes through extra fields", () => {
  const r = MockInputSchema.safeParse({ operation: "create_draft", transaction_id: "x", extra: 1 });
  assert.equal(r.success, true);
});
