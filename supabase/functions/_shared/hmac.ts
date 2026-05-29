// HMAC-SHA256 webhook signature verification (Web Crypto). Used by the Dialpad (and later
// DocuSeal) webhook receivers. Pure + unit-tested.

function toBase64(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

/** Compute base64(HMAC-SHA256(raw, secret)). */
export async function hmacSha256Base64(raw: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw));
  return toBase64(sig);
}

/** Constant-time string comparison. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

/** Verify a base64 HMAC-SHA256 signature over the raw request body. */
export async function verifyHmacSha256Base64(
  raw: string,
  secret: string,
  signature: string,
): Promise<boolean> {
  if (!signature) return false;
  const expected = await hmacSha256Base64(raw, secret);
  return timingSafeEqual(expected, signature);
}
