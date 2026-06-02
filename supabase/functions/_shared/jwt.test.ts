import { assert, assertEquals } from "jsr:@std/assert@1";
import { looksLikeJwt, verifyHs256Jwt } from "./jwt.ts";

// Mint an HS256 JWT the same way Dialpad does, so we can round-trip it through the verifier.
function b64url(bytes: Uint8Array | string): string {
  const arr = typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function mintJwt(
  payload: Record<string, unknown>,
  secret: string,
  alg = "HS256",
): Promise<string> {
  const header = b64url(JSON.stringify({ alg, typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${header}.${body}`));
  return `${header}.${body}.${b64url(new Uint8Array(sig))}`;
}

Deno.test("looksLikeJwt distinguishes tokens from JSON", () => {
  assert(looksLikeJwt("aaa.bbb.ccc"));
  assert(!looksLikeJwt('{"call_id":"1"}'));
  assert(!looksLikeJwt("aaa.bbb"));
  assert(!looksLikeJwt("aaa..ccc"));
});

Deno.test("verifyHs256Jwt decodes a valid token", async () => {
  const secret = "dpwh_secret";
  const token = await mintJwt({ call_id: "abc", state: "hangup" }, secret);
  const payload = await verifyHs256Jwt(token, secret);
  assertEquals(payload?.call_id, "abc");
  assertEquals(payload?.state, "hangup");
});

Deno.test("verifyHs256Jwt rejects a wrong secret", async () => {
  const token = await mintJwt({ call_id: "abc" }, "right");
  assertEquals(await verifyHs256Jwt(token, "wrong"), null);
});

Deno.test("verifyHs256Jwt rejects a tampered payload", async () => {
  const secret = "s";
  const token = await mintJwt({ call_id: "abc" }, secret);
  const [h, , sig] = token.split(".");
  const forged = b64url(JSON.stringify({ call_id: "evil" }));
  assertEquals(await verifyHs256Jwt(`${h}.${forged}.${sig}`, secret), null);
});

Deno.test("verifyHs256Jwt rejects non-HS256 alg and empty secret", async () => {
  const token = await mintJwt({ call_id: "abc" }, "s", "none");
  assertEquals(await verifyHs256Jwt(token, "s"), null);
  const valid = await mintJwt({ call_id: "abc" }, "s");
  assertEquals(await verifyHs256Jwt(valid, ""), null);
});
