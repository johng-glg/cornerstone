import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  LitigationMatterListRow,
  TemplateListRow,
  SignatureRequestListRow,
  NotificationListRow,
} from "@/lib/db-types";

/**
 * Read hooks for the domains that landed after the core CRM (A8 litigation, A10 templates /
 * signatures / notifications). Each fetches a company- or user-scoped list; RLS enforces
 * tenant/user isolation server-side, so these hooks never filter by company/user themselves.
 * Column projections match the row types in db-types.ts.
 */

export const domainKeys = {
  litigationMatters: ["litigation_matters"] as const,
  templates: ["templates"] as const,
  signatureRequests: ["signature_requests"] as const,
  notifications: ["notifications"] as const,
};

const LITIGATION_MATTER_COLS =
  "id, client_service_id, liability_id, case_number, court_name, state, opposing_party, status, response_deadline, next_hearing_date, created_at";
const TEMPLATE_COLS =
  "id, company_id, name, template_type, language, is_active, current_version, updated_at";
const SIGNATURE_REQUEST_COLS =
  "id, company_id, title, entity_type, status, completed_at, created_at";
const NOTIFICATION_COLS = "id, user_id, type, title, message, link, is_read, created_at";

async function fetchList<T>(table: string, columns: string, orderBy = "created_at"): Promise<T[]> {
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .order(orderBy, { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as T[];
}

export function useLitigationMatters(): UseQueryResult<LitigationMatterListRow[], Error> {
  return useQuery({
    queryKey: domainKeys.litigationMatters,
    queryFn: () => fetchList<LitigationMatterListRow>("litigation_matters", LITIGATION_MATTER_COLS),
  });
}

export function useTemplates(): UseQueryResult<TemplateListRow[], Error> {
  return useQuery({
    queryKey: domainKeys.templates,
    queryFn: () => fetchList<TemplateListRow>("templates", TEMPLATE_COLS, "updated_at"),
  });
}

export function useSignatureRequests(): UseQueryResult<SignatureRequestListRow[], Error> {
  return useQuery({
    queryKey: domainKeys.signatureRequests,
    queryFn: () => fetchList<SignatureRequestListRow>("signature_requests", SIGNATURE_REQUEST_COLS),
  });
}

export function useNotifications(): UseQueryResult<NotificationListRow[], Error> {
  return useQuery({
    queryKey: domainKeys.notifications,
    queryFn: () => fetchList<NotificationListRow>("notifications", NOTIFICATION_COLS),
  });
}

/** Mark a single notification read (default) or unread. RLS: `Users can update own notifications`. */
export function useMarkNotificationRead(): UseMutationResult<
  void,
  Error,
  { id: string; isRead?: boolean }
> {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string; isRead?: boolean }>({
    mutationFn: async ({ id, isRead = true }) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: isRead })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: domainKeys.notifications });
    },
  });
}

/** Mark every unread notification read in one round-trip. */
export function useMarkAllNotificationsRead(): UseMutationResult<void, Error, void> {
  const qc = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("is_read", false);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: domainKeys.notifications });
    },
  });
}
