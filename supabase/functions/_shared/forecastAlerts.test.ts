import { assertEquals } from "jsr:@std/assert@1";
import {
  daysBetween,
  deriveAlerts,
  reconcileAlerts,
  severityForLead,
  type Verdict,
} from "./forecastAlerts.ts";

const CO = "11111111-1111-1111-1111-111111111111";
const breached = (date: string | null, need: number | null): Verdict => ({
  min_balance: -50,
  breach: !!date,
  additional_needed: need,
  headroom: null,
  breach_date: date,
  start_date: "2026-06-04",
});

Deno.test("daysBetween counts whole days, signed", () => {
  assertEquals(daysBetween("2026-06-04", "2026-06-11"), 7);
  assertEquals(daysBetween("2026-06-04", "2026-06-01"), -3);
});

Deno.test("severityForLead buckets by lead time", () => {
  assertEquals(severityForLead(-1), "critical");
  assertEquals(severityForLead(7), "critical");
  assertEquals(severityForLead(14), "high");
  assertEquals(severityForLead(40), "medium");
});

Deno.test("deriveAlerts emits a floor_breach within horizon", () => {
  const alerts = deriveAlerts(breached("2026-06-20", 150), 42, CO, "2026-06-04", 45);
  assertEquals(alerts.length, 1);
  assertEquals(alerts[0].type, "floor_breach");
  assertEquals(alerts[0].severity, "high"); // 16 days
  assertEquals(alerts[0].lead_days, 16);
  assertEquals(alerts[0].shortfall_amount, 150);
  assertEquals(alerts[0].threatened_offer_id, null);
});

Deno.test("deriveAlerts suppresses breaches beyond the horizon, keeps past-due", () => {
  assertEquals(deriveAlerts(breached("2026-09-01", 10), 42, CO, "2026-06-04", 45).length, 0);
  const pastDue = deriveAlerts(breached("2026-06-01", 10), 42, CO, "2026-06-04", 45);
  assertEquals(pastDue.length, 1);
  assertEquals(pastDue[0].severity, "critical");
});

Deno.test("deriveAlerts emits nothing when not breaching", () => {
  assertEquals(deriveAlerts(breached(null, null), 42, CO, "2026-06-04", 45).length, 0);
});

Deno.test("reconcileAlerts resolves open alerts no longer desired", () => {
  const desired = deriveAlerts(breached("2026-06-20", 150), 42, CO, "2026-06-04", 45);
  const open = [
    { id: "keep", threatened_offer_id: null, breach_date: "2026-06-20" }, // matches desired -> not resolved
    { id: "stale", threatened_offer_id: null, breach_date: "2026-06-10" }, // gone -> resolve
  ];
  const { toUpsert, toResolveIds } = reconcileAlerts(desired, open);
  assertEquals(toUpsert.length, 1);
  assertEquals(toResolveIds, ["stale"]);
});

Deno.test("reconcileAlerts resolves all open alerts when breach cured", () => {
  const { toUpsert, toResolveIds } = reconcileAlerts(
    [],
    [{ id: "a", threatened_offer_id: null, breach_date: "2026-06-20" }],
  );
  assertEquals(toUpsert.length, 0);
  assertEquals(toResolveIds, ["a"]);
});
