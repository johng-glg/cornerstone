import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Plus } from 'lucide-react';
import { getFilterOperators, type ModuleConfig, type FieldType } from '@/lib/reportModules';
import type { ReportFilter } from '@/types/reports';
import { useStaff } from '@/hooks/useStaff';

interface ReportFiltersProps {
  moduleConfig: ModuleConfig;
  filters: ReportFilter[];
  onChange: (filters: ReportFilter[]) => void;
}

export function ReportFilters({ moduleConfig, filters, onChange }: ReportFiltersProps) {
  const { data: staff } = useStaff();

  const addFilter = () => {
    const firstFilter = moduleConfig.filters[0];
    if (firstFilter) {
      onChange([
        ...filters,
        { field: firstFilter.key, operator: 'eq', value: '' },
      ]);
    }
  };

  const removeFilter = (index: number) => {
    onChange(filters.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, updates: Partial<ReportFilter>) => {
    onChange(
      filters.map((filter, i) => 
        i === index ? { ...filter, ...updates } : filter
      )
    );
  };

  const getFilterConfig = (fieldKey: string) => {
    return moduleConfig.filters.find(f => f.key === fieldKey);
  };

  const renderValueInput = (filter: ReportFilter, index: number) => {
    const filterConfig = getFilterConfig(filter.field);
    if (!filterConfig) return null;

    switch (filterConfig.type) {
      case 'enum':
        return (
          <Select
            value={String(filter.value)}
            onValueChange={(value) => updateFilter(index, { value })}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select value" />
            </SelectTrigger>
            <SelectContent>
              {filterConfig.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'boolean':
        return (
          <Select
            value={String(filter.value)}
            onValueChange={(value) => updateFilter(index, { value: value === 'true' })}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select value" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        );

      case 'staff':
        return (
          <Select
            value={String(filter.value)}
            onValueChange={(value) => updateFilter(index, { value })}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select staff" />
            </SelectTrigger>
            <SelectContent>
              {staff?.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.first_name} {s.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'date':
      case 'datetime':
        return (
          <Input
            type="date"
            value={String(filter.value)}
            onChange={(e) => updateFilter(index, { value: e.target.value })}
            className="w-[200px]"
          />
        );

      case 'number':
      case 'currency':
        return (
          <Input
            type="number"
            value={String(filter.value)}
            onChange={(e) => updateFilter(index, { value: e.target.value })}
            className="w-[200px]"
            placeholder="Enter value"
          />
        );

      default:
        return (
          <Input
            value={String(filter.value)}
            onChange={(e) => updateFilter(index, { value: e.target.value })}
            className="w-[200px]"
            placeholder="Enter value"
          />
        );
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Filters</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addFilter}
          disabled={moduleConfig.filters.length === 0}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Filter
        </Button>
      </div>

      {filters.length === 0 ? (
        <p className="text-sm text-muted-foreground">No filters applied</p>
      ) : (
        <div className="space-y-2">
          {filters.map((filter, index) => {
            const filterConfig = getFilterConfig(filter.field);
            const operators = filterConfig 
              ? getFilterOperators(filterConfig.type as FieldType)
              : getFilterOperators('text');

            return (
              <div key={index} className="flex items-center gap-2 flex-wrap">
                <Select
                  value={filter.field}
                  onValueChange={(value) => updateFilter(index, { field: value, value: '' })}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    {moduleConfig.filters.map((f) => (
                      <SelectItem key={f.key} value={f.key}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filter.operator}
                  onValueChange={(value) => updateFilter(index, { operator: value })}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Operator" />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map((op) => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {renderValueInput(filter, index)}

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFilter(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
