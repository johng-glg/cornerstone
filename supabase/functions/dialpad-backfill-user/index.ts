// Admin-only: look up Dialpad user_id by email and write it onto staff.dialpad_user_id.
// POST { staff_id }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DIALPAD_API_KEY = Deno.env.get("DIALPAD_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return j({ error: "unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return j({ error: "admin role required" }, 403);

    const { staff_id } = await req.json().catch(() => ({}));
    if (!staff_id) return j({ error: "staff_id required" }, 400);

    const { data: staff } = await admin.from("staff").select("id, email").eq("id", staff_id).single();
    if (!staff) return j({ error: "staff not found" }, 404);

    const resp = await fetch(
      `https://dialpad.com/api/v2/users?email=${encodeURIComponent(staff.email)}`,
      { headers: { Authorization: `Bearer ${DIALPAD_API_KEY}` } },
    );
    const payload = await resp.json().catch(() => ({}));
    if (!resp.ok) return j({ error: "Dialpad lookup failed", details: payload }, 502);
    const items = payload.items ?? payload.users ?? [];
    if (!items.length) return j({ error: "No Dialpad user found for this email" }, 404);
    const dialpadId = String(items[0].id);

    await admin.from("staff").update({ dialpad_user_id: dialpadId }).eq("id", staff_id);
    return j({ ok: true, dialpad_user_id: dialpadId });
  } catch (e) {
    return j({ error: (e as Error).message }, 500);
  }
});

function j(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
