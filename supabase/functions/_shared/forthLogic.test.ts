import { assert, assertEquals } from "jsr:@std/assert@1";
import { mapForthStatus, isNSF, findForthTx, isWithinLockWindow } from "./forthLogic.ts";

Deno.test("mapForthStatus maps every documented Forth status", () => {
  assertEquals(mapForthStatus("open"), "pending");
  assertEquals(mapForthStatus("SCHEDULED"), "pending");
  assertEquals(mapForthStatus("completed"), "cleared");
  assertEquals(mapForthStatus("settled"), "cleared");
  assertEquals(mapForthStatus("canceled"), "cancelled");
  assertEquals(mapForthStatus("nsf"), "failed");
  assertEquals(mapForthStatus("returned"), "failed");
  assertEquals(mapForthStatus("weird-unknown"), "pending"); // safe default
  assertEquals(mapForthStatus(null), "pending");
});

Deno.test("isNSF detects status, return code, and message", () => {
  assert(isNSF({ status: "NSF" }));
  assert(isNSF({ return_code: "R01" }));
  assert(isNSF({ error_message: "Payment failed: Insufficient funds" }));
  assert(!isNSF({ status: "cleared" }));
  assert(!isNSF({}));
});

Deno.test("findForthTx matches on id or draft_id", () => {
  const txs = [{ id: 1 }, { draft_id: 999 }, { id: "abc" }];
  assertEquals(findForthTx(txs, "999"), { draft_id: 999 });
  assertEquals(findForthTx(txs, "abc"), { id: "abc" });
  assertEquals(findForthTx(txs, "nope"), undefined);
});

Deno.test("isWithinLockWindow: locked within 7 days, open beyond", () => {
  const now = new Date("2026-06-01T00:00:00Z");
  assert(isWithinLockWindow("2026-06-05T00:00:00Z", now)); // 4 days out → locked
  assert(isWithinLockWindow("2026-06-08T00:00:00Z", now)); // exactly 7 days → locked
  assert(!isWithinLockWindow("2026-06-20T00:00:00Z", now)); // 19 days out → open
  assert(!isWithinLockWindow(null, now));
});
