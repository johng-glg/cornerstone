// Shared edge-function auth gate.
// Rejects anonymous callers. Accepts either a valid user JWT or the service-role key
// (for internal/scheduler-to-function calls). Returns the validated user id, or null
// when the caller is the service role.
//
// Usage:
//   const gate = await requireAuth(req);
//   if (gate instanceof Response) return gate;
//   const { userId, isServiceRole, authHeader } = gate;

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

export interface AuthContext {
  userId: string | null;
  isServiceRole: boolean;
  authHeader: string;
}

export async function requireAuth(req: Request): Promise<AuthContext | Response> {
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const token = authHeader.slice(7).trim();

  // Accept service-role key for scheduler/internal callers.
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (serviceKey && token === serviceKey) {
    return { userId: null, isServiceRole: true, authHeader };
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return { userId: data.user.id, isServiceRole: false, authHeader };
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// For data-fetching functions: also verify the user can access the entity's company.
export async function requireCompanyAccess(
  userId: string,
  companyId: string,
): Promise<boolean> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { data, error } = await supabase.rpc('can_access_company', {
    _user_id: userId,
    _company_id: companyId,
  });
  if (error) return false;
  return data === true;
}
