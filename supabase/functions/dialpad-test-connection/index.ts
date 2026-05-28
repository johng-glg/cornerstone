import { resolveCompanyId, markIntegration } from "../_shared/markIntegrationConnected.ts";

const corsHeaders = {

  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DIALPAD_BASE = "https://dialpad.com/api/v2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });

  const companyId = await resolveCompanyId(req.headers.get("Authorization"));

  try {
    const apiKey = Deno.env.get("DIALPAD_API_KEY");
    const webhookSecret = Deno.env.get("DIALPAD_WEBHOOK_SECRET");

    if (!apiKey) {
      await markIntegration(["dialpad"], companyId, { success: false, error: "DIALPAD_API_KEY is not configured" });
      return json({ success: false, error: "DIALPAD_API_KEY is not configured" }, 400);
    }

    const resp = await fetch(`${DIALPAD_BASE}/company`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const text = await resp.text();
    if (!resp.ok) {
      const err = `Dialpad API error: ${resp.status}`;
      await markIntegration(["dialpad"], companyId, { success: false, error: err });
      return json({ success: false, error: err, details: text.slice(0, 500) }, 400);
    }

    let company: { name?: string; id?: string | number } = {};
    try { company = JSON.parse(text); } catch { /* ignore */ }

    await markIntegration(["dialpad"], companyId, { success: true });

    return json({
      success: true,
      message: `Connected to Dialpad${company?.name ? ` (${company.name})` : ""}${webhookSecret ? " — webhook secret configured" : " — webhook secret missing"}`,
      company_id: company?.id ?? null,
      webhook_secret_configured: Boolean(webhookSecret),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    await markIntegration(["dialpad"], companyId, { success: false, error: msg });
    return json({ success: false, error: msg }, 500);
  }
});

