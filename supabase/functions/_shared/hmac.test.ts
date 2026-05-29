import { assert, assertEquals } from "jsr:@std/assert@1";
import {
  hmacSha256Base64,
  hmacSha256Hex,
  verifyHmacSha256Base64,
  verifyHmacSha256Hex,
  timingSafeEqual,
} from "./hmac.ts";

Deno.test("hmacSha256Base64 matches a known vector", async () => {
  // Reference: base64(HMAC-SHA256("hello", "secret"))
  const sig = await hmacSha256Base64("hello", "secret");
  assertEquals(sig, "iKqz7ejTrflNJquQ07r9SiCDBww7zOnAFO4EpEOEfAs=");
});

Deno.test("hmacSha256Hex matches a known vector", async () => {
  // Reference: hex(HMAC-SHA256("hello", "secret")) via openssl
  const sig = await hmacSha256Hex("hello", "secret");
  assertEquals(sig, "88aab3ede8d3adf94d26ab90d3bafd4a2083070c3bcce9c014ee04a443847c0b");
});

Deno.test(
  "verifyHmacSha256Hex accepts a valid signature, is case-insensitive, rejects tampering",
  async () => {
    const raw = '{"event_type":"form.completed"}';
    const secret = "whsec_test";
    const good = "ba39d7a024fd25086e8b3cc78ac8017a1914b76391703bee411b0bca3984a013";
    assert(await verifyHmacSha256Hex(raw, secret, good));
    assert(await verifyHmacSha256Hex(raw, secret, good.toUpperCase())); // hex case-insensitive
    assert(!(await verifyHmacSha256Hex(raw + " ", secret, good))); // body tampered
    assert(!(await verifyHmacSha256Hex(raw, secret, ""))); // missing signature
  },
);

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
