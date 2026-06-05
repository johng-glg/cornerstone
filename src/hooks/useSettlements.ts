import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface ScheduledPayment {
  due_date: string;
  amount: number;
}

export interface SettlementRow {
  id: string;
  liability_id: string;
  offer_amount: number;
  offer_percentage: number | null;
  payment_type: string;
  number_of_payments: number | null;
  status: string;
  offered_date: string | null;
  accepted_date: string | null;
  completed_date: string | null;
  first_payment_date: string | null;
  fee_collection_method: string | null;
  attorney_approved: boolean | null;
  payment_schedule: ScheduledPayment[];
  notes: string | null;
}

const SELECT =
  "id, liability_id, offer_amount, offer_percentage, payment_type, number_of_payments, status, offered_date, accepted_date, completed_date, first_payment_date, fee_collection_method, attorney_approved, payment_schedule, notes";

export function useSettlements(liabilityIds: string[]): UseQueryResult<SettlementRow[], Error> {
  return useQuery({
    queryKey: ["settlements", liabilityIds.join(",")],
    enabled: liabilityIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settlements")
        .select(SELECT)
        .in("liability_id", liabilityIds)
        .order("offered_date", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => ({
        ...(r as Record<string, unknown>),
        payment_schedule: Array.isArray((r as { payment_schedule?: unknown }).payment_schedule)
          ? ((r as { payment_schedule: ScheduledPayment[] }).payment_schedule ?? [])
          : [],
      })) as unknown as SettlementRow[];
    },
  });
}

/**
 * Build an equal-installment schedule (monthly from the first payment date). Used when the offer
 * is a payment plan so the schedule is concrete rather than just a payment count.
 */
export function buildSchedule(
  total: number,
  count: number,
  firstDate: string | null,
): ScheduledPayment[] {
  if (!count || count < 1) return [];
  const start = firstDate ? new Date(firstDate) : new Date();
  if (Number.isNaN(start.getTime())) return [];
  const per = Math.round((total / count) * 100) / 100;
  const out: ScheduledPayment[] = [];
  let allocated = 0;
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setMonth(d.getMonth() + i);
    // Put any rounding remainder on the final payment so the schedule sums to the total.
    const amount = i === count - 1 ? Math.round((total - allocated) * 100) / 100 : per;
    allocated += amount;
    out.push({ due_date: d.toISOString().slice(0, 10), amount });
  }
  return out;
}

export interface NewSettlement {
  liability_id: string;
  offer_amount: number;
  offer_percentage?: number | null;
  payment_type?: string;
  number_of_payments?: number | null;
  first_payment_date?: string | null;
  fee_collection_method?: string | null;
  fee_start_offset_months?: number | null;
  /** Explicit (rich-builder) schedule. When omitted, an equal monthly schedule is auto-built. */
  payment_schedule?: ScheduledPayment[] | null;
  notes?: string | null;
}

export function useAddSettlement(): UseMutationResult<void, Error, NewSettlement> {
  const qc = useQueryClient();
  return useMutation<void, Error, NewSettlement>({
    mutationFn: async (input) => {
      const paymentType = input.payment_type || "lump_sum";
      const isPlan = paymentType === "payment_plan";
      // Prefer an explicit (edited) schedule; otherwise auto-build an equal monthly plan.
      const schedule =
        input.payment_schedule && input.payment_schedule.length
          ? input.payment_schedule
          : isPlan
            ? buildSchedule(
                input.offer_amount,
                input.number_of_payments ?? 1,
                input.first_payment_date ?? null,
              )
            : [];
      const count = schedule.length || (isPlan ? (input.number_of_payments ?? 1) : 1);
      const { error } = await supabase.from("settlements").insert({
        liability_id: input.liability_id,
        offer_amount: input.offer_amount,
        offer_percentage: input.offer_percentage ?? null,
        payment_type: paymentType,
        number_of_payments: count,
        first_payment_date: input.first_payment_date || null,
        fee_collection_method: input.fee_collection_method || "split",
        fee_start_offset_months: input.fee_start_offset_months ?? 0,
        payment_schedule: schedule,
        notes: input.notes ?? null,
        status: "offered",
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settlements"] }),
  });
}

export interface ClientServiceContext {
  escrow_balance: number | null;
  monthly_payment: number | null;
  settlement_fee_percentage: number | null;
}

/** Escrow balance, recurring draft, and fee rate for the engagement a liability belongs to. */
export function useClientServiceContext(
  clientServiceId: string | null | undefined,
): UseQueryResult<ClientServiceContext | null, Error> {
  return useQuery({
    queryKey: ["client_service_context", clientServiceId ?? ""],
    enabled: !!clientServiceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_services")
        .select("escrow_balance, monthly_payment, settlement_fee_percentage")
        .eq("id", clientServiceId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? null) as ClientServiceContext | null;
    },
  });
}

/** Resolve a Cornerstone client to its Forth contact id (bigint), for the funds-availability calc. */
export function useClientForthContactId(
  clientId: string | null | undefined,
): UseQueryResult<number | null, Error> {
  return useQuery({
    queryKey: ["client_forth_contact_id", clientId ?? ""],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("forth_crm_id")
        .eq("id", clientId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      const raw = data?.forth_crm_id;
      const n = raw != null ? Number(raw) : NaN;
      return Number.isFinite(n) ? n : null;
    },
  });
}

export type SettlementTransition = "accepted" | "rejected" | "completed" | "cancelled" | "approve";

/**
 * Advance a settlement through its lifecycle. "approve" is the attorney sign-off (sets the
 * attorney_approved flag + stamp); the others set status and the matching date column.
 */
export function useUpdateSettlementStatus(): UseMutationResult<
  void,
  Error,
  { id: string; transition: SettlementTransition }
> {
  const qc = useQueryClient();
  const { staff } = useAuth();
  return useMutation<void, Error, { id: string; transition: SettlementTransition }>({
    mutationFn: async ({ id, transition }) => {
      const today = new Date().toISOString().slice(0, 10);
      const patch: Record<string, unknown> =
        transition === "approve"
          ? {
              attorney_approved: true,
              attorney_approved_by: staff?.id ?? null,
              attorney_approved_date: new Date().toISOString(),
            }
          : transition === "accepted"
            ? { status: "accepted", accepted_date: today }
            : transition === "completed"
              ? { status: "completed", completed_date: today }
              : { status: transition }; // rejected | cancelled
      const { error } = await supabase.from("settlements").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settlements"] }),
  });
}
