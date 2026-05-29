import { assert, assertEquals } from "jsr:@std/assert@1";
import {
  normalizeE164,
  parseCustomData,
  isTerminalState,
  commsTargetTable,
  formatCallSummary,
} from "./dialpad.ts";

Deno.test("normalizeE164", () => {
  assertEquals(normalizeE164("(555) 123-4567"), "+15551234567");
  assertEquals(normalizeE164("15551234567"), "+15551234567");
  assertEquals(normalizeE164("+44 20 7946 0958"), "+442079460958");
  assertEquals(normalizeE164(""), "");
  assertEquals(normalizeE164(null), "");
});

Deno.test("parseCustomData handles object, JSON string, and junk", () => {
  assertEquals(parseCustomData({ company_id: "c1" }), { company_id: "c1" });
  assertEquals(parseCustomData('{"related_entity_id":"x"}'), { related_entity_id: "x" });
  assertEquals(parseCustomData("not-json"), null);
  assertEquals(parseCustomData(null), null);
});

Deno.test("isTerminalState", () => {
  assert(isTerminalState("hangup"));
  assert(isTerminalState("Completed"));
  assert(isTerminalState("voicemail"));
  assert(!isTerminalState("ringing"));
  assert(!isTerminalState(null));
});

Deno.test("commsTargetTable routes client vs polymorphic", () => {
  assertEquals(commsTargetTable("client"), "client_communications");
  assertEquals(commsTargetTable("lead"), "entity_communications");
  assertEquals(commsTargetTable("creditor_contact"), "entity_communications");
  assertEquals(commsTargetTable(null), "entity_communications");
});

Deno.test("formatCallSummary", () => {
  assertEquals(formatCallSummary("outbound", 134), "Outbound call · 2:14");
  assertEquals(formatCallSummary("inbound", 0, true), "Inbound call · Voicemail");
  assertEquals(formatCallSummary("outbound", 134, true), "Outbound call · 2:14 · Voicemail");
});
