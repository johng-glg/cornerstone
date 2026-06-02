import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

// Settings hub data: profile, notification preferences, and company info.

export interface ProfilePatch {
  first_name: string;
  last_name: string;
  job_title?: string | null;
}
export function useUpdateProfile(): UseMutationResult<void, Error, ProfilePatch> {
  const qc = useQueryClient();
  const { staff } = useAuth();
  return useMutation<void, Error, ProfilePatch>({
    mutationFn: async (input) => {
      if (!staff?.id) throw new Error("No staff profile.");
      const { error } = await supabase
        .from("staff")
        .update({
          first_name: input.first_name,
          last_name: input.last_name,
          job_title: input.job_title || null,
        })
        .eq("id", staff.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff_all"] }),
  });
}

export const NOTIFICATION_TYPES = [
  "task_assigned",
  "task_due_soon",
  "task_overdue",
  "lead_assigned",
  "matter_assigned",
  "hearing_reminder",
  "settlement_update",
  "mention",
  "system_alert",
  "response_deadline_reminder",
];

export interface NotificationPref {
  notification_type: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
}

export function useNotificationPrefs(): UseQueryResult<NotificationPref[], Error> {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notification_prefs", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("notification_type, in_app_enabled, email_enabled")
        .eq("user_id", user!.id);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as NotificationPref[];
    },
  });
}

export function useUpsertNotificationPref(): UseMutationResult<void, Error, NotificationPref> {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation<void, Error, NotificationPref>({
    mutationFn: async (pref) => {
      if (!user?.id) throw new Error("Not signed in.");
      const { error } = await supabase.from("notification_preferences").upsert(
        {
          user_id: user.id,
          notification_type: pref.notification_type,
          in_app_enabled: pref.in_app_enabled,
          email_enabled: pref.email_enabled,
        },
        { onConflict: "user_id,notification_type" },
      );
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notification_prefs", user?.id] }),
  });
}

export interface ReminderSettings {
  id: string | null;
  response_deadline_days: number[];
  hearing_days: number[];
  task_due_days: number[];
  reminder_hour: number;
  is_active: boolean;
}
export function useReminderSettings(): UseQueryResult<ReminderSettings | null, Error> {
  const { staff } = useAuth();
  return useQuery({
    queryKey: ["reminder_settings", staff?.company_id],
    enabled: !!staff?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reminder_settings")
        .select("id, response_deadline_days, hearing_days, task_due_days, reminder_hour, is_active")
        .eq("company_id", staff!.company_id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? null) as unknown as ReminderSettings | null;
    },
  });
}
export function useSaveReminderSettings(): UseMutationResult<void, Error, ReminderSettings> {
  const qc = useQueryClient();
  const { staff } = useAuth();
  return useMutation<void, Error, ReminderSettings>({
    mutationFn: async (input) => {
      if (!staff?.company_id) throw new Error("No active company.");
      const payload = {
        company_id: staff.company_id,
        response_deadline_days: input.response_deadline_days,
        hearing_days: input.hearing_days,
        task_due_days: input.task_due_days,
        reminder_hour: input.reminder_hour,
        is_active: input.is_active,
      };
      const { error } = input.id
        ? await supabase.from("reminder_settings").update(payload).eq("id", input.id)
        : await supabase.from("reminder_settings").insert(payload);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminder_settings"] }),
  });
}

export interface NsfPolicy {
  id: string;
  name: string;
  max_attempts: number;
  delay_pattern: number[];
  is_active: boolean;
}
export function useNsfPolicies(): UseQueryResult<NsfPolicy[], Error> {
  const { staff } = useAuth();
  return useQuery({
    queryKey: ["nsf_policies", staff?.company_id],
    enabled: !!staff?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nsf_retry_policies")
        .select("id, name, max_attempts, delay_pattern, is_active")
        .eq("company_id", staff!.company_id)
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as NsfPolicy[];
    },
  });
}
export interface NsfPolicyInput {
  id?: string | null;
  name: string;
  max_attempts: number;
  delay_pattern: number[];
  is_active: boolean;
}
export function useSaveNsfPolicy(): UseMutationResult<void, Error, NsfPolicyInput> {
  const qc = useQueryClient();
  const { staff } = useAuth();
  return useMutation<void, Error, NsfPolicyInput>({
    mutationFn: async (input) => {
      if (!staff?.company_id) throw new Error("No active company.");
      const payload = {
        company_id: staff.company_id,
        name: input.name,
        max_attempts: input.max_attempts,
        delay_pattern: input.delay_pattern,
        is_active: input.is_active,
      };
      const { error } = input.id
        ? await supabase.from("nsf_retry_policies").update(payload).eq("id", input.id)
        : await supabase.from("nsf_retry_policies").insert(payload);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nsf_policies"] }),
  });
}

export interface CompanyInfo {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
}
export function useMyCompany(): UseQueryResult<CompanyInfo | null, Error> {
  const { staff } = useAuth();
  return useQuery({
    queryKey: ["my_company", staff?.company_id],
    enabled: !!staff?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, city, state")
        .eq("id", staff!.company_id)
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as CompanyInfo;
    },
  });
}

export function useUpdateCompany(): UseMutationResult<
  void,
  Error,
  { id: string; name: string; city?: string | null; state?: string | null }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input) => {
      const { error } = await supabase
        .from("companies")
        .update({ name: input.name, city: input.city || null, state: input.state || null })
        .eq("id", input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my_company"] });
      qc.invalidateQueries({ queryKey: ["companies_all"] });
    },
  });
}
