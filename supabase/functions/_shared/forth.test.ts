import { assert, assertEquals } from "jsr:@std/assert@1";
import { normalizeSecret, extractAccessToken, backoffWaitMs, BACKOFF_MS } from "./forth.ts";

Deno.test("normalizeSecret strips whitespace and newlines", () => {
  assertEquals(normalizeSecret("  ab\ncd\r\n "), "abcd");
});

Deno.test("extractAccessToken handles the documented response shapes", () => {
  assertEquals(extractAccessToken({ response: { access_token: "a" } }), "a");
  assertEquals(extractAccessToken({ response: { api_key: "b" } }), "b");
  assertEquals(extractAccessToken({ access_token: "c" }), "c");
  assertEquals(extractAccessToken({ api_key: "d" }), "d");
  assertEquals(extractAccessToken({ data: { access_token: "e" } }), "e");
  assertEquals(extractAccessToken({ token: "f" }), "f");
  assertEquals(extractAccessToken({}), null);
});

Deno.test("backoffWaitMs uses the schedule by default", () => {
  assertEquals(backoffWaitMs(0), BACKOFF_MS[0]);
  assertEquals(backoffWaitMs(1), BACKOFF_MS[1]);
  assertEquals(backoffWaitMs(2), BACKOFF_MS[2]);
  assertEquals(backoffWaitMs(99), BACKOFF_MS[2]); // clamps to last
});

Deno.test("backoffWaitMs honors a numeric Retry-After (seconds)", () => {
  assertEquals(backoffWaitMs(0, "5"), 5000);
  assertEquals(backoffWaitMs(0, ""), BACKOFF_MS[0]);
  assertEquals(backoffWaitMs(1, "not-a-number"), BACKOFF_MS[1]);
  assert(backoffWaitMs(0, null) === BACKOFF_MS[0]);
});
