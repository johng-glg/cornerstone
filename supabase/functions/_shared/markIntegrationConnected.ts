// Helper to update company_integrations.last_connected_at after a successful test.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function resolveCompanyId(authHeader: string | null): Promise<string | undefined> {
  if (!authHeader) return undefined;
  try {
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return undefined;
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: staff } = await admin
      .from("staff")
      .select("company_id")
      .eq("user_id", u.user.id)
      .maybeSingle();
    return staff?.company_id ?? undefined;
  } catch {
    return undefined;
  }
}

export async function markIntegration(
  providerKeys: string[],
  companyId: string | undefined,
  result: { success: boolean; error?: string },
) {
  if (!companyId) return;
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const update = result.success
    ? { last_connected_at: new Date().toISOString(), last_connection_error: null }
    : { last_connection_error: result.error ?? "Test failed" };
  await admin
    .from("company_integrations")
    .update(update)
    .eq("company_id", companyId)
    .in("provider_key", providerKeys);
}
