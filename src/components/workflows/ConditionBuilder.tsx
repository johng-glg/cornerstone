import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, X, Info } from 'lucide-react';
import {
  ConditionGroup,
  ConditionRule,
  WorkflowEntityType,
  entityStatusOptions,
  conditionOperators,
  relatedConditionOperators,
} from '@/types/workflow';

interface ConditionBuilderProps {
  entityType: WorkflowEntityType;
  conditions: ConditionGroup[];
  onChange: (conditions: ConditionGroup[]) => void;
}

// Related entities per entity type
const relatedEntities: Record<WorkflowEntityType, string[]> = {
  client_services: ['liabilities', 'tasks'],
  leads: ['lead_debts', 'tasks'],
  liabilities: [],
  litigation_matters: ['litigation_hearings'],
  tasks: [],
  settlements: [],
};

// Common fields per entity type
const entityFields: Record<WorkflowEntityType, { value: string; label: string }[]> = {
  client_services: [
    { value: 'status', label: 'Status' },
    { value: 'escrow_balance', label: 'PLSA Balance' },
    { value: 'monthly_payment', label: 'Monthly Payment' },
    { value: 'total_enrolled_debt', label: 'Total Enrolled Debt' },
    { value: 'payment_status', label: 'Payment Status' },
    { value: 'contact_status', label: 'Contact Status' },
    { value: 'retention_flag', label: 'Retention Flag' },
  ],
  leads: [
    { value: 'status', label: 'Status' },
    { value: 'lead_score', label: 'Lead Score' },
    { value: 'estimated_debt_amount', label: 'Estimated Debt' },
    { value: 'interest_type', label: 'Interest Type' },
    { value: 'source', label: 'Source' },
    { value: 'has_active_lawsuit', label: 'Has Active Lawsuit' },
  ],
  liabilities: [
    { value: 'status', label: 'Status' },
    { value: 'current_balance', label: 'Current Balance' },
    { value: 'enrolled_balance', label: 'Enrolled Balance' },
    { value: 'liability_type', label: 'Liability Type' },
  ],
  litigation_matters: [
    { value: 'status', label: 'Status' },
    { value: 'state', label: 'State' },
    { value: 'judgment_amount', label: 'Judgment Amount' },
    { value: 'settlement_amount', label: 'Settlement Amount' },
  ],
  tasks: [
    { value: 'status', label: 'Status' },
    { value: 'priority', label: 'Priority' },
  ],
  settlements: [
    { value: 'status', label: 'Status' },
    { value: 'offer_amount', label: 'Offer Amount' },
    { value: 'settlement_percentage', label: 'Settlement Percentage' },
  ],
};

export function ConditionBuilder({ entityType, conditions, onChange }: ConditionBuilderProps) {
  const addConditionGroup = () => {
    const newGroup: ConditionGroup = {
      group_id: `g${Date.now()}`,
      operator: 'AND',
      rules: [],
    };
    onChange([...conditions, newGroup]);
  };

  const removeConditionGroup = (groupId: string) => {
    onChange(conditions.filter(g => g.group_id !== groupId));
  };

  const addRule = (groupId: string) => {
    const newRule: ConditionRule = {
      field: 'status',
      operator: 'equals',
      value: '',
    };
    onChange(conditions.map(g => 
      g.group_id === groupId 
        ? { ...g, rules: [...g.rules, newRule] }
        : g
    ));
  };

  const updateRule = (groupId: string, ruleIndex: number, updates: Partial<ConditionRule>) => {
    onChange(conditions.map(g => {
      if (g.group_id !== groupId) return g;
      const newRules = [...g.rules];
      newRules[ruleIndex] = { ...newRules[ruleIndex], ...updates };
      return { ...g, rules: newRules };
    }));
  };

  const removeRule = (groupId: string, ruleIndex: number) => {
    onChange(conditions.map(g => {
      if (g.group_id !== groupId) return g;
      return { ...g, rules: g.rules.filter((_, i) => i !== ruleIndex) };
    }));
  };

  const availableRelated = relatedEntities[entityType] || [];
  const availableFields = entityFields[entityType] || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Info className="h-4 w-4" />
        <span>Conditions determine when the workflow actions execute. Groups use OR logic between them, AND logic within.</span>
      </div>

      {conditions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-sm text-muted-foreground mb-4">
              No conditions defined. Actions will always execute when triggered.
            </p>
            <Button onClick={addConditionGroup} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Condition Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {conditions.map((group, groupIndex) => (
            <Card key={group.group_id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-sm font-medium">
                    {groupIndex > 0 && <span className="text-primary mr-2">OR</span>}
                    Condition Group
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeConditionGroup(group.group_id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  {group.rules.map((rule, ruleIndex) => (
                    <div key={ruleIndex} className="flex items-center gap-2">
                      {ruleIndex > 0 && (
                        <span className="text-xs text-muted-foreground w-8">AND</span>
                      )}
                      
                      {rule.related_entity ? (
                        // Related entity condition
                        <>
                          <Select
                            value={rule.related_entity}
                            onValueChange={(v) => updateRule(group.group_id, ruleIndex, { related_entity: v })}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {availableRelated.map((rel) => (
                                <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select
                            value={rule.operator}
                            onValueChange={(v) => updateRule(group.group_id, ruleIndex, { operator: v as any })}
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {relatedConditionOperators.map((op) => (
                                <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {rule.operator !== 'count_greater' ? (
                            <Input
                              value={Array.isArray(rule.value) ? rule.value.join(', ') : String(rule.value)}
                              onChange={(e) => updateRule(group.group_id, ruleIndex, { 
                                value: e.target.value.split(',').map(s => s.trim()) 
                              })}
                              placeholder="status values (comma separated)"
                              className="flex-1"
                            />
                          ) : (
                            <Input
                              type="number"
                              value={String(rule.value)}
                              onChange={(e) => updateRule(group.group_id, ruleIndex, { value: e.target.value })}
                              placeholder="count"
                              className="w-24"
                            />
                          )}
                        </>
                      ) : (
                        // Direct field condition
                        <>
                          <Select
                            value={rule.field}
                            onValueChange={(v) => {
                              if (v === '__related__') {
                                updateRule(group.group_id, ruleIndex, { 
                                  related_entity: availableRelated[0] || 'liabilities',
                                  operator: 'all_match',
                                  value: [],
                                });
                              } else {
                                updateRule(group.group_id, ruleIndex, { field: v });
                              }
                            }}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {availableFields.map((f) => (
                                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                              ))}
                              {availableRelated.length > 0 && (
                                <SelectItem value="__related__">Related Records...</SelectItem>
                              )}
                            </SelectContent>
                          </Select>

                          <Select
                            value={rule.operator}
                            onValueChange={(v) => updateRule(group.group_id, ruleIndex, { operator: v as any })}
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {conditionOperators.map((op) => (
                                <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {rule.operator === 'in' ? (
                            <Input
                              value={Array.isArray(rule.value) ? rule.value.join(', ') : String(rule.value)}
                              onChange={(e) => updateRule(group.group_id, ruleIndex, { 
                                value: e.target.value.split(',').map(s => s.trim()) 
                              })}
                              placeholder="values (comma separated)"
                              className="flex-1"
                            />
                          ) : (
                            <Input
                              value={String(rule.value)}
                              onChange={(e) => updateRule(group.group_id, ruleIndex, { value: e.target.value })}
                              placeholder="value"
                              className="flex-1"
                            />
                          )}
                        </>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRule(group.group_id, ruleIndex)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addRule(group.group_id)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Condition
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button onClick={addConditionGroup} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Condition Group (OR)
          </Button>
        </>
      )}
    </div>
  );
}
