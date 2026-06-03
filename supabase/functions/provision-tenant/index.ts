// provision-tenant — platform-admin-only tenant provisioning. Creates the first admin's auth
// user via the Auth admin API, then calls public.provision_tenant to wire up company + staff +
// admin role atomically. The caller must be a platform admin (public.is_platform_admin); the
// DB function re-checks this, so authorization is enforced server-side regardless of the edge layer.
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { z } from "npm:zod@3.23.8";
import { requireAuth } from "../_shared/requireAuth.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const InputSchema = z.object({
  name: z.string().min(1).max(200),
  company_type: z.enum(["law_firm", "affiliate", "financing_company"]),
  subdomain: z
    .string()
    .regex(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/, "invalid subdomain (DNS label)")
    .optional(),
  admin_email: z.string().email(),
  admin_first_name: z.string().min(1).max(100),
  admin_last_name: z.string().min(1).max(100),
});

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  const gate = await requireAuth(req);
  if (gate instanceof Response) return gate;

  // Tenant creation is a rare, high-privilege action; cap it per caller.
  const limited = await enforceRateLimit(req, {
    bucket: "provision-tenant",
    identifier: gate.userId ?? "service",
    maxRequests: 10,
    windowSeconds: 60,
  });
  if (limited) return limited;

  const parsed = InputSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return jsonResponse(
      req,
      { success: false, error: "Invalid request", issues: parsed.error.issues },
      400,
    );
  }
  const input = parsed.data;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Authorization: only platform admins may provision. The DB function also enforces this, but
  // checking here lets us return a clean 403 before creating an auth user.
  if (gate.userId) {
    const { data: isAdmin, error: adminErr } = await admin.rpc("is_platform_admin", {
      _user_id: gate.userId,
    });
    if (adminErr) {
      console.error("provision-tenant: is_platform_admin check failed:", adminErr.message);
      return jsonResponse(req, { success: false, error: "Authorization check failed" }, 500);
    }
    if (!isAdmin) {
      return jsonResponse(req, { success: false, error: "Platform admin required" }, 403);
    }
  } else if (!gate.isServiceRole) {
    return jsonResponse(req, { success: false, error: "Platform admin required" }, 403);
  }

  // 1. Create the first admin's auth user (email-confirmed; they set a password via reset flow).
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: input.admin_email,
    email_confirm: true,
    user_metadata: { first_name: input.admin_first_name, last_name: input.admin_last_name },
  });
  if (createErr || !created?.user) {
    const message = createErr?.message ?? "Failed to create admin user";
    // Surface a duplicate-email conflict distinctly.
    const status = /already.*registered|exists/i.test(message) ? 409 : 500;
    return jsonResponse(req, { success: false, error: message }, status);
  }

  // 2. Wire up company + staff + admin role atomically in the DB.
  const { data: companyId, error: provErr } = await admin.rpc("provision_tenant", {
    _name: input.name,
    _company_type: input.company_type,
    _subdomain: input.subdomain ?? null,
    _admin_user_id: created.user.id,
    _admin_first_name: input.admin_first_name,
    _admin_last_name: input.admin_last_name,
    _admin_email: input.admin_email,
  });
  if (provErr) {
    // Roll back the orphaned auth user so a retry with a fixed payload can reuse the email.
    await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
    return jsonResponse(req, { success: false, error: provErr.message }, 400);
  }

  return jsonResponse(req, {
    success: true,
    company_id: companyId,
    admin_user_id: created.user.id,
    message: "Tenant provisioned. The admin can set a password via the reset-password flow.",
  });
}

if (import.meta.main) {
  Deno.serve(handler);
}
