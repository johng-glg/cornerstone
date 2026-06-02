import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Company/tenant-scoped list hooks for the broader module pages. RLS enforces tenant
// visibility server-side, so these never filter by company themselves. Projections are
// hand-authored (see db-types.ts rationale).

async function list<T>(
  table: string,
  cols: string,
  orderBy = "created_at",
  asc = false,
): Promise<T[]> {
  const { data, error } = await supabase
    .from(table)
    .select(cols)
    .order(orderBy, { ascending: asc });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as T[];
}

export interface CreditorRow {
  id: string;
  name: string;
  creditor_type: string | null;
  phone: string | null;
  email: string | null;
  state: string | null;
  is_active: boolean;
}
export const useCreditors = (): UseQueryResult<CreditorRow[], Error> =>
  useQuery({
    queryKey: ["creditors"],
    queryFn: () =>
      list<CreditorRow>(
        "creditors",
        "id, name, creditor_type, phone, email, state, is_active",
        "name",
        true,
      ),
  });

export interface TaskListRow {
  id: string;
  title: string;
  task_type: string;
  priority: string;
  status: string;
  due_date: string | null;
  entity_type: string | null;
}
export const useTasksList = (): UseQueryResult<TaskListRow[], Error> =>
  useQuery({
    queryKey: ["tasks_all"],
    queryFn: () =>
      list<TaskListRow>("tasks", "id, title, task_type, priority, status, due_date, entity_type"),
  });

export interface BillingListRow {
  id: string;
  entry_type: string;
  description: string;
  billing_date: string;
  total_amount: number;
  is_billable: boolean;
  status: string;
}
export const useBillingList = (): UseQueryResult<BillingListRow[], Error> =>
  useQuery({
    queryKey: ["billing_all"],
    queryFn: () =>
      list<BillingListRow>(
        "billing_entries",
        "id, entry_type, description, billing_date, total_amount, is_billable, status",
        "billing_date",
      ),
  });

export interface PaymentListRow {
  id: string;
  amount: number;
  transaction_type: string;
  status: string;
  scheduled_date: string | null;
  processed_at: string | null;
  plsa_provider_id: string;
}
export const usePaymentsList = (): UseQueryResult<PaymentListRow[], Error> =>
  useQuery({
    queryKey: ["payments_all"],
    queryFn: () =>
      list<PaymentListRow>(
        "transactions",
        "id, amount, transaction_type, status, scheduled_date, processed_at, plsa_provider_id",
        "scheduled_date",
      ),
  });

export interface EligibilityReviewRow {
  id: string;
  lead_id: string;
  status: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  decline_reason: string | null;
}
export const useEligibilityReviews = (): UseQueryResult<EligibilityReviewRow[], Error> =>
  useQuery({
    queryKey: ["eligibility_reviews"],
    queryFn: () =>
      list<EligibilityReviewRow>(
        "eligibility_reviews",
        "id, lead_id, status, submitted_at, reviewed_at, decline_reason",
      ),
  });

export interface FeatureRequestRow {
  id: string;
  title: string;
  category: string | null;
  request_type: string | null;
  priority: string | null;
  status: string;
  staff_name: string | null;
  votes: number | null;
  created_at: string;
}
export const useFeatureRequests = (): UseQueryResult<FeatureRequestRow[], Error> =>
  useQuery({
    queryKey: ["feature_requests"],
    queryFn: () =>
      list<FeatureRequestRow>(
        "feature_requests",
        "id, title, category, request_type, priority, status, staff_name, votes, created_at",
      ),
  });

export interface CompanyRow {
  id: string;
  name: string;
  company_type: string;
  city: string | null;
  state: string | null;
  is_active: boolean;
}
export const useCompaniesList = (): UseQueryResult<CompanyRow[], Error> =>
  useQuery({
    queryKey: ["companies_all"],
    queryFn: () =>
      list<CompanyRow>("companies", "id, name, company_type, city, state, is_active", "name", true),
  });

export interface StaffRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  job_title: string | null;
  is_active: boolean;
}
export const useStaffList = (): UseQueryResult<StaffRow[], Error> =>
  useQuery({
    queryKey: ["staff_all"],
    queryFn: () =>
      list<StaffRow>(
        "staff",
        "id, first_name, last_name, email, department, job_title, is_active",
        "last_name",
        true,
      ),
  });

export interface ProviderRow {
  id: string;
  provider_key: string;
  display_name: string;
  category: string;
  description: string | null;
  is_active: boolean;
}
export const useIntegrationProviders = (): UseQueryResult<ProviderRow[], Error> =>
  useQuery({
    queryKey: ["integration_providers"],
    queryFn: () =>
      list<ProviderRow>(
        "integration_providers",
        "id, provider_key, display_name, category, description, is_active",
        "display_name",
        true,
      ),
  });

export interface CompanyIntegrationRow {
  id: string;
  provider_key: string;
  is_enabled: boolean;
}
export const useCompanyIntegrations = (): UseQueryResult<CompanyIntegrationRow[], Error> =>
  useQuery({
    queryKey: ["company_integrations"],
    queryFn: () =>
      list<CompanyIntegrationRow>(
        "company_integrations",
        "id, provider_key, is_enabled",
        "provider_key",
        true,
      ),
  });

export interface CalendarHearingRow {
  id: string;
  hearing_type: string;
  scheduled_date: string | null;
  location: string | null;
  judge_name: string | null;
  matter_id: string;
  litigation_matters: { case_number: string | null; court_name: string | null } | null;
}
/** Upcoming hearings across all of the tenant's matters (RLS-scoped). */
export const useCourtCalendar = (): UseQueryResult<CalendarHearingRow[], Error> =>
  useQuery({
    queryKey: ["court_calendar"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("litigation_hearings")
        .select(
          "id, hearing_type, scheduled_date, location, judge_name, matter_id, litigation_matters(case_number, court_name)",
        )
        .gte("scheduled_date", today)
        .order("scheduled_date", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as CalendarHearingRow[];
    },
  });
