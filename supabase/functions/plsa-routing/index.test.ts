import assert from "node:assert/strict";
import {
  RouteRequestSchema,
  resolveProviderId,
  resolveRoute,
  type ProviderLookups,
} from "./index.ts";

const nullLookups: ProviderLookups = {
  byClientService: () => Promise.resolve(null),
  byTransaction: () => Promise.resolve(null),
  byClient: () => Promise.resolve(null),
};

Deno.test("RouteRequestSchema accepts a valid request", () => {
  const r = RouteRequestSchema.safeParse({
    operation: "create_draft",
    transaction_id: crypto.randomUUID(),
  });
  assert.equal(r.success, true);
});

Deno.test("RouteRequestSchema rejects an unknown operation", () => {
  const r = RouteRequestSchema.safeParse({ operation: "nope" });
  assert.equal(r.success, false);
});

Deno.test("RouteRequestSchema rejects a non-uuid id", () => {
  const r = RouteRequestSchema.safeParse({ operation: "fetch_balance", client_id: "not-a-uuid" });
  assert.equal(r.success, false);
});

Deno.test("resolveProviderId: explicit payload override wins", async () => {
  const p = await resolveProviderId(
    { operation: "auth_test", payload: { provider_id: "mock" } },
    nullLookups,
  );
  assert.equal(p, "mock");
});

Deno.test("resolveProviderId: defaults to forth when nothing resolves", async () => {
  const p = await resolveProviderId({ operation: "auth_test" }, nullLookups);
  assert.equal(p, "forth");
});

Deno.test("resolveProviderId: client_service lookup is honoured", async () => {
  const p = await resolveProviderId(
    { operation: "create_draft", client_service_id: crypto.randomUUID() },
    { ...nullLookups, byClientService: () => Promise.resolve("sentry") },
  );
  assert.equal(p, "sentry");
});

Deno.test("resolveRoute: mock routes every op to plsa-adapter-mock", () => {
  assert.equal(resolveRoute("mock", "create_draft")?.fn, "plsa-adapter-mock");
  assert.equal(resolveRoute("mock", "payment_to_creditor")?.fn, "plsa-adapter-mock");
});

Deno.test("resolveRoute: forth maps to the provider-specific function", () => {
  assert.equal(resolveRoute("forth", "auth_test")?.fn, "forth-auth");
  assert.equal(resolveRoute("forth", "payment_to_creditor")?.fn, "forth-payment-to-creditor");
});

Deno.test("resolveRoute: unknown provider returns null", () => {
  assert.equal(resolveRoute("nobody", "auth_test"), null);
});
