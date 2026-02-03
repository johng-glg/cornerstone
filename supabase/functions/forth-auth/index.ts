import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Token cache - stored in memory (resets on cold start)
let cachedToken: { token: string; expiresAt: number } | null = null;

// Normalize API secret (remove whitespace/newlines that might be accidentally included)
function normalize(s: string): string {
  return s.replace(/[\r\n\s]+/g, '');
}

// Get OAuth access token from Forth CRM
export async function getAccessToken(): Promise<string> {
  const now = Date.now();
  
  // Return cached token if still valid (with 5 min buffer)
  if (cachedToken && cachedToken.expiresAt > now + 300000) {
    console.log('[forth-auth] Using cached token');
    return cachedToken.token;
  }

  const clientId = Deno.env.get('FORTH_CLIENT_ID');
  const clientSecret = Deno.env.get('FORTH_API_KEY');

  if (!clientId || !clientSecret) {
    throw new Error('Missing FORTH_CLIENT_ID or FORTH_API_KEY secrets');
  }

  console.log('[forth-auth] Fetching new OAuth token...');
  
  const tokenResponse = await fetch('https://api.forthcrm.com/v1/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: normalize(clientSecret),
    }),
  });

  const responseText = await tokenResponse.text();
  console.log('[forth-auth] Response status:', tokenResponse.status);
  console.log('[forth-auth] Response body:', responseText);

  if (!tokenResponse.ok) {
    console.error('[forth-auth] OAuth failed:', tokenResponse.status, responseText);
    throw new Error(`OAuth authentication failed: ${tokenResponse.status} - ${responseText}`);
  }

  let tokenData;
  try {
    tokenData = JSON.parse(responseText);
  } catch {
    throw new Error(`Failed to parse OAuth response: ${responseText}`);
  }
  
  // Try various response structures
  const accessToken = tokenData.response?.access_token || 
                      tokenData.response?.api_key ||
                      tokenData.access_token || 
                      tokenData.api_key ||
                      tokenData.data?.access_token ||
                      tokenData.token;
  
  if (!accessToken) {
    console.error('[forth-auth] Token structure:', JSON.stringify(tokenData, null, 2));
    throw new Error(`No access_token found. Response keys: ${Object.keys(tokenData).join(', ')}`);
  }

  // Cache token for ~9 days (token valid for ~10 days)
  cachedToken = {
    token: accessToken,
    expiresAt: now + (9 * 24 * 60 * 60 * 1000),
  };

  console.log('[forth-auth] Token cached successfully');
  return accessToken;
}

// Build headers for Forth API calls
export function buildForthHeaders(accessToken: string): Record<string, string> {
  return {
    'Api-Key': accessToken,
    'Content-Type': 'application/json',
  };
}

// Clear cached token (useful for testing or forced refresh)
export function clearTokenCache(): void {
  cachedToken = null;
}

// Main handler - can be called directly to test auth
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const token = await getAccessToken();
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Authentication successful',
        tokenPreview: token.substring(0, 10) + '...',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: unknown) {
    console.error('[forth-auth] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
