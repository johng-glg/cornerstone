import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ResetPasswordRequest {
  user_id: string;
  staff_id: string;
}

// Generate a secure temporary password
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  
  // Ensure at least one of each required character type
  password += 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)]; // Uppercase
  password += 'abcdefghjkmnpqrstuvwxyz'[Math.floor(Math.random() * 23)]; // Lowercase  
  password += '23456789'[Math.floor(Math.random() * 8)]; // Number
  password += '!@#$%'[Math.floor(Math.random() * 5)]; // Special
  
  // Fill remaining 8 characters randomly
  for (let i = 0; i < 8; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Create client with user's token to verify permissions
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      }
    );

    // Get the requesting user
    const { data: { user: requestingUser }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !requestingUser) {
      throw new Error("Unauthorized - invalid token");
    }

    // Check if requesting user is admin
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id);

    if (rolesError) {
      throw new Error("Failed to verify permissions");
    }

    const isAdmin = roles?.some(r => r.role === "admin");
    if (!isAdmin) {
      throw new Error("Unauthorized - admin role required");
    }

    // Parse request body
    const { user_id, staff_id }: ResetPasswordRequest = await req.json();

    if (!user_id || !staff_id) {
      throw new Error("Missing required fields: user_id, staff_id");
    }

    // Verify the staff member exists
    const { data: staffMember, error: staffError } = await supabaseAdmin
      .from("staff")
      .select("id, first_name, last_name, email")
      .eq("id", staff_id)
      .eq("user_id", user_id)
      .single();

    if (staffError || !staffMember) {
      throw new Error("Staff member not found");
    }

    // Generate new temporary password
    const tempPassword = generateTempPassword();

    // Update the user's password using admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { password: tempPassword }
    );

    if (updateError) {
      console.error("Password update error:", updateError);
      throw new Error("Failed to reset password");
    }

    console.log(`Password reset successfully for ${staffMember.email}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Password reset for ${staffMember.first_name} ${staffMember.last_name}`,
        temp_password: tempPassword,
        staff_email: staffMember.email,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Reset password error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "An unexpected error occurred",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: error.message?.includes("Unauthorized") ? 403 : 400,
      }
    );
  }
});
