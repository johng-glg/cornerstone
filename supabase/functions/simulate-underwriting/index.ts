import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Flag {
  code: string;
  label: string;
  severity: "info" | "warning" | "critical";
  details: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lead_id } = await req.json();
    if (!lead_id) {
      return new Response(JSON.stringify({ error: "lead_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch lead data
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .single();

    if (leadError || !lead) {
      return new Response(JSON.stringify({ error: "Lead not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch lead documents count
    const { count: docCount } = await supabase
      .from("lead_documents")
      .select("*", { count: "exact", head: true })
      .eq("lead_id", lead_id);

    // Fetch budget items
    const { data: budgetItems } = await supabase
      .from("lead_budgets")
      .select("*")
      .eq("lead_id", lead_id);

    const totalIncome =
      budgetItems
        ?.filter((i: any) => i.category.startsWith("income_"))
        .reduce((sum: number, i: any) => sum + Number(i.amount), 0) || 0;
    const totalExpenses =
      budgetItems
        ?.filter((i: any) => i.category.startsWith("expense_"))
        .reduce((sum: number, i: any) => sum + Number(i.amount), 0) || 0;
    const discretionary = totalIncome - totalExpenses;

    // Build flags
    const flags: Flag[] = [];

    // Always flag for manual review
    flags.push({
      code: "manual_review_required",
      label: "Manual Review Required",
      severity: "info",
      details:
        "All submissions are currently flagged for manual review by the eligibility team.",
    });

    // High debt amount
    if (lead.estimated_debt_amount && lead.estimated_debt_amount > 50000) {
      flags.push({
        code: "high_debt_amount",
        label: "High Debt Amount",
        severity: "warning",
        details: `Estimated debt of $${lead.estimated_debt_amount.toLocaleString()} exceeds $50,000 threshold.`,
      });
    }

    // Missing documentation
    if (!docCount || docCount === 0) {
      flags.push({
        code: "missing_documentation",
        label: "Missing Documentation",
        severity: "warning",
        details: "No documents have been uploaded for this lead.",
      });
    }

    // Low discretionary income
    if (budgetItems && budgetItems.length > 0 && discretionary < 200) {
      flags.push({
        code: "low_discretionary_income",
        label: "Low Discretionary Income",
        severity: "critical",
        details: `Discretionary income of $${discretionary.toFixed(2)} is below $200 minimum.`,
      });
    }

    // Active lawsuit
    if (lead.has_active_lawsuit) {
      flags.push({
        code: "active_lawsuit",
        label: "Active Lawsuit",
        severity: "warning",
        details: "Lead has an active lawsuit that may affect eligibility.",
      });
    }

    return new Response(JSON.stringify({ flags }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
