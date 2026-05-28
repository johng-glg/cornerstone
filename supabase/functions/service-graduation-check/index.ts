// Cornerstone Phase 6B — Service Graduation Automation
//
// Checks whether a client_service is eligible for automatic graduation based on
// per-company config and liability state. If eligible:
//   1. Updates client_services.status -> 'graduated'
//   2. Invokes plsa-routing { operation: 'close_account' } when fire_contact_close = true
//   3. Logs a graduation_events row
//
// Idempotent: if the service is already 'graduated', returns early.
//
// Input:  { client_service_id: string, triggered_by_liability_id?: string }
// Output: { graduated: boolean, reason?: string, event_id?: string }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESOLVED_LIABILITY_STATES = ['settled', 'dismissed', 'cancelled'];

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const { client_service_id, triggered_by_liability_id } = await req.json();
    if (!client_service_id) throw new Error('client_service_id is required');

    // 1. Load service
    const { data: service, error: svcErr } = await supabase
      .from('client_services')
      .select('id, status, company_id, client_id')
      .eq('id', client_service_id)
      .single();
    if (svcErr || !service) throw new Error(`Service not found: ${svcErr?.message}`);

    if (service.status === 'graduated') {
      return json({ graduated: false, reason: 'already_graduated' });
    }

    // 2. Load company config
    const { data: config } = await supabase
      .from('graduation_automation_config')
      .select('*')
      .eq('company_id', service.company_id)
      .maybeSingle();

    if (!config?.enabled) {
      return json({ graduated: false, reason: 'automation_disabled' });
    }

    // 3. Check liability eligibility
    const { data: liabilities, error: liabErr } = await supabase
      .from('liabilities')
      .select('id, status')
      .eq('engagement_id', client_service_id);
    if (liabErr) throw new Error(`Liability fetch failed: ${liabErr.message}`);

    if (!liabilities || liabilities.length === 0) {
      return json({ graduated: false, reason: 'no_liabilities' });
    }

    if (config.require_all_liabilities_resolved) {
      const unresolved = liabilities.filter((l) => !RESOLVED_LIABILITY_STATES.includes(l.status as string));
      if (unresolved.length > 0) {
        return json({ graduated: false, reason: 'unresolved_liabilities', unresolved_count: unresolved.length });
      }
    }

    // 4. Transition status
    const previousStatus = service.status;
    const { error: updErr } = await supabase
      .from('client_services')
      .update({ status: 'graduated' })
      .eq('id', client_service_id);
    if (updErr) throw new Error(`Status update failed: ${updErr.message}`);

    // 5. Fire contact close if configured (best-effort)
    let contactCloseStatus = 'skipped';
    if (config.fire_contact_close) {
      try {
        const { error: closeErr } = await supabase.functions.invoke('plsa-routing', {
          body: {
            operation: 'close_account',
            client_service_id,
            close_reason: 'graduated',
          },
        });
        contactCloseStatus = closeErr ? `failed: ${closeErr.message}` : 'ok';
      } catch (e: any) {
        contactCloseStatus = `failed: ${e?.message || 'unknown'}`;
      }
    }

    // 6. Log graduation event
    const { data: event, error: evtErr } = await supabase
      .from('graduation_events')
      .insert({
        company_id: service.company_id,
        client_service_id,
        triggered_by_liability_id: triggered_by_liability_id || null,
        previous_status: previousStatus,
        contact_close_status: contactCloseStatus,
        notification_sent: false,
        details: {
          liability_count: liabilities.length,
          template_id: config.notification_template_id,
        },
      })
      .select()
      .single();
    if (evtErr) console.error('graduation event log failed', evtErr);

    return json({
      graduated: true,
      event_id: event?.id,
      contact_close_status: contactCloseStatus,
    });
  } catch (e: any) {
    console.error('service-graduation-check error', e);
    return json({ error: e.message || 'unknown error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
