import { useState } from "react";
import { toast } from "sonner";
import { useLeadBudget, useAddBudgetLine, useDeleteBudgetLine } from "@/hooks/useLeadTabs";
import { QueryState } from "@/components/common/QueryState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";

function AddLine({ leadId, category }: { leadId: string; category: "income" | "expense" }) {
  const add = useAddBudgetLine(leadId);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");

  const submit = () => {
    const amt = Number(amount);
    if (!label.trim() || Number.isNaN(amt)) return;
    add.mutate(
      { category, label: label.trim(), amount: amt },
      {
        onSuccess: () => {
          setLabel("");
          setAmount("");
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder={category === "income" ? "Income source" : "Expense"}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="flex-1"
      />
      <Input
        type="number"
        min="0"
        step="0.01"
        placeholder="$"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-28"
      />
      <Button
        size="sm"
        variant="outline"
        disabled={add.isPending || !label.trim()}
        onClick={submit}
      >
        Add
      </Button>
    </div>
  );
}

export function BudgetTab({ leadId }: { leadId: string }) {
  const budget = useLeadBudget(leadId);
  const del = useDeleteBudgetLine(leadId);
  const rows = budget.data ?? [];

  const income = rows.filter((r) => r.category === "income");
  const expense = rows.filter((r) => r.category === "expense");
  const incomeTotal = income.reduce((s, r) => s + (r.amount ?? 0), 0);
  const expenseTotal = expense.reduce((s, r) => s + (r.amount ?? 0), 0);
  const discretionary = incomeTotal - expenseTotal;

  const Section = ({
    title,
    items,
    category,
  }: {
    title: string;
    items: typeof rows;
    category: "income" | "expense";
  }) => (
    <div className="space-y-2 rounded-md border p-3">
      <p className="text-sm font-medium">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No {category === "income" ? "income sources" : "expenses"} added
        </p>
      ) : (
        <ul className="space-y-1">
          {items.map((r) => (
            <li key={r.id} className="flex items-center justify-between text-sm">
              <span>{r.label}</span>
              <span className="flex items-center gap-3">
                <span>{formatCurrency(r.amount)}</span>
                <button
                  type="button"
                  onClick={() =>
                    del.mutate({ id: r.id }, { onError: (e) => toast.error(e.message) })
                  }
                  className="text-xs text-destructive hover:underline"
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <AddLine leadId={leadId} category={category} />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 rounded-md border bg-muted/30 p-3 text-center">
        <div>
          <p className="text-xs text-muted-foreground">Income</p>
          <p className="text-lg font-semibold text-green-700">{formatCurrency(incomeTotal)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Expenses</p>
          <p className="text-lg font-semibold text-destructive">{formatCurrency(expenseTotal)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Discretionary</p>
          <p
            className={`text-lg font-semibold ${discretionary >= 0 ? "text-guardian-navy" : "text-destructive"}`}
          >
            {formatCurrency(discretionary)}
          </p>
        </div>
      </div>
      <QueryState isLoading={budget.isLoading} error={budget.error} isEmpty={false} emptyMessage="">
        <Section title="Monthly Income" items={income} category="income" />
        <Section title="Monthly Expenses" items={expense} category="expense" />
      </QueryState>
    </div>
  );
}
