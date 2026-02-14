import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BudgetItem {
  id: string;
  lead_id: string;
  category: string;
  label: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

export const INCOME_CATEGORIES = [
  { value: 'income_employment', label: 'Employment' },
  { value: 'income_self_employment', label: 'Self-Employment' },
  { value: 'income_spouse', label: 'Spouse / Partner' },
  { value: 'income_social_security', label: 'Social Security' },
  { value: 'income_other', label: 'Other Income' },
] as const;

export const EXPENSE_CATEGORIES = [
  { value: 'expense_rent', label: 'Rent / Mortgage' },
  { value: 'expense_utilities', label: 'Utilities' },
  { value: 'expense_food', label: 'Food / Groceries' },
  { value: 'expense_transportation', label: 'Transportation' },
  { value: 'expense_insurance', label: 'Insurance' },
  { value: 'expense_childcare', label: 'Childcare' },
  { value: 'expense_min_payments', label: 'Minimum Payments' },
  { value: 'expense_other', label: 'Other Expenses' },
] as const;

export function useLeadBudget(leadId?: string) {
  return useQuery({
    queryKey: ['lead-budget', leadId],
    queryFn: async () => {
      if (!leadId) return [];
      const { data, error } = await supabase
        .from('lead_budgets')
        .select('*')
        .eq('lead_id', leadId)
        .order('category');
      if (error) throw error;
      return data as BudgetItem[];
    },
    enabled: !!leadId,
  });
}

export function useUpsertBudgetItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      id?: string;
      lead_id: string;
      category: string;
      label: string;
      amount: number;
    }) => {
      if (input.id) {
        const { data, error } = await supabase
          .from('lead_budgets')
          .update({ amount: input.amount, label: input.label })
          .eq('id', input.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('lead_budgets')
          .insert({
            lead_id: input.lead_id,
            category: input.category,
            label: input.label,
            amount: input.amount,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lead-budget', data.lead_id] });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to save budget item', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteBudgetItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, leadId }: { id: string; leadId: string }) => {
      const { error } = await supabase
        .from('lead_budgets')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return leadId;
    },
    onSuccess: (leadId) => {
      queryClient.invalidateQueries({ queryKey: ['lead-budget', leadId] });
    },
  });
}

export function useBudgetSummary(items: BudgetItem[] | undefined) {
  const incomeItems = items?.filter(i => i.category.startsWith('income_')) || [];
  const expenseItems = items?.filter(i => i.category.startsWith('expense_')) || [];
  const totalIncome = incomeItems.reduce((sum, i) => sum + Number(i.amount), 0);
  const totalExpenses = expenseItems.reduce((sum, i) => sum + Number(i.amount), 0);
  const discretionary = totalIncome - totalExpenses;

  return { incomeItems, expenseItems, totalIncome, totalExpenses, discretionary };
}
