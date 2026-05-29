import { assert, assertEquals } from "jsr:@std/assert@1";
import { detectEscrowDrift } from "./escrow.ts";

Deno.test("detectEscrowDrift: no drift when balances match", () => {
  const r = detectEscrowDrift(1000, 1000);
  assertEquals(r.drift, 0);
  assert(!r.drift_detected);
});

Deno.test("detectEscrowDrift: sub-dollar or sub-5% drift is not material", () => {
  assert(!detectEscrowDrift(1000, 1000.5).drift_detected); // < $1
  assert(!detectEscrowDrift(1000, 1030).drift_detected); // $30 but only 3%
});

Deno.test("detectEscrowDrift: material when > $1 AND > 5%", () => {
  const r = detectEscrowDrift(1000, 1100); // $100, 9%
  assert(r.drift_detected);
  assertEquals(r.drift, 100);
});

Deno.test("detectEscrowDrift: tiny balances guarded by the denom floor", () => {
  assert(!detectEscrowDrift(0, 0.5).drift_detected); // < $1
});
