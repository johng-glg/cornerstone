// invite-staff — admin-only: create a staff member end-to-end. A staff row requires an auth
// account (FK to auth.users), which can't be a plain insert, so this runs server-side with the
// service role: create the auth user (email-confirmed; they sign in via Google), then insert the
// staff row + role. The new user signs in with their @guardianlit.com Google identity, which
// links to this pre-created account by email.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { requireAuth } from "../_shared/requireAuth.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { resolveCompanyId } from "../_shared/markIntegrationConnected.ts";

const InputSchema = z.object({
  email: z.string().email(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  department: z.string().min(1),
  role: z.string().min(1),
  job_title: z.string().optional(),
});

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  const gate = await requireAuth(req);
  if (gate instanceof Response) return gate;

  const limited = await enforceRateLimit(req, {
    bucket: "invite-staff",
    identifier: gate.userId ?? "service",
    maxRequests: 20,
    windowSeconds: 60,
  });
  if (limited) return limited;

  const parsed = InputSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return jsonResponse(
      req,
      { success: false, error: "Invalid input", issues: parsed.error.issues },
      400,
    );
  }
  const input = parsed.data;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Caller must be an admin (or the service role).
  if (!gate.isServiceRole) {
    const { data: adminRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", gate.userId!)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminRow) {
      return jsonResponse(req, { success: false, error: "Admin role required." }, 403);
    }
  }

  const companyId = await resolveCompanyId(req.headers.get("Authorization"));
  if (!companyId) {
    return jsonResponse(req, { success: false, error: "Could not resolve your company." }, 400);
  }

  // 1. Create the auth account (email-confirmed; no password — Google sign-in links by email).
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: input.email,
    email_confirm: true,
    user_metadata: { first_name: input.first_name, last_name: input.last_name },
  });
  if (createErr || !created?.user?.id) {
    return jsonResponse(
      req,
      { success: false, error: `Could not create the account: ${createErr?.message ?? "unknown"}` },
      400,
    );
  }
  const userId = created.user.id;

  // 2. Staff row.
  const { error: staffErr } = await admin.from("staff").insert({
    user_id: userId,
    company_id: companyId,
    first_name: input.first_name,
    last_name: input.last_name,
    email: input.email,
    department: input.department,
    job_title: input.job_title || null,
    is_active: true,
  });
  if (staffErr) {
    return jsonResponse(req, { success: false, step: "staff", error: staffErr.message }, 400);
  }

  // 3. Role grant.
  const { error: roleErr } = await admin
    .from("user_roles")
    .insert({ user_id: userId, role: input.role });
  if (roleErr) {
    return jsonResponse(req, { success: false, step: "role", error: roleErr.message }, 400);
  }

  return jsonResponse(req, { success: true, user_id: userId });
}

if (import.meta.main) {
  Deno.serve(handler);
}
