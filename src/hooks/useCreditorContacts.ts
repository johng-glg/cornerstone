import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CreditorContact {
  id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
}

export function useCreditorContacts(
  creditorId: string | undefined,
): UseQueryResult<CreditorContact[], Error> {
  return useQuery({
    queryKey: ["creditor_contacts", creditorId],
    enabled: !!creditorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("creditor_contacts")
        .select("id, first_name, last_name, title, email, phone")
        .eq("creditor_id", creditorId!)
        .eq("is_active", true)
        .order("last_name", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as CreditorContact[];
    },
  });
}

export interface NewContact {
  first_name: string;
  last_name: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
}
export function useAddCreditorContact(
  creditorId: string,
): UseMutationResult<void, Error, NewContact> {
  const qc = useQueryClient();
  return useMutation<void, Error, NewContact>({
    mutationFn: async (input) => {
      const { error } = await supabase.from("creditor_contacts").insert({
        creditor_id: creditorId,
        first_name: input.first_name,
        last_name: input.last_name,
        title: input.title || null,
        email: input.email || null,
        phone: input.phone || null,
        is_active: true,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["creditor_contacts", creditorId] }),
  });
}

export function useRemoveCreditorContact(
  creditorId: string,
): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from("creditor_contacts")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["creditor_contacts", creditorId] }),
  });
}
