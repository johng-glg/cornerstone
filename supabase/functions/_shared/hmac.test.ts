import { assert, assertEquals } from "jsr:@std/assert@1";
import { hmacSha256Base64, verifyHmacSha256Base64, timingSafeEqual } from "./hmac.ts";

Deno.test("hmacSha256Base64 matches a known vector", async () => {
  // Reference: base64(HMAC-SHA256("hello", "secret"))
  const sig = await hmacSha256Base64("hello", "secret");
  assertEquals(sig, "iKqz7ejTrflNJquQ07r9SiCDBww7zOnAFO4EpEOEfAs=");
});

Deno.test("verifyHmacSha256Base64 accepts a valid signature and rejects tampering", async () => {
  const raw = '{"call_id":"abc","state":"hangup"}';
  const secret = "whsec_test";
  const good = await hmacSha256Base64(raw, secret);
  assert(await verifyHmacSha256Base64(raw, secret, good));
  assert(!(await verifyHmacSha256Base64(raw, secret, good.slice(0, -2) + "xx")));
  assert(!(await verifyHmacSha256Base64(raw + " ", secret, good))); // body tampered
  assert(!(await verifyHmacSha256Base64(raw, secret, ""))); // missing signature
});

Deno.test("timingSafeEqual", () => {
  assert(timingSafeEqual("abc", "abc"));
  assert(!timingSafeEqual("abc", "abd"));
  assert(!timingSafeEqual("abc", "abcd"));
});
