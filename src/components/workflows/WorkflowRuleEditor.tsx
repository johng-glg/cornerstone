import { useState } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import {
  useSaveWorkflowRule,
  WORKFLOW_ENTITIES,
  WORKFLOW_TRIGGERS,
  WORKFLOW_ACTIONS,
  WORKFLOW_OPERATORS,
  ACTION_FIELDS,
  type WorkflowRule,
  type WfCondition,
  type WfAction,
} from "@/hooks/useWorkflows";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { titleCase } from "@/lib/format";

function Picker({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {titleCase(o)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function WorkflowRuleEditor({ rule }: { rule?: WorkflowRule }) {
  const save = useSaveWorkflowRule();
  const editing = !!rule;
  const [open, setOpen] = useState(false);

  const [name, setName] = useState(rule?.name ?? "");
  const [description, setDescription] = useState(rule?.description ?? "");
  const [entity, setEntity] = useState(rule?.entity_type ?? "leads");
  const [trigger, setTrigger] = useState(rule?.trigger_type ?? "status_changed");
  const [priority, setPriority] = useState(String(rule?.priority ?? 100));
  const [blocking, setBlocking] = useState(rule?.is_blocking ?? false);
  const [active, setActive] = useState(rule?.is_active ?? true);
  const [conditions, setConditions] = useState<WfCondition[]>(rule?.conditions ?? []);
  const [actions, setActions] = useState<WfAction[]>(
    rule?.actions?.length ? rule.actions : [{ type: "create_task", config: {} }],
  );

  const setCond = (i: number, patch: Partial<WfCondition>) =>
    setConditions((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const setAct = (i: number, patch: Partial<WfAction>) =>
    setActions((as) => as.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  const setActCfg = (i: number, key: string, value: string) =>
    setActions((as) =>
      as.map((a, j) => (j === i ? { ...a, config: { ...a.config, [key]: value } } : a)),
    );

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Name is required.");
      return;
    }
    try {
      await save.mutateAsync({
        id: rule?.id ?? null,
        name: name.trim(),
        description: description.trim() || null,
        entity_type: entity,
        trigger_type: trigger,
        priority: parseInt(priority, 10) || 100,
        is_blocking: blocking,
        is_active: active,
        conditions: conditions.filter((c) => c.field.trim()),
        actions,
      });
      toast.success(editing ? "Rule updated." : "Rule created.");
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant={editing ? "ghost" : "default"}
          className={editing ? "h-7 text-xs" : ""}
        >
          {editing ? "Edit" : "New rule"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit workflow rule" : "New workflow rule"}</DialogTitle>
          <DialogDescription>
            When the trigger fires and all conditions match, the actions run.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basics */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Entity</Label>
              <Picker value={entity} onChange={setEntity} options={WORKFLOW_ENTITIES} />
            </div>
            <div className="space-y-1">
              <Label>Trigger</Label>
              <Picker value={trigger} onChange={setTrigger} options={WORKFLOW_TRIGGERS} />
            </div>
            <div className="space-y-1">
              <Label>Priority</Label>
              <Input type="number" value={priority} onChange={(e) => setPriority(e.target.value)} />
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 pb-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={blocking}
                  onChange={(e) => setBlocking(e.target.checked)}
                />
                Blocking
              </label>
              <label className="flex items-center gap-2 pb-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />
                Active
              </label>
            </div>
          </div>

          {/* Conditions */}
          <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Conditions (all must match)</p>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() =>
                  setConditions((cs) => [...cs, { field: "", operator: "eq", value: "" }])
                }
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add
              </Button>
            </div>
            {conditions.length === 0 && (
              <p className="text-xs text-muted-foreground">No conditions — always runs.</p>
            )}
            {conditions.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  className="flex-1"
                  placeholder="field (e.g. status)"
                  value={c.field}
                  onChange={(e) => setCond(i, { field: e.target.value })}
                />
                <Picker
                  className="w-28"
                  value={c.operator}
                  onChange={(v) => setCond(i, { operator: v })}
                  options={WORKFLOW_OPERATORS}
                />
                <Input
                  className="flex-1"
                  placeholder="value"
                  value={c.value}
                  onChange={(e) => setCond(i, { value: e.target.value })}
                />
                <button
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Remove condition"
                  onClick={() => setConditions((cs) => cs.filter((_, j) => j !== i))}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Actions</p>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => setActions((as) => [...as, { type: "create_task", config: {} }])}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add
              </Button>
            </div>
            {actions.map((a, i) => (
              <div key={i} className="space-y-2 rounded-md bg-muted/40 p-2">
                <div className="flex items-center gap-2">
                  <Picker
                    className="flex-1"
                    value={a.type}
                    onChange={(v) => setAct(i, { type: v, config: {} })}
                    options={WORKFLOW_ACTIONS}
                  />
                  <button
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Remove action"
                    onClick={() => setActions((as) => as.filter((_, j) => j !== i))}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {(ACTION_FIELDS[a.type] ?? []).map((f) => (
                  <Input
                    key={f.key}
                    placeholder={f.label}
                    value={a.config[f.key] ?? ""}
                    onChange={(e) => setActCfg(i, f.key, e.target.value)}
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={submit} disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save rule"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
