import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { resolveCompanyId, markIntegration } from "../_shared/markIntegrationConnected.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const companyId = await resolveCompanyId(req.headers.get("Authorization"));
  const jsonResp = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });

  try {
    const docusealApiKey = Deno.env.get("DOCUSEAL_API_KEY");
    const docusealApiUrl = Deno.env.get("DOCUSEAL_API_URL") || "https://api.docuseal.com";

    if (!docusealApiKey) {
      await markIntegration(["docuseal"], companyId, { success: false, error: "DOCUSEAL_API_KEY is not configured" });
      return jsonResp({ success: false, error: "DOCUSEAL_API_KEY is not configured" }, 400);
    }

    const response = await fetch(`${docusealApiUrl}/templates?limit=5`, {
      method: "GET",
      headers: { "X-Auth-Token": docusealApiKey, "Content-Type": "application/json" },
    });

    const responseText = await response.text();

    if (!response.ok) {
      const err = `DocuSeal API error: ${response.status}`;
      await markIntegration(["docuseal"], companyId, { success: false, error: err });
      return jsonResp({ success: false, error: err, details: responseText }, 400);
    }

    const templates = JSON.parse(responseText);
    await markIntegration(["docuseal"], companyId, { success: true });

    return jsonResp({
      success: true,
      message: "DocuSeal API connection verified",
      api_url: docusealApiUrl,
      templates_found: Array.isArray(templates) ? templates.length : templates.data?.length || 0,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    await markIntegration(["docuseal"], companyId, { success: false, error: msg });
    return jsonResp({ success: false, error: msg }, 500);
  }

});
