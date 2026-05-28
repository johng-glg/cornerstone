import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getAccessToken, buildForthHeaders, forthFetch } from "../_shared/forthAuth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegisterClientRequest {
  client_id: string;
  client_service_id: string;
  client_data: {
    first_name: string;
    last_name: string;
    middle_name?: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    email: string;
    phone: string;
    date_of_birth: string;
    ssn?: string;
  };
  banking?: {
    bank_name: string;
    routing_number: string;
    account_number: string;
    account_type: 'checking' | 'savings';
  };
  debts: Array<{
    creditor_name: string;
    account_type: string;
    current_balance: number;
    original_balance?: number;
    account_number?: string;
  }>;
}

const FORTH_API_BASE = 'https://api.forthcrm.com/v1';


// deno-lint-ignore no-explicit-any
async function logOperation(
  supabase: any,
  entityType: string,
  entityId: string,
  action: string,
  success: boolean,
  requestPayload?: unknown,
  responsePayload?: unknown,
  errorMessage?: string
) {
  try {
    await supabase.from('forth_sync_log').insert({
      entity_type: entityType,
      entity_id: entityId,
      action,
      success,
      request_payload: requestPayload,
      response_payload: responsePayload,
      error_message: errorMessage,
    });
  } catch (e) {
    console.error('Failed to log operation:', e);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body: RegisterClientRequest = await req.json();
    const { client_id, client_service_id, client_data, banking, debts } = body;

    if (!client_id || !client_data) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: client_id and client_data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Registering client ${client_id} with Forth Pay...`);

    // Get access token
    const accessToken = await getAccessToken();
    
    // Step 1: Create client in Forth CRM
    const clientPayload = {
      first_name: client_data.first_name,
      last_name: client_data.last_name,
      middle_name: client_data.middle_name || '',
      address: client_data.address,
      city: client_data.city,
      state: client_data.state,
      zip: client_data.zip,
      email: client_data.email,
      home_phone: client_data.phone,
      date_of_birth: client_data.date_of_birth,
      ssn: client_data.ssn || '',
      file_type: 'DEBT SETTLEMENT',
    };

    console.log('Creating Forth client with payload:', JSON.stringify(clientPayload, null, 2));
    const createClientResponse = await fetch(`${FORTH_API_BASE}/clients`, {
      method: 'POST',
      headers: buildForthHeaders(accessToken),
      body: JSON.stringify(clientPayload),
    });

    const createClientText = await createClientResponse.text();
    console.log(`Forth create-client response status: ${createClientResponse.status}`);
    console.log('Forth create-client response body:', createClientText);

    let createClientResult;
    try {
      createClientResult = JSON.parse(createClientText);
    } catch {
      createClientResult = { raw: createClientText };
    }
    
    await logOperation(
      supabase,
      'client',
      client_id,
      'create_forth_client',
      createClientResponse.ok,
      clientPayload,
      createClientResult,
      !createClientResponse.ok ? `HTTP ${createClientResponse.status}: ${createClientText}` : undefined
    );

    if (!createClientResponse.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Forth API returned HTTP ${createClientResponse.status}`,
          details: createClientResult,
          sent_payload: { ...clientPayload, ssn: clientPayload.ssn ? '***' : '' },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract the Forth client ID (10-digit numeric)
    const forthCrmId = createClientResult.response?.id || 
                       createClientResult.id || 
                       createClientResult.data?.id;

    if (!forthCrmId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No client ID returned from Forth API' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Forth client created with ID: ${forthCrmId}`);

    // Step 2: Add bank account if provided
    if (banking) {
      console.log('Adding bank account...');
      const bankPayload = {
        client_id: Number(forthCrmId),
        bank_name: banking.bank_name,
        routing_number: banking.routing_number,
        account_number: banking.account_number,
        account_type: banking.account_type.toUpperCase(),
      };

      const bankResponse = await fetch(`${FORTH_API_BASE}/bank-accounts`, {
        method: 'POST',
        headers: buildForthHeaders(accessToken),
        body: JSON.stringify(bankPayload),
      });

      const bankResult = await bankResponse.json();
      
      await logOperation(
        supabase,
        'client',
        client_id,
        'add_bank_account',
        bankResponse.ok,
        { ...bankPayload, account_number: '****', routing_number: '****' }, // Mask sensitive data
        bankResult,
        !bankResponse.ok ? JSON.stringify(bankResult) : undefined
      );

      if (!bankResponse.ok) {
        console.warn('Failed to add bank account:', bankResult);
        // Continue - this is not a blocking error
      }
    }

    // Step 3: Add debts
    for (const debt of debts) {
      console.log(`Adding debt: ${debt.creditor_name}...`);
      const debtPayload = {
        client_id: Number(forthCrmId),
        creditor_name: debt.creditor_name,
        account_type: debt.account_type,
        current_balance: debt.current_balance,
        original_balance: debt.original_balance || debt.current_balance,
        account_number: debt.account_number || '',
      };

      const debtResponse = await fetch(`${FORTH_API_BASE}/debts`, {
        method: 'POST',
        headers: buildForthHeaders(accessToken),
        body: JSON.stringify(debtPayload),
      });

      const debtResult = await debtResponse.json();
      
      await logOperation(
        supabase,
        'client_service',
        client_service_id,
        'add_debt',
        debtResponse.ok,
        debtPayload,
        debtResult,
        !debtResponse.ok ? JSON.stringify(debtResult) : undefined
      );

      if (!debtResponse.ok) {
        console.warn('Failed to add debt:', debtResult);
        // Continue - this is not a blocking error
      }
    }

    // Step 4: Enroll the client
    console.log('Enrolling client...');
    const enrollResponse = await fetch(`${FORTH_API_BASE}/clients/${forthCrmId}/enroll`, {
      method: 'POST',
      headers: buildForthHeaders(accessToken),
      body: JSON.stringify({}),
    });

    const enrollResult = await enrollResponse.json();
    
    await logOperation(
      supabase,
      'client',
      client_id,
      'enroll_client',
      enrollResponse.ok,
      { forth_crm_id: forthCrmId },
      enrollResult,
      !enrollResponse.ok ? JSON.stringify(enrollResult) : undefined
    );

    if (!enrollResponse.ok) {
      console.warn('Failed to enroll client:', enrollResult);
      // Continue - we still want to store the forth_crm_id
    }

    // Step 5: Update local client record with forth_crm_id
    const { error: updateError } = await supabase
      .from('clients')
      .update({ forth_crm_id: String(forthCrmId) })
      .eq('id', client_id);

    if (updateError) {
      console.error('Failed to update client with forth_crm_id:', updateError);
      return new Response(
        JSON.stringify({ 
          success: true, 
          forth_crm_id: String(forthCrmId),
          warning: 'Client registered but failed to save forth_crm_id locally'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully registered client ${client_id} with Forth ID ${forthCrmId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        forth_crm_id: String(forthCrmId),
        message: 'Client successfully registered with Forth Pay'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Forth registration error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
