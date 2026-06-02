import { useState } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import {
  useSaveWorkflowRule,
  useWorkflowGroups,
  WORKFLOW_ENTITIES,
  WORKFLOW_TRIGGERS,
  WORKFLOW_ACTIONS,
  WORKFLOW_OPERATORS,
  ACTION_FIELDS,
  ENTITY_STATUS_OPTIONS,
  type WorkflowRule,
  type WfCondition,
  type WfAction,
} from "@/hooks/useWorkflows";

const NO_GROUP = "__none__";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
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

/** Multi-select status chips for the from/to transition match. */
function StatusChips({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (status: string) => void;
}) {
  if (options.length === 0)
    return <p className="text-xs text-muted-foreground">No known statuses for this entity.</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((s) => {
        const on = selected.includes(s);
        return (
          <button
            key={s}
            type="button"
            onClick={() => onToggle(s)}
            className={cn(
              "rounded-md border px-2 py-1 text-xs transition-colors",
              on
                ? "border-guardian-navy bg-guardian-navy text-white"
                : "border-input text-muted-foreground hover:bg-muted",
            )}
          >
            {titleCase(s)}
          </button>
        );
      })}
    </div>
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
  const [fromStatus, setFromStatus] = useState<string[]>(rule?.trigger_config?.from_status ?? []);
  const [toStatus, setToStatus] = useState<string[]>(rule?.trigger_config?.to_status ?? []);
  const [priority, setPriority] = useState(String(rule?.priority ?? 100));
  const [blocking, setBlocking] = useState(rule?.is_blocking ?? false);
  const [active, setActive] = useState(rule?.is_active ?? true);
  const [conditions, setConditions] = useState<WfCondition[]>(rule?.conditions ?? []);
  const [actions, setActions] = useState<WfAction[]>(
    rule?.actions?.length ? rule.actions : [{ type: "create_task", config: {} }],
  );
  const [groupId, setGroupId] = useState(rule?.group_id ?? NO_GROUP);
  const groups = useWorkflowGroups();
  const entityGroups = (groups.data ?? []).filter((g) => g.entity_type === entity);

  const statusOptions = ENTITY_STATUS_OPTIONS[entity] ?? [];
  const showTransition = trigger === "status_changed";

  const changeEntity = (v: string) => {
    setEntity(v);
    setFromStatus([]);
    setToStatus([]);
  };
  const toggle = (list: string[], set: (v: string[]) => void, s: string) =>
    set(list.includes(s) ? list.filter((x) => x !== s) : [...list, s]);

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
        trigger_config: showTransition ? { from_status: fromStatus, to_status: toStatus } : {},
        group_id: groupId && groupId !== NO_GROUP ? groupId : null,
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

        <div className="space-y-1">
          <Label>Workflow name</Label>
          <Input
            value={name}
            placeholder="e.g. Service Graduation Gate"
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <Tabs defaultValue="when" className="mt-2">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="when">When</TabsTrigger>
            <TabsTrigger value="if">If</TabsTrigger>
            <TabsTrigger value="then">Then</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* WHEN — entity, trigger, status transition */}
          <TabsContent value="when" className="space-y-3 pt-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Entity type</Label>
                <Picker value={entity} onChange={changeEntity} options={WORKFLOW_ENTITIES} />
              </div>
              <div className="space-y-1">
                <Label>Trigger type</Label>
                <Picker value={trigger} onChange={setTrigger} options={WORKFLOW_TRIGGERS} />
              </div>
            </div>
            {showTransition ? (
              <>
                <div className="space-y-1">
                  <Label>From status (leave empty for any)</Label>
                  <StatusChips
                    options={statusOptions}
                    selected={fromStatus}
                    onToggle={(s) => toggle(fromStatus, setFromStatus, s)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>To status (leave empty for any)</Label>
                  <StatusChips
                    options={statusOptions}
                    selected={toStatus}
                    onToggle={(s) => toggle(toStatus, setToStatus, s)}
                  />
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Status transitions apply to the “Status Changed” trigger.
              </p>
            )}
          </TabsContent>

          {/* IF — conditions */}
          <TabsContent value="if" className="space-y-2 pt-3">
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
          </TabsContent>

          {/* THEN — actions */}
          <TabsContent value="then" className="space-y-2 pt-3">
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
          </TabsContent>

          {/* SETTINGS — priority, flags, description */}
          <TabsContent value="settings" className="space-y-3 pt-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Priority</Label>
                <Input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                />
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
            <div className="space-y-1">
              <Label>Group</Label>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="No group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_GROUP}>No group</SelectItem>
                  {entityGroups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {entityGroups.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No groups for this entity yet — create one on the Workflows page.
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-2">
          <Button onClick={submit} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save rule"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
