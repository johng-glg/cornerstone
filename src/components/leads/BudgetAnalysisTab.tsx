import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useLeadBudget,
  useUpsertBudgetItem,
  useDeleteBudgetItem,
  useBudgetSummary,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
} from '@/hooks/useLeadBudget';
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BudgetAnalysisTabProps {
  leadId: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

export function BudgetAnalysisTab({ leadId }: BudgetAnalysisTabProps) {
  const { data: items, isLoading } = useLeadBudget(leadId);
  const upsertItem = useUpsertBudgetItem();
  const deleteItem = useDeleteBudgetItem();
  const { incomeItems, expenseItems, totalIncome, totalExpenses, discretionary } = useBudgetSummary(items);

  const [newCategory, setNewCategory] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [addingType, setAddingType] = useState<'income' | 'expense' | null>(null);

  const handleAdd = async () => {
    if (!newCategory || !newAmount) return;
    const allCats = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];
    const catDef = allCats.find(c => c.value === newCategory);
    if (!catDef) return;

    await upsertItem.mutateAsync({
      lead_id: leadId,
      category: newCategory,
      label: catDef.label,
      amount: parseFloat(newAmount),
    });
    setNewCategory('');
    setNewAmount('');
    setAddingType(null);
  };

  const handleAmountChange = async (item: { id: string; lead_id: string; category: string; label: string }, amount: string) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return;
    await upsertItem.mutateAsync({ id: item.id, lead_id: item.lead_id, category: item.category, label: item.label, amount: num });
  };

  if (isLoading) {
    return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }

  const affordabilityColor = discretionary >= 500 ? 'text-green-600' : discretionary >= 200 ? 'text-yellow-600' : 'text-destructive';
  const affordabilityBg = discretionary >= 500 ? 'bg-green-50 border-green-200' : discretionary >= 200 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className={cn('border', affordabilityBg)}>
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                <TrendingUp className="h-3 w-3" /> Income
              </div>
              <p className="text-lg font-semibold text-green-600">{formatCurrency(totalIncome)}</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                <TrendingDown className="h-3 w-3" /> Expenses
              </div>
              <p className="text-lg font-semibold text-destructive">{formatCurrency(totalExpenses)}</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                <DollarSign className="h-3 w-3" /> Discretionary
              </div>
              <p className={cn('text-lg font-semibold', affordabilityColor)}>{formatCurrency(discretionary)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Income Section */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" /> Monthly Income
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setAddingType('income')}>
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {incomeItems.length === 0 && addingType !== 'income' && (
            <p className="text-sm text-muted-foreground text-center py-2">No income sources added</p>
          )}
          {incomeItems.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <span className="text-sm flex-1">{item.label}</span>
              <Input
                type="number"
                className="w-28 h-8 text-sm"
                defaultValue={item.amount}
                onBlur={(e) => handleAmountChange(item, e.target.value)}
              />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteItem.mutate({ id: item.id, leadId })}>
                <Trash2 className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
          ))}
          {addingType === 'income' && (
            <div className="flex items-end gap-2 pt-2 border-t">
              <div className="flex-1">
                <Label className="text-xs">Category</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger className="h-8 text-sm mt-1">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    {INCOME_CATEGORIES.filter(c => !incomeItems.some(i => i.category === c.value)).map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-28">
                <Label className="text-xs">Amount</Label>
                <Input type="number" className="h-8 text-sm mt-1" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="0.00" />
              </div>
              <Button size="sm" className="h-8" onClick={handleAdd} disabled={!newCategory || !newAmount}>Add</Button>
              <Button size="sm" variant="ghost" className="h-8" onClick={() => { setAddingType(null); setNewCategory(''); setNewAmount(''); }}>✕</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expense Section */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" /> Monthly Expenses
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setAddingType('expense')}>
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {expenseItems.length === 0 && addingType !== 'expense' && (
            <p className="text-sm text-muted-foreground text-center py-2">No expenses added</p>
          )}
          {expenseItems.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <span className="text-sm flex-1">{item.label}</span>
              <Input
                type="number"
                className="w-28 h-8 text-sm"
                defaultValue={item.amount}
                onBlur={(e) => handleAmountChange(item, e.target.value)}
              />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteItem.mutate({ id: item.id, leadId })}>
                <Trash2 className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
          ))}
          {addingType === 'expense' && (
            <div className="flex items-end gap-2 pt-2 border-t">
              <div className="flex-1">
                <Label className="text-xs">Category</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger className="h-8 text-sm mt-1">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    {EXPENSE_CATEGORIES.filter(c => !expenseItems.some(i => i.category === c.value)).map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-28">
                <Label className="text-xs">Amount</Label>
                <Input type="number" className="h-8 text-sm mt-1" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="0.00" />
              </div>
              <Button size="sm" className="h-8" onClick={handleAdd} disabled={!newCategory || !newAmount}>Add</Button>
              <Button size="sm" variant="ghost" className="h-8" onClick={() => { setAddingType(null); setNewCategory(''); setNewAmount(''); }}>✕</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
