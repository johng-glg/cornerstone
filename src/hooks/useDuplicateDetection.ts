import { supabase } from '@/integrations/supabase/client';

export interface DuplicateMatch {
  id: string;
  type: 'lead' | 'client';
  matchType: string; // Can be combined: 'email, phone'
  name: string;
  email?: string;
  phone?: string;
  status?: string;
  created_at: string;
  confidence: 'high' | 'medium';
  leadNumber?: string;
  serviceNumber?: string;
}

export interface DuplicateCheckOptions {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  ssnLast4?: string;
  excludeLeadId?: string;
}

// Normalize phone to last 10 digits
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.slice(-10);
}

// Deduplicate matches - combine match types for same record
function deduplicateMatches(matches: DuplicateMatch[]): DuplicateMatch[] {
  const seen = new Map<string, DuplicateMatch>();

  for (const match of matches) {
    const key = `${match.type}-${match.id}`;
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, match);
    } else {
      // Combine match types and keep highest confidence
      const combinedMatchTypes = new Set([
        ...existing.matchType.split(', '),
        ...match.matchType.split(', '),
      ]);
      seen.set(key, {
        ...existing,
        matchType: Array.from(combinedMatchTypes).join(', '),
        confidence: match.confidence === 'high' ? 'high' : existing.confidence,
      });
    }
  }

  return Array.from(seen.values());
}

// Check leads table for duplicates
async function checkLeadDuplicates(options: DuplicateCheckOptions): Promise<DuplicateMatch[]> {
  const { email, phone, firstName, lastName, excludeLeadId } = options;
  const matches: DuplicateMatch[] = [];

  // Email match (high confidence)
  if (email && email.trim()) {
    const { data: emailMatches } = await supabase
      .from('leads')
      .select('id, first_name, last_name, email, phone, status, created_at, lead_number')
      .ilike('email', email.trim())
      .neq('id', excludeLeadId || '')
      .limit(5);

    if (emailMatches) {
      for (const lead of emailMatches) {
        matches.push({
          id: lead.id,
          type: 'lead',
          matchType: 'email',
          name: `${lead.first_name} ${lead.last_name}`,
          email: lead.email || undefined,
          phone: lead.phone || undefined,
          status: lead.status,
          created_at: lead.created_at,
          confidence: 'high',
          leadNumber: lead.lead_number,
        });
      }
    }
  }

  // Phone match (high confidence)
  if (phone && phone.trim()) {
    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone.length >= 7) {
      const { data: phoneMatches } = await supabase
        .from('leads')
        .select('id, first_name, last_name, email, phone, status, created_at, lead_number')
        .ilike('phone', `%${normalizedPhone}%`)
        .neq('id', excludeLeadId || '')
        .limit(5);

      if (phoneMatches) {
        for (const lead of phoneMatches) {
          // Double-check phone match after normalization
          const leadNormalizedPhone = lead.phone ? normalizePhone(lead.phone) : '';
          if (leadNormalizedPhone === normalizedPhone) {
            matches.push({
              id: lead.id,
              type: 'lead',
              matchType: 'phone',
              name: `${lead.first_name} ${lead.last_name}`,
              email: lead.email || undefined,
              phone: lead.phone || undefined,
              status: lead.status,
              created_at: lead.created_at,
              confidence: 'high',
              leadNumber: lead.lead_number,
            });
          }
        }
      }
    }
  }

  // Name match (medium confidence)
  if (firstName?.trim() && lastName?.trim()) {
    const { data: nameMatches } = await supabase
      .from('leads')
      .select('id, first_name, last_name, email, phone, status, created_at, lead_number')
      .ilike('first_name', firstName.trim())
      .ilike('last_name', lastName.trim())
      .neq('id', excludeLeadId || '')
      .limit(5);

    if (nameMatches) {
      for (const lead of nameMatches) {
        matches.push({
          id: lead.id,
          type: 'lead',
          matchType: 'name',
          name: `${lead.first_name} ${lead.last_name}`,
          email: lead.email || undefined,
          phone: lead.phone || undefined,
          status: lead.status,
          created_at: lead.created_at,
          confidence: 'medium',
          leadNumber: lead.lead_number,
        });
      }
    }
  }

  return matches;
}

// Check clients table for duplicates
async function checkClientDuplicates(options: DuplicateCheckOptions): Promise<DuplicateMatch[]> {
  const { email, phone, firstName, lastName } = options;
  const matches: DuplicateMatch[] = [];

  // Email match (high confidence)
  if (email && email.trim()) {
    const { data: emailMatches } = await supabase
      .from('clients')
      .select(`
        id, first_name, last_name, email, created_at, status,
        client_phones(phone_number, is_primary),
        client_services:client_service_clients(
          client_service:client_services(service_number, status)
        )
      `)
      .ilike('email', email.trim())
      .eq('is_active', true)
      .limit(5);

    if (emailMatches) {
      for (const client of emailMatches) {
        const primaryPhone = client.client_phones?.find((p: any) => p.is_primary)?.phone_number;
        const activeService = client.client_services?.find(
          (cs: any) => cs.client_service?.status === 'active'
        );
        
        matches.push({
          id: client.id,
          type: 'client',
          matchType: 'email',
          name: `${client.first_name} ${client.last_name}`,
          email: client.email || undefined,
          phone: primaryPhone,
          status: client.status || undefined,
          created_at: client.created_at,
          confidence: 'high',
          serviceNumber: activeService?.client_service?.service_number,
        });
      }
    }
  }

  // Phone match (high confidence) - need to join with client_phones
  if (phone && phone.trim()) {
    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone.length >= 7) {
      const { data: phoneMatches } = await supabase
        .from('client_phones')
        .select(`
          phone_number,
          client:clients(
            id, first_name, last_name, email, created_at, status, is_active,
            client_services:client_service_clients(
              client_service:client_services(service_number, status)
            )
          )
        `)
        .ilike('phone_number', `%${normalizedPhone}%`)
        .limit(10);

      if (phoneMatches) {
        for (const result of phoneMatches) {
          const client = result.client as any;
          if (!client || !client.is_active) continue;
          
          // Double-check phone match
          const resultNormalizedPhone = normalizePhone(result.phone_number);
          if (resultNormalizedPhone !== normalizedPhone) continue;

          const activeService = client.client_services?.find(
            (cs: any) => cs.client_service?.status === 'active'
          );

          matches.push({
            id: client.id,
            type: 'client',
            matchType: 'phone',
            name: `${client.first_name} ${client.last_name}`,
            email: client.email || undefined,
            phone: result.phone_number,
            status: client.status || undefined,
            created_at: client.created_at,
            confidence: 'high',
            serviceNumber: activeService?.client_service?.service_number,
          });
        }
      }
    }
  }

  // Name match (medium confidence)
  if (firstName?.trim() && lastName?.trim()) {
    const { data: nameMatches } = await supabase
      .from('clients')
      .select(`
        id, first_name, last_name, email, created_at, status,
        client_phones(phone_number, is_primary),
        client_services:client_service_clients(
          client_service:client_services(service_number, status)
        )
      `)
      .ilike('first_name', firstName.trim())
      .ilike('last_name', lastName.trim())
      .eq('is_active', true)
      .limit(5);

    if (nameMatches) {
      for (const client of nameMatches) {
        const primaryPhone = client.client_phones?.find((p: any) => p.is_primary)?.phone_number;
        const activeService = client.client_services?.find(
          (cs: any) => cs.client_service?.status === 'active'
        );

        matches.push({
          id: client.id,
          type: 'client',
          matchType: 'name',
          name: `${client.first_name} ${client.last_name}`,
          email: client.email || undefined,
          phone: primaryPhone,
          status: client.status || undefined,
          created_at: client.created_at,
          confidence: 'medium',
          serviceNumber: activeService?.client_service?.service_number,
        });
      }
    }
  }

  return matches;
}

// Main function to check for duplicates
export async function checkForDuplicates(
  options: DuplicateCheckOptions
): Promise<DuplicateMatch[]> {
  // Run both checks in parallel
  const [leadMatches, clientMatches] = await Promise.all([
    checkLeadDuplicates(options),
    checkClientDuplicates(options),
  ]);

  // Combine and deduplicate
  const allMatches = [...leadMatches, ...clientMatches];
  const deduped = deduplicateMatches(allMatches);

  // Sort by confidence (high first) then by created_at (recent first)
  return deduped.sort((a, b) => {
    if (a.confidence !== b.confidence) {
      return a.confidence === 'high' ? -1 : 1;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

// Check only for client duplicates (for enrollment wizard)
export async function checkClientEmailDuplicate(
  email: string
): Promise<DuplicateMatch | null> {
  if (!email?.trim()) return null;

  const { data: clients } = await supabase
    .from('clients')
    .select(`
      id, first_name, last_name, email, created_at, status,
      client_services:client_service_clients(
        client_service:client_services(service_number, status)
      )
    `)
    .ilike('email', email.trim())
    .eq('is_active', true)
    .limit(1);

  if (clients && clients.length > 0) {
    const client = clients[0];
    const activeService = client.client_services?.find(
      (cs: any) => cs.client_service?.status === 'active'
    );

    return {
      id: client.id,
      type: 'client',
      matchType: 'email',
      name: `${client.first_name} ${client.last_name}`,
      email: client.email || undefined,
      status: client.status || undefined,
      created_at: client.created_at,
      confidence: 'high',
      serviceNumber: activeService?.client_service?.service_number,
    };
  }

  return null;
}
