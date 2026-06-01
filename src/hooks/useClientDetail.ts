import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { coreCrmKeys } from "./useCoreCrm";

export interface ClientDetailRow {
  id: string;
  company_id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string | null;
  date_of_birth: string | null;
  ssn_last4: string | null;
  status: string | null;
  is_active: boolean;
  tcpa_consent: boolean | null;
  notes: string | null;
  forth_crm_id: string | null;
  created_at: string;
}
export interface ClientServiceRow {
  id: string;
  service_number: string;
  status: string;
  program_type: string | null;
  plan_type: string | null;
  term_months: number | null;
  monthly_payment: number | null;
  total_enrolled_debt: number | null;
  escrow_balance: number | null;
  settlement_fee_percentage: number | null;
  enrolled_date: string | null;
  first_payment_date: string | null;
  created_at: string;
}
export interface ClientLiabilityRow {
  id: string;
  client_service_id: string;
  account_number: string | null;
  liability_type: string;
  original_balance: number | null;
  current_balance: number | null;
  enrolled_balance: number | null;
  status: string;
  notes: string | null;
}
export interface ClientPhoneRow {
  id: string;
  phone_number: string;
  phone_type: string;
  is_primary: boolean;
}
export interface ClientAddressRow {
  id: string;
  address_type: string;
  city: string;
  state: string;
  zip_code: string;
  is_primary: boolean;
}

export const clientKeys = {
  client: (id: string) => ["client", id] as const,
  services: (id: string) => ["client_services_for", id] as const,
  liabilities: (id: string) => ["client_liabilities", id] as const,
  phones: (id: string) => ["client_phones", id] as const,
  addresses: (id: string) => ["client_addresses", id] as const,
};

const CLIENT_COLS =
  "id, company_id, first_name, middle_name, last_name, email, date_of_birth, ssn_last4, status, is_active, tcpa_consent, notes, forth_crm_id, created_at";
const SERVICE_COLS =
  "id, service_number, status, program_type, plan_type, term_months, monthly_payment, total_enrolled_debt, escrow_balance, settlement_fee_percentage, enrolled_date, first_payment_date, created_at";

export function useClient(id: string | undefined): UseQueryResult<ClientDetailRow, Error> {
  return useQuery({
    queryKey: clientKeys.client(id ?? ""),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select(CLIENT_COLS)
        .eq("id", id!)
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as ClientDetailRow;
    },
  });
}

export function useClientServices(
  clientId: string | undefined,
): UseQueryResult<ClientServiceRow[], Error> {
  return useQuery({
    queryKey: clientKeys.services(clientId ?? ""),
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_services")
        .select(SERVICE_COLS)
        .eq("primary_client_id", clientId!)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ClientServiceRow[];
    },
  });
}

/** Liabilities across a client's engagements (queried by their service ids). */
export function useClientLiabilities(
  clientId: string | undefined,
  serviceIds: string[],
): UseQueryResult<ClientLiabilityRow[], Error> {
  return useQuery({
    queryKey: [...clientKeys.liabilities(clientId ?? ""), serviceIds.join(",")],
    enabled: !!clientId && serviceIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("liabilities")
        .select(
          "id, client_service_id, account_number, liability_type, original_balance, current_balance, enrolled_balance, status, notes",
        )
        .in("client_service_id", serviceIds)
        .order("current_balance", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ClientLiabilityRow[];
    },
  });
}

export function useClientPhones(
  clientId: string | undefined,
): UseQueryResult<ClientPhoneRow[], Error> {
  return useQuery({
    queryKey: clientKeys.phones(clientId ?? ""),
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_phones")
        .select("id, phone_number, phone_type, is_primary")
        .eq("client_id", clientId!)
        .eq("is_active", true);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ClientPhoneRow[];
    },
  });
}

export function useClientAddresses(
  clientId: string | undefined,
): UseQueryResult<ClientAddressRow[], Error> {
  return useQuery({
    queryKey: clientKeys.addresses(clientId ?? ""),
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_addresses")
        .select("id, address_type, city, state, zip_code, is_primary")
        .eq("client_id", clientId!)
        .eq("is_active", true);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ClientAddressRow[];
    },
  });
}

export interface ClientUpdateInput {
  id: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string | null;
  email?: string | null;
  status?: string;
  is_active?: boolean;
  notes?: string | null;
}

export function useUpdateClient(): UseMutationResult<void, Error, ClientUpdateInput> {
  const qc = useQueryClient();
  return useMutation<void, Error, ClientUpdateInput>({
    mutationFn: async ({ id, ...patch }) => {
      const { error } = await supabase.from("clients").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: clientKeys.client(vars.id) });
      qc.invalidateQueries({ queryKey: coreCrmKeys.clients });
    },
  });
}
