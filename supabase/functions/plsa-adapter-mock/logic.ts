// PLSA mock adapter — pure logic (Zod input schema + canned ADR-009-shaped responses).
// Imports ONLY Zod so it is unit-testable under `deno test` without the supabase-js type graph.
import { z } from "npm:zod@3.23.8";

export const OPERATIONS = [
  "auth_test",
  "register_client",
  "sync_client",
  "fetch_balance",
  "contact_update",
  "contact_close",
  "create_draft",
  "update_draft",
  "cancel_draft",
  "pause_resume",
  "poll_transactions",
  "payment_to_creditor",
] as const;
export type Operation = (typeof OPERATIONS)[number];

export const MockInputSchema = z.object({ operation: z.enum(OPERATIONS) }).passthrough();

const PROVIDER = "mock";

/** Canned, realistic-shaped response for a canonical operation (no side effects). */
export function mockResponse(operation: Operation): Record<string, unknown> {
  const now = new Date().toISOString();
  const id = (p: string) => `mock-${p}-${crypto.randomUUID().slice(0, 8)}`;
  const base = { success: true, provider_id: PROVIDER, ack: true };
  switch (operation) {
    case "auth_test":
      return { ...base, token_preview: "mock-token-****" };
    case "register_client":
      return { ...base, external_account_id: id("acct") };
    case "sync_client":
      return { ...base, contact: { id: id("contact"), synced_at: now } };
    case "fetch_balance":
      return {
        ...base,
        balance: 1234.56,
        balance_snapshot: { balance_cents: 123456, as_of_timestamp: now },
      };
    case "contact_update":
      return { ...base };
    case "contact_close":
      return { ...base, final_balance: 0 };
    case "create_draft":
      return { ...base, external_draft_id: id("draft") };
    case "update_draft":
      return { ...base };
    case "cancel_draft":
      return { ...base };
    case "pause_resume":
      return { ...base };
    case "poll_transactions":
      return { ...base, transactions: [] };
    case "payment_to_creditor":
      return { ...base, external_payment_id: id("pay") };
  }
}
