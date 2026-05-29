// Restricted CORS for edge functions (divergence from Lovable's wildcard, Q-A4).
// Allowed origins come from the CORS_ALLOWED_ORIGINS secret (comma-separated); the request
// Origin is echoed only if allow-listed, otherwise the first configured origin is used.
// Never emits `Access-Control-Allow-Origin: *`.

const DEFAULT_ALLOWED = ["http://localhost:8080"];

function allowedOrigins(): string[] {
  const env = Deno.env.get("CORS_ALLOWED_ORIGINS");
  const list = env
    ? env
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  return list.length > 0 ? list : DEFAULT_ALLOWED;
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allow = allowedOrigins();
  const resolved = allow.includes(origin) ? origin : allow[0];
  return {
    "Access-Control-Allow-Origin": resolved,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

export function jsonResponse(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}
