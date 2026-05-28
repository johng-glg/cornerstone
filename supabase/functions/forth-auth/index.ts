import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAccessToken } from "../_shared/forthAuth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Thin smoke-test endpoint that exercises the shared Forth OAuth helper.
 * Real callers should import getAccessToken from _shared/forthAuth.ts directly.
 *
 * Optional query param `company_id` exercises per-tenant credential lookup
 * (Cornerstone Phase 2B).
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const companyId = url.searchParams.get('company_id') ?? undefined;
    const token = await getAccessToken(companyId);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Authentication successful',
        tokenPreview: token.substring(0, 10) + '...',
        company_id: companyId ?? null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (error: unknown) {
    console.error('[forth-auth] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
