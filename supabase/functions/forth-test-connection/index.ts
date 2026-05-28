// Tests Forth OAuth credentials and updates company_integrations for both
// forth_pay and forth_crm (they share the same FORTH_CLIENT_ID / FORTH_API_KEY).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAccessToken, clearTokenCache } from "../_shared/forthAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Resolve company for the caller (if authenticated).
  let companyId: string | undefined;
  const authHeader = req.headers.get("Authorization");
  if (authHeader) {
    try {
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: u } = await userClient.auth.getUser();
      if (u?.user) {
        const { data: staff } = await admin
          .from("staff")
          .select("company_id")
          .eq("user_id", u.user.id)
          .maybeSingle();
        companyId = staff?.company_id ?? undefined;
      }
    } catch (_) { /* ignore — fall back to env */ }
  }

  // Force a fresh fetch so this reflects current credential validity.
  clearTokenCache(companyId);

  const issuedAt = new Date().toISOString();
  try {
    const token = await getAccessToken(companyId);
    const tokenPreview = token.slice(0, 6) + "…" + token.slice(-4);

    if (companyId) {
      await admin
        .from("company_integrations")
        .update({
          last_connected_at: issuedAt,
          last_connection_error: null,
        })
        .eq("company_id", companyId)
        .in("provider_key", ["forth_pay", "forth_crm"]);
    }

    return json({
      success: true,
      message: `Forth OAuth token refreshed (${tokenPreview}). Cached for ~9 days.`,
      issued_at: issuedAt,
      token_preview: tokenPreview,
      company_scoped: Boolean(companyId),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (companyId) {
      await admin
        .from("company_integrations")
        .update({ last_connection_error: msg })
        .eq("company_id", companyId)
        .in("provider_key", ["forth_pay", "forth_crm"]);
    }
    return json({ success: false, error: msg }, 400);
  }
});
