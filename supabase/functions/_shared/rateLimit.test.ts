import { assert, assertEquals } from "jsr:@std/assert@1";
import { enforceRateLimit, clientIp } from "./rateLimit.ts";

// Minimal stub matching the slice of SupabaseClient enforceRateLimit uses (.rpc).
// deno-lint-ignore no-explicit-any
function stubAdmin(rpcImpl: (name: string, args: any) => any) {
  // deno-lint-ignore no-explicit-any
  return { rpc: (name: string, args: any) => Promise.resolve(rpcImpl(name, args)) } as any;
}

const req = () => new Request("https://fn.test/", { method: "POST" });

Deno.test("enforceRateLimit returns null when under the limit", async () => {
  const admin = stubAdmin(() => ({
    data: [{ allowed: true, current_count: 1, limit_value: 5, retry_after_seconds: 0 }],
    error: null,
  }));
  const res = await enforceRateLimit(req(), {
    bucket: "b",
    identifier: "u1",
    maxRequests: 5,
    windowSeconds: 60,
    admin,
  });
  assertEquals(res, null);
});

Deno.test("enforceRateLimit returns 429 with Retry-After when over the limit", async () => {
  const admin = stubAdmin(() => ({
    data: [{ allowed: false, current_count: 6, limit_value: 5, retry_after_seconds: 42 }],
    error: null,
  }));
  const res = await enforceRateLimit(req(), {
    bucket: "b",
    identifier: "u1",
    maxRequests: 5,
    windowSeconds: 60,
    admin,
  });
  assert(res instanceof Response);
  assertEquals(res!.status, 429);
  assertEquals(res!.headers.get("Retry-After"), "42");
  const body = await res!.json();
  assertEquals(body.retry_after_seconds, 42);
});

Deno.test("enforceRateLimit passes bucket/identifier/limits through to the RPC", async () => {
  // deno-lint-ignore no-explicit-any
  let seen: any = null;
  const admin = stubAdmin((_name, args) => {
    seen = args;
    return { data: [{ allowed: true, retry_after_seconds: 0 }], error: null };
  });
  await enforceRateLimit(req(), {
    bucket: "forth-auth",
    identifier: "user-123",
    maxRequests: 15,
    windowSeconds: 60,
    admin,
  });
  assertEquals(seen._bucket, "forth-auth");
  assertEquals(seen._identifier, "user-123");
  assertEquals(seen._max_requests, 15);
  assertEquals(seen._window_seconds, 60);
});

Deno.test("enforceRateLimit fails open on RPC error (does not block traffic)", async () => {
  const admin = stubAdmin(() => ({ data: null, error: { message: "db down" } }));
  const res = await enforceRateLimit(req(), {
    bucket: "b",
    identifier: "u1",
    maxRequests: 5,
    windowSeconds: 60,
    admin,
  });
  assertEquals(res, null);
});

Deno.test("clientIp prefers the left-most x-forwarded-for hop", () => {
  const r = new Request("https://fn.test/", {
    method: "POST",
    headers: { "x-forwarded-for": "203.0.113.7, 70.41.3.18, 150.172.238.178" },
  });
  assertEquals(clientIp(r), "203.0.113.7");
});

Deno.test("clientIp falls back to x-real-ip then 'unknown'", () => {
  const r1 = new Request("https://fn.test/", {
    method: "POST",
    headers: { "x-real-ip": "198.51.100.9" },
  });
  assertEquals(clientIp(r1), "198.51.100.9");
  const r2 = new Request("https://fn.test/", { method: "POST" });
  assertEquals(clientIp(r2), "unknown");
});
