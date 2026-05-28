import { useState } from 'react';
import { Plus, GitBranch, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  onInsert: (snippet: string) => void;
}

const OPERATORS = [
  { value: '==', label: 'equals' },
  { value: '!=', label: 'not equals' },
  { value: '>', label: 'greater than' },
  { value: '<', label: 'less than' },
  { value: '>=', label: 'at least' },
  { value: '<=', label: 'at most' },
];

const COMMON_FIELDS = [
  'client.first_name', 'client.email', 'client.primary_phone',
  'lead.status', 'lead.estimated_debt',
  'service.status', 'service.plan_type', 'service.escrow_balance', 'service.monthly_payment',
  'liability.status', 'liability.current_balance',
];

export function ConditionalBlockInserter({ onInsert }: Props) {
  const [ifField, setIfField] = useState('service.status');
  const [ifOp, setIfOp] = useState('==');
  const [ifValue, setIfValue] = useState('active');
  const [includeElse, setIncludeElse] = useState(true);

  const [eachField, setEachField] = useState('liabilities');

  const insertIf = () => {
    const elsePart = includeElse ? `\n{else}\nFallback content here.\n` : '\n';
    onInsert(`{#if ${ifField} ${ifOp} ${ifValue}}\nContent when true.${elsePart}{/if}`);
  };

  const insertEach = () => {
    onInsert(`{#each ${eachField}}\n- {this.name}: {this.value}\n{/each}`);
  };

  return (
    <Card>
      <CardContent className="p-3 space-y-3">
        <div>
          <p className="text-xs font-medium mb-2 text-muted-foreground uppercase tracking-wide">Logic Blocks</p>
          <p className="text-xs text-muted-foreground mb-3">
            Add conditional ("if") or repeating ("each") blocks to your template.
          </p>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="w-full justify-start">
              <GitBranch className="h-4 w-4 mr-2" />
              Insert IF block
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 space-y-3" align="start">
            <div className="space-y-1">
              <Label className="text-xs">Field</Label>
              <Select value={ifField} onValueChange={setIfField}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMMON_FIELDS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Operator</Label>
                <Select value={ifOp} onValueChange={setIfOp}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map(op => <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Value</Label>
                <Input value={ifValue} onChange={(e) => setIfValue(e.target.value)} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={includeElse} onChange={(e) => setIncludeElse(e.target.checked)} />
              Include {'{else}'} branch
            </label>
            <Button type="button" size="sm" className="w-full" onClick={insertIf}>
              <Plus className="h-3 w-3 mr-1" />
              Insert at cursor
            </Button>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="w-full justify-start">
              <Repeat className="h-4 w-4 mr-2" />
              Insert EACH (loop) block
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 space-y-3" align="start">
            <div className="space-y-1">
              <Label className="text-xs">List field (path)</Label>
              <Input
                value={eachField}
                onChange={(e) => setEachField(e.target.value)}
                placeholder="e.g. liabilities"
              />
              <p className="text-xs text-muted-foreground">
                Inside the block use {'{this.field}'} to reference each item.
              </p>
            </div>
            <Button type="button" size="sm" className="w-full" onClick={insertEach}>
              <Plus className="h-3 w-3 mr-1" />
              Insert at cursor
            </Button>
          </PopoverContent>
        </Popover>

        <div className="text-xs text-muted-foreground pt-2 border-t">
          <p className="font-medium mb-1">Syntax reference:</p>
          <code className="block">{'{#if path op value}...{else}...{/if}'}</code>
          <code className="block mt-1">{'{#each list}...{/each}'}</code>
        </div>
      </CardContent>
    </Card>
  );
}
