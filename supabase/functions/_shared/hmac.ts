// HMAC-SHA256 webhook signature verification (Web Crypto). Used by the Dialpad (and later
// DocuSeal) webhook receivers. Pure + unit-tested.

function toBase64(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sign(raw: string, secret: string): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw));
}

/** Compute base64(HMAC-SHA256(raw, secret)). */
export async function hmacSha256Base64(raw: string, secret: string): Promise<string> {
  return toBase64(await sign(raw, secret));
}

/** Compute hex(HMAC-SHA256(raw, secret)). */
export async function hmacSha256Hex(raw: string, secret: string): Promise<string> {
  return toHex(await sign(raw, secret));
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

/** Verify a hex HMAC-SHA256 signature (e.g. DocuSeal's X-Docuseal-Signature) over the raw body. */
export async function verifyHmacSha256Hex(
  raw: string,
  secret: string,
  signature: string,
): Promise<boolean> {
  if (!signature) return false;
  const expected = await hmacSha256Hex(raw, secret);
  return timingSafeEqual(expected.toLowerCase(), signature.trim().toLowerCase());
}
