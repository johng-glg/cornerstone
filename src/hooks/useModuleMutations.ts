import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

// Write hooks for the interactive module actions. Each invalidates the matching read query.

export interface NewCommunication {
  communication_type: string;
  direction: string;
  subject?: string | null;
  notes?: string | null;
  outcome?: string | null;
}
export function useAddCommunication(
  clientId: string,
): UseMutationResult<void, Error, NewCommunication> {
  const qc = useQueryClient();
  const { staff } = useAuth();
  return useMutation<void, Error, NewCommunication>({
    mutationFn: async (input) => {
      const { error } = await supabase.from("client_communications").insert({
        client_id: clientId,
        staff_id: staff?.id ?? null,
        communication_date: new Date().toISOString(),
        ...input,
        subject: input.subject || null,
        notes: input.notes || null,
        outcome: input.outcome || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client_comms", clientId] }),
  });
}

export interface NewClientDocument {
  title: string;
  document_type: string;
  file_url: string;
  notes?: string | null;
}
export function useAddClientDocument(
  clientId: string,
): UseMutationResult<void, Error, NewClientDocument> {
  const qc = useQueryClient();
  const { staff } = useAuth();
  return useMutation<void, Error, NewClientDocument>({
    mutationFn: async (input) => {
      const { error } = await supabase.from("client_documents").insert({
        client_id: clientId,
        uploaded_by: staff?.id ?? null,
        ...input,
        notes: input.notes || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client_documents_list", clientId] }),
  });
}

export interface NewCreditor {
  name: string;
  creditor_type: string;
  phone?: string | null;
  email?: string | null;
  state?: string | null;
}
export function useAddCreditor(): UseMutationResult<void, Error, NewCreditor> {
  const qc = useQueryClient();
  return useMutation<void, Error, NewCreditor>({
    mutationFn: async (input) => {
      const { error } = await supabase.from("creditors").insert({
        ...input,
        phone: input.phone || null,
        email: input.email || null,
        state: input.state || null,
        is_active: true,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["creditors"] }),
  });
}

export interface NewBillingEntry {
  entry_type: string;
  description: string;
  total_amount: number;
  is_billable: boolean;
}
export function useAddBillingEntry(): UseMutationResult<void, Error, NewBillingEntry> {
  const qc = useQueryClient();
  const { staff } = useAuth();
  return useMutation<void, Error, NewBillingEntry>({
    mutationFn: async (input) => {
      if (!staff?.company_id || !staff?.id) throw new Error("No staff profile.");
      const { error } = await supabase.from("billing_entries").insert({
        company_id: staff.company_id,
        staff_id: staff.id,
        ...input,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["billing_all"] }),
  });
}

export interface NewHearing {
  hearing_type: string;
  scheduled_date?: string | null;
  location?: string | null;
  judge_name?: string | null;
  notes?: string | null;
}
export function useAddHearing(matterId: string): UseMutationResult<void, Error, NewHearing> {
  const qc = useQueryClient();
  return useMutation<void, Error, NewHearing>({
    mutationFn: async (input) => {
      const { error } = await supabase.from("litigation_hearings").insert({
        matter_id: matterId,
        ...input,
        scheduled_date: input.scheduled_date || null,
        location: input.location || null,
        judge_name: input.judge_name || null,
        notes: input.notes || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["matter_hearings", matterId] }),
  });
}

export interface NewMatterActivity {
  activity_type: string;
  description?: string | null;
  outcome?: string | null;
}
export function useAddMatterActivity(
  matterId: string,
): UseMutationResult<void, Error, NewMatterActivity> {
  const qc = useQueryClient();
  const { staff } = useAuth();
  return useMutation<void, Error, NewMatterActivity>({
    mutationFn: async (input) => {
      const { error } = await supabase.from("litigation_activities").insert({
        matter_id: matterId,
        staff_id: staff?.id ?? null,
        activity_date: new Date().toISOString(),
        ...input,
        description: input.description || null,
        outcome: input.outcome || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["matter_activities", matterId] }),
  });
}
