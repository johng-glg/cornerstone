// Shared edge-function auth gate.
// Rejects anonymous callers. Accepts a valid user JWT, or the service-role key for
// internal/scheduler-to-function calls. Returns the validated user id (null for service role).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "./cors.ts";

export interface AuthContext {
  userId: string | null;
  isServiceRole: boolean;
  authHeader: string;
}

function unauthorized(req: Request): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

/** Constant-time string compare to avoid leaking the service-role key via timing. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export async function requireAuth(req: Request): Promise<AuthContext | Response> {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return unauthorized(req);
  }
  const token = authHeader.slice(7).trim();

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && timingSafeEqual(token, serviceKey)) {
    return { userId: null, isServiceRole: true, authHeader };
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return unauthorized(req);
    return { userId: data.user.id, isServiceRole: false, authHeader };
  } catch {
    return unauthorized(req);
  }
}
