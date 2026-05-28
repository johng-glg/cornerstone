import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// New consolidated department type
type Department = 'administration' | 'legal' | 'negotiations' | 'sales' | 'client_services' | 'operations';

interface CreateStaffRequest {
  email: string
  password?: string
  first_name: string
  last_name: string
  department: Department
  company_id: string
  phone?: string
  is_active?: boolean
  roles?: string[]
  job_title?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Create regular client to check caller's permissions
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get current user
    const { data: { user: caller }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !caller) {
      console.error('Auth error:', authError)
      throw new Error('Unauthorized - must be logged in')
    }

    console.log('Caller user ID:', caller.id)

    // Check if caller is admin
    const { data: callerRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)

    if (rolesError) {
      console.error('Error checking roles:', rolesError)
      throw new Error('Failed to verify permissions')
    }

    console.log('Caller roles:', callerRoles)

    const isAdmin = callerRoles?.some(r => r.role === 'admin')
    if (!isAdmin) {
      throw new Error('Unauthorized - admin role required')
    }

    // Parse request body
    const body: CreateStaffRequest = await req.json()
    console.log('Creating staff user:', { ...body, password: '[REDACTED]' })

    // Validate required fields
    if (!body.email || !body.first_name || !body.last_name || !body.department || !body.company_id) {
      throw new Error('Missing required fields: email, first_name, last_name, department, company_id')
    }

    // Generate a strong random temporary password if none provided.
    // Returned to the admin in the success response so it can be communicated securely.
    function generateTempPassword(len = 20): string {
      const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
      const buf = new Uint8Array(len);
      crypto.getRandomValues(buf);
      let out = '';
      for (let i = 0; i < len; i++) out += charset[buf[i] % charset.length];
      return out;
    }
    const passwordWasGenerated = !body.password;
    const password = body.password || generateTempPassword();


    // Create auth user with email auto-confirmed
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: body.first_name,
        last_name: body.last_name
      }
    })

    if (createError) {
      console.error('Error creating auth user:', createError)
      throw new Error(`Failed to create user: ${createError.message}`)
    }

    console.log('Created auth user:', newUser.user.id)

    // Create staff record
    const { data: staffRecord, error: staffError } = await supabaseAdmin
      .from('staff')
      .insert({
        user_id: newUser.user.id,
        email: body.email,
        first_name: body.first_name,
        last_name: body.last_name,
        department: body.department,
        company_id: body.company_id,
        phone: body.phone || null,
        is_active: body.is_active !== undefined ? body.is_active : true,
        job_title: body.job_title || null,
      })
      .select()
      .single()

    if (staffError) {
      console.error('Error creating staff record:', staffError)
      // Try to clean up the auth user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      throw new Error(`Failed to create staff record: ${staffError.message}`)
    }

    console.log('Created staff record:', staffRecord.id)

    // Add roles if provided
    if (body.roles && body.roles.length > 0) {
      const roleInserts = body.roles.map(role => ({
        user_id: newUser.user.id,
        role: role
      }))

      const { error: rolesInsertError } = await supabaseAdmin
        .from('user_roles')
        .insert(roleInserts)

      if (rolesInsertError) {
        console.error('Error adding roles:', rolesInsertError)
        // Don't fail the whole operation for role errors
      } else {
        console.log('Added roles:', body.roles)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        staff: staffRecord,
        user_id: newUser.user.id,
        message: `Staff member ${body.first_name} ${body.last_name} created successfully`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in create-staff-user:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
