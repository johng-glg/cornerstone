import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface RenderRequest {
  template_id?: string;
  template_content?: string;
  template_subject?: string;
  entity_type: string;
  entity_id: string;
  additional_data?: Record<string, string>;
  channel?: string;
  log_usage?: boolean;
}

interface RenderResponse {
  content: string;
  subject: string | null;
  missing_fields: string[];
}

const MERGE_FIELD_MAP: Record<string, (data: Record<string, unknown>) => string | null> = {
  '{lead.first_name}': (d) => (d.first_name as string) || null,
  '{lead.last_name}': (d) => (d.last_name as string) || null,
  '{lead.full_name}': (d) => [d.first_name, d.last_name].filter(Boolean).join(' ') || null,
  '{lead.email}': (d) => (d.email as string) || null,
  '{lead.phone}': (d) => (d.phone as string) || null,
  '{lead.lead_number}': (d) => (d.lead_number as string) || null,
  '{lead.estimated_debt}': (d) => d.estimated_debt_amount ? formatCurrency(d.estimated_debt_amount as number) : null,
  '{lead.status}': (d) => (d.status as string) || null,
  '{client.first_name}': (d) => (d.first_name as string) || null,
  '{client.last_name}': (d) => (d.last_name as string) || null,
  '{client.full_name}': (d) => [d.first_name, d.last_name].filter(Boolean).join(' ') || null,
  '{client.email}': (d) => (d.email as string) || null,
  '{client.date_of_birth}': (d) => d.date_of_birth ? formatDate(d.date_of_birth as string) : null,
  '{client.primary_phone}': (d) => (d.primary_phone as string) || null,
  '{client.primary_address}': (d) => (d.primary_address as string) || null,
  '{service.service_number}': (d) => (d.service_number as string) || null,
  '{service.status}': (d) => (d.status as string) || null,
  '{service.plan_type}': (d) => (d.plan_type as string) || null,
  '{service.enrolled_date}': (d) => d.enrolled_date ? formatDate(d.enrolled_date as string) : null,
  '{service.monthly_payment}': (d) => d.monthly_payment ? formatCurrency(d.monthly_payment as number) : null,
  '{service.escrow_balance}': (d) => d.escrow_balance ? formatCurrency(d.escrow_balance as number) : null,
  '{service.total_enrolled_debt}': (d) => d.total_enrolled_debt ? formatCurrency(d.total_enrolled_debt as number) : null,
  '{liability.creditor_name}': (d) => (d.creditor_name as string) || null,
  '{liability.account_number}': (d) => d.account_number_last4 ? `****${d.account_number_last4}` : null,
  '{liability.current_balance}': (d) => d.current_balance ? formatCurrency(d.current_balance as number) : null,
  '{liability.enrolled_balance}': (d) => d.enrolled_balance ? formatCurrency(d.enrolled_balance as number) : null,
  '{liability.status}': (d) => (d.status as string) || null,
  '{settlement.offer_amount}': (d) => d.offer_amount ? formatCurrency(d.offer_amount as number) : null,
  '{settlement.savings_amount}': (d) => d.savings_amount ? formatCurrency(d.savings_amount as number) : null,
  '{settlement.savings_percentage}': (d) => d.savings_percentage ? `${d.savings_percentage}%` : null,
  '{settlement.payment_schedule}': (d) => (d.payment_schedule as string) || null,
  '{company.name}': (d) => (d.name as string) || null,
  '{company.phone}': (d) => (d.phone as string) || null,
  '{company.email}': (d) => (d.email as string) || null,
  '{company.address}': (d) => formatAddress(d) || null,
  '{company.website}': (d) => (d.website as string) || null,
  '{staff.first_name}': (d) => (d.first_name as string) || null,
  '{staff.last_name}': (d) => (d.last_name as string) || null,
  '{staff.full_name}': (d) => [d.first_name, d.last_name].filter(Boolean).join(' ') || null,
  '{staff.email}': (d) => (d.email as string) || null,
  '{staff.title}': (d) => (d.department as string) || null,
  '{today}': () => formatDateLong(new Date().toISOString()),
  '{current_date}': () => formatDate(new Date().toISOString()),
  '{current_time}': () => formatTime(new Date().toISOString()),
  '{current_year}': () => new Date().getFullYear().toString(),
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}
function formatDate(dateStr: string): string {
  try { return new Date(dateStr).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }); }
  catch { return dateStr; }
}
function formatDateLong(dateStr: string): string {
  try { return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); }
  catch { return dateStr; }
}
function formatTime(dateStr: string): string {
  try { return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }); }
  catch { return dateStr; }
}
function formatAddress(data: Record<string, unknown>): string | null {
  const parts = [
    data.address_line1,
    data.address_line2,
    [data.city, data.state, data.zip_code].filter(Boolean).join(', ')
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

// Resolve a path like "client.first_name" or "estimated_debt" from a context.
function resolveValue(path: string, contexts: Record<string, Record<string, unknown>>): unknown {
  const parts = path.trim().split('.');
  if (parts.length === 1) {
    // Search every context for a top-level key match.
    for (const ctx of Object.values(contexts)) {
      if (ctx && parts[0] in ctx) return ctx[parts[0]];
    }
    return undefined;
  }
  const [root, ...rest] = parts;
  let value: unknown = contexts[root];
  for (const key of rest) {
    if (value && typeof value === 'object' && key in (value as Record<string, unknown>)) {
      value = (value as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return value;
}

function evalCondition(expr: string, contexts: Record<string, Record<string, unknown>>): boolean {
  // Supported forms: "path", "path op value" with op in == != > < >= <=
  const m = expr.trim().match(/^(\S+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
  if (!m) {
    const v = resolveValue(expr.trim(), contexts);
    return Boolean(v);
  }
  const [, path, op, rawRhs] = m;
  const lhs = resolveValue(path, contexts);
  let rhs: unknown = rawRhs.trim().replace(/^['"]|['"]$/g, '');
  if (!isNaN(Number(rhs as string))) rhs = Number(rhs);
  if (rhs === 'true') rhs = true;
  if (rhs === 'false') rhs = false;
  switch (op) {
    case '==': return lhs == rhs;
    case '!=': return lhs != rhs;
    case '>': return Number(lhs) > Number(rhs);
    case '<': return Number(lhs) < Number(rhs);
    case '>=': return Number(lhs) >= Number(rhs);
    case '<=': return Number(lhs) <= Number(rhs);
    default: return false;
  }
}

// Process {#each path}...{/each} blocks (innermost first).
function processEachBlocks(template: string, contexts: Record<string, Record<string, unknown>>): string {
  const eachRe = /\{#each\s+([^}]+)\}([\s\S]*?)\{\/each\}/;
  let out = template;
  let safety = 0;
  while (eachRe.test(out) && safety++ < 50) {
    out = out.replace(eachRe, (_full, path: string, body: string) => {
      const list = resolveValue(path.trim(), contexts);
      if (!Array.isArray(list)) return '';
      return list.map((item) => {
        const itemContext = { ...contexts, this: item as Record<string, unknown>, item: item as Record<string, unknown> };
        return processEachBlocks(body, itemContext);
      }).join('');
    });
  }
  return out;
}

// Process {#if expr}...{else}...{/if} blocks.
function processIfBlocks(template: string, contexts: Record<string, Record<string, unknown>>): string {
  const ifRe = /\{#if\s+([^}]+)\}([\s\S]*?)\{\/if\}/;
  let out = template;
  let safety = 0;
  while (ifRe.test(out) && safety++ < 50) {
    out = out.replace(ifRe, (_full, expr: string, body: string) => {
      const elseIdx = body.indexOf('{else}');
      const truthy = elseIdx >= 0 ? body.slice(0, elseIdx) : body;
      const falsy = elseIdx >= 0 ? body.slice(elseIdx + '{else}'.length) : '';
      return evalCondition(expr, contexts) ? truthy : falsy;
    });
  }
  return out;
}

function extractMergeFields(content: string): string[] {
  const regex = /\{[a-z_.]+\}/g;
  const matches = content.match(regex) || [];
  return [...new Set(matches)];
}

function renderMergeFields(
  content: string,
  entityData: Record<string, unknown>,
  companyData: Record<string, unknown>,
  staffData: Record<string, unknown>,
  additionalData: Record<string, string>,
  contexts: Record<string, Record<string, unknown>>
): { rendered: string; missing: string[] } {
  let rendered = content;
  const missing: string[] = [];
  const fields = extractMergeFields(content);

  for (const field of fields) {
    let value: string | null = null;
    if (additionalData[field]) {
      value = additionalData[field];
    } else if (MERGE_FIELD_MAP[field]) {
      let dataSource: Record<string, unknown> = {};
      if (field.startsWith('{lead.') || field.startsWith('{client.') ||
          field.startsWith('{service.') || field.startsWith('{liability.') ||
          field.startsWith('{settlement.')) {
        dataSource = entityData;
      } else if (field.startsWith('{company.')) dataSource = companyData;
      else if (field.startsWith('{staff.')) dataSource = staffData;
      value = MERGE_FIELD_MAP[field](dataSource);
    } else {
      // Try generic resolution (e.g. {this.amount} in an each loop)
      const inner = field.slice(1, -1);
      const v = resolveValue(inner, contexts);
      if (v !== undefined && v !== null) value = String(v);
    }

    if (value !== null) rendered = rendered.split(field).join(value);
    else missing.push(field);
  }
  return { rendered, missing };
}

function renderContent(
  content: string,
  entityData: Record<string, unknown>,
  companyData: Record<string, unknown>,
  staffData: Record<string, unknown>,
  additionalData: Record<string, string>
): { rendered: string; missing: string[] } {
  const contexts: Record<string, Record<string, unknown>> = {
    lead: entityData, client: entityData, service: entityData,
    liability: entityData, settlement: entityData,
    company: companyData, staff: staffData,
  };
  // Process blocks before merge fields so inner fields get filled.
  let processed = processEachBlocks(content, contexts);
  processed = processIfBlocks(processed, contexts);
  return renderMergeFields(processed, entityData, companyData, staffData, additionalData, contexts);
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body: RenderRequest = await req.json();
    const { template_id, template_content, template_subject, entity_type, entity_id, additional_data = {}, channel, log_usage } = body;

    if (!entity_type || !entity_id) {
      return new Response(JSON.stringify({ error: 'entity_type and entity_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let content = template_content || '';
    let subject = template_subject || null;

    if (template_id) {
      const { data: template, error: templateError } = await supabase
        .from('templates').select('content, subject').eq('id', template_id).single();
      if (templateError) {
        return new Response(JSON.stringify({ error: 'Template not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      content = template.content;
      subject = template.subject;
    }

    let entityData: Record<string, unknown> = {};
    let companyId: string | null = null;

    switch (entity_type) {
      case 'lead': {
        const { data, error } = await supabase.from('leads').select('*').eq('id', entity_id).single();
        if (!error && data) { entityData = data; companyId = data.company_id; }
        break;
      }
      case 'client': {
        const { data, error } = await supabase.from('clients')
          .select('*, client_phones(*), client_addresses(*)').eq('id', entity_id).single();
        if (!error && data) {
          const phones = data.client_phones as Array<Record<string, unknown>> | null;
          const addresses = data.client_addresses as Array<Record<string, unknown>> | null;
          const primaryPhone = phones?.find((p) => p.is_primary);
          const primaryAddress = addresses?.find((a) => a.is_primary);
          entityData = {
            ...data,
            primary_phone: primaryPhone?.phone_number || null,
            primary_address: primaryAddress ? formatAddress(primaryAddress) : null,
          };
          companyId = data.company_id;
        }
        break;
      }
      case 'service': {
        const { data, error } = await supabase.from('client_services').select('*').eq('id', entity_id).single();
        if (!error && data) { entityData = data; companyId = data.owning_company_id; }
        break;
      }
      case 'liability': {
        const { data, error } = await supabase.from('liabilities')
          .select('*, creditor:creditors(name)').eq('id', entity_id).single();
        if (!error && data) {
          entityData = { ...data,
            creditor_name: (data.creditor as Record<string, unknown>)?.name || data.original_creditor_name || null };
        }
        break;
      }
      case 'settlement': {
        const { data, error } = await supabase.from('settlements').select('*').eq('id', entity_id).single();
        if (!error && data) entityData = data;
        break;
      }
    }

    let companyData: Record<string, unknown> = {};
    if (companyId) {
      const { data } = await supabase.from('companies').select('*').eq('id', companyId).single();
      if (data) companyData = data;
    }

    const authHeader = req.headers.get('Authorization');
    let staffData: Record<string, unknown> = {};
    let staffId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: userData } = await supabase.auth.getUser(token);
      if (userData?.user) {
        const { data } = await supabase.from('staff').select('*').eq('user_id', userData.user.id).single();
        if (data) { staffData = data; staffId = data.id; }
      }
    }

    const contentResult = renderContent(content, entityData, companyData, staffData, additional_data);
    const subjectResult = subject
      ? renderContent(subject, entityData, companyData, staffData, additional_data)
      : { rendered: null, missing: [] };

    const response: RenderResponse = {
      content: contentResult.rendered,
      subject: subjectResult.rendered,
      missing_fields: [...new Set([...contentResult.missing, ...subjectResult.missing])],
    };

    // Usage logging (best-effort)
    if (template_id && log_usage !== false) {
      await supabase.from('template_usage').insert({
        template_id,
        entity_type,
        entity_id,
        used_by: staffId,
        channel: channel || null,
        success: true,
      });
    }

    return new Response(JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    const error = err as Error;
    console.error('Error in render-template:', error);
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
