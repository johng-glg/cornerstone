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

  try {
    const docusealApiKey = Deno.env.get("DOCUSEAL_API_KEY");
    const docusealApiUrl = Deno.env.get("DOCUSEAL_API_URL") || "https://api.docuseal.com";

    if (!docusealApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "DOCUSEAL_API_KEY is not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log(`Testing DocuSeal API at: ${docusealApiUrl}`);

    // Test API by fetching templates list
    const response = await fetch(`${docusealApiUrl}/templates?limit=5`, {
      method: "GET",
      headers: {
        "X-Auth-Token": docusealApiKey,
        "Content-Type": "application/json",
      },
    });

    const responseText = await response.text();
    console.log(`DocuSeal response status: ${response.status}`);
    console.log(`DocuSeal response: ${responseText}`);

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `DocuSeal API error: ${response.status}`,
          details: responseText,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const templates = JSON.parse(responseText);

    return new Response(
      JSON.stringify({
        success: true,
        message: "DocuSeal API connection verified",
        api_url: docusealApiUrl,
        templates_found: Array.isArray(templates) ? templates.length : templates.data?.length || 0,
        templates: Array.isArray(templates) 
          ? templates.map((t: { id: number; name: string }) => ({ id: t.id, name: t.name }))
          : templates.data?.map((t: { id: number; name: string }) => ({ id: t.id, name: t.name })) || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error testing DocuSeal:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
