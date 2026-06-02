import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MatterRow {
  id: string;
  case_number: string | null;
  court_name: string | null;
  county: string | null;
  state: string | null;
  opposing_party: string | null;
  opposing_counsel: string | null;
  status: string;
  service_date: string | null;
  response_deadline: string | null;
  next_hearing_date: string | null;
  judgment_amount: number | null;
  settlement_amount: number | null;
  notes: string | null;
  client_service_id: string;
  liability_id: string;
}
export interface HearingRow {
  id: string;
  hearing_type: string;
  scheduled_date: string | null;
  location: string | null;
  judge_name: string | null;
  outcome: string | null;
  notes: string | null;
}
export interface MatterActivityRow {
  id: string;
  activity_type: string;
  description: string | null;
  outcome: string | null;
  activity_date: string | null;
  created_at: string;
}
export interface MatterDocumentRow {
  id: string;
  document_type: string;
  title: string;
  file_url: string;
  filed_date: string | null;
  deadline_date: string | null;
}

export function useMatter(id: string | undefined): UseQueryResult<MatterRow, Error> {
  return useQuery({
    queryKey: ["matter", id ?? ""],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("litigation_matters")
        .select(
          "id, case_number, court_name, county, state, opposing_party, opposing_counsel, status, service_date, response_deadline, next_hearing_date, judgment_amount, settlement_amount, notes, client_service_id, liability_id",
        )
        .eq("id", id!)
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as MatterRow;
    },
  });
}

export function useMatterHearings(id: string | undefined): UseQueryResult<HearingRow[], Error> {
  return useQuery({
    queryKey: ["matter_hearings", id ?? ""],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("litigation_hearings")
        .select("id, hearing_type, scheduled_date, location, judge_name, outcome, notes")
        .eq("matter_id", id!)
        .order("scheduled_date", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as HearingRow[];
    },
  });
}

export function useMatterActivities(
  id: string | undefined,
): UseQueryResult<MatterActivityRow[], Error> {
  return useQuery({
    queryKey: ["matter_activities", id ?? ""],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("litigation_activities")
        .select("id, activity_type, description, outcome, activity_date, created_at")
        .eq("matter_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as MatterActivityRow[];
    },
  });
}

export interface FilingFeeRow {
  id: string;
  amount: number;
  description: string;
  status: string;
  requested_date: string | null;
  paid_date: string | null;
}
export function useFilingFees(id: string | undefined): UseQueryResult<FilingFeeRow[], Error> {
  return useQuery({
    queryKey: ["matter_fees", id ?? ""],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("filing_fees")
        .select("id, amount, description, status, requested_date, paid_date")
        .eq("matter_id", id!)
        .order("requested_date", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as FilingFeeRow[];
    },
  });
}

export function useMatterDocuments(
  id: string | undefined,
): UseQueryResult<MatterDocumentRow[], Error> {
  return useQuery({
    queryKey: ["matter_documents", id ?? ""],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("litigation_documents")
        .select("id, document_type, title, file_url, filed_date, deadline_date")
        .eq("matter_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as MatterDocumentRow[];
    },
  });
}
