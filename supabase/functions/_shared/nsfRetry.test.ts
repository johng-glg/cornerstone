import { assertEquals } from "jsr:@std/assert@1";
import { addDays, toDateStr, buildRetryInserts } from "./nsfRetry.ts";

Deno.test("addDays / toDateStr", () => {
  assertEquals(toDateStr(addDays(new Date("2026-06-01T00:00:00Z"), 5)), "2026-06-06");
});

Deno.test("buildRetryInserts caps at min(maxAttempts, pattern.length) and offsets dates", () => {
  const base = new Date("2026-06-01T00:00:00Z");
  const pattern = [{ day_offset: 3 }, { day_offset: 7 }, { day_offset: 14 }];
  const rows = buildRetryInserts("tx1", "pol1", base, pattern, 2);
  assertEquals(rows.length, 2);
  assertEquals(rows[0], {
    original_transaction_id: "tx1",
    policy_id: "pol1",
    attempt_number: 1,
    scheduled_for: "2026-06-04",
    status: "scheduled",
  });
  assertEquals(rows[1].scheduled_for, "2026-06-08");
});

Deno.test("buildRetryInserts returns empty when maxAttempts is 0 or pattern empty", () => {
  const base = new Date("2026-06-01T00:00:00Z");
  assertEquals(buildRetryInserts("tx", "p", base, [{ day_offset: 1 }], 0).length, 0);
  assertEquals(buildRetryInserts("tx", "p", base, [], 5).length, 0);
});
