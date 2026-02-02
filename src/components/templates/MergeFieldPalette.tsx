import { useState } from 'react';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  MERGE_FIELD_REGISTRY, 
  getMergeFieldTag, 
  mergeFieldEntityLabels,
  MergeFieldDefinition 
} from '@/types/templates';

interface MergeFieldPaletteProps {
  onInsert: (tag: string) => void;
}

export function MergeFieldPalette({ onInsert }: MergeFieldPaletteProps) {
  const [search, setSearch] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['client', 'service', 'company'])
  );

  const toggleSection = (entity: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(entity)) {
        next.delete(entity);
      } else {
        next.add(entity);
      }
      return next;
    });
  };

  const filteredRegistry = Object.entries(MERGE_FIELD_REGISTRY).reduce((acc, [entity, fields]) => {
    if (!search) {
      acc[entity] = fields;
    } else {
      const filtered = fields.filter(
        (f) =>
          f.label.toLowerCase().includes(search.toLowerCase()) ||
          f.field.toLowerCase().includes(search.toLowerCase()) ||
          entity.toLowerCase().includes(search.toLowerCase())
      );
      if (filtered.length > 0) {
        acc[entity] = filtered;
      }
    }
    return acc;
  }, {} as Record<string, MergeFieldDefinition[]>);

  return (
    <div className="border rounded-lg">
      <div className="p-2 border-b">
        <p className="text-sm font-medium mb-2">Merge Fields</p>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search fields..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-7 h-8 text-sm"
          />
        </div>
      </div>

      <ScrollArea className="h-[260px]">
        <div className="p-2 space-y-1">
          {Object.entries(filteredRegistry).map(([entity, fields]) => (
            <Collapsible
              key={entity}
              open={search ? true : expandedSections.has(entity)}
              onOpenChange={() => !search && toggleSection(entity)}
            >
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-between h-7 px-2"
                >
                  <span className="text-xs font-medium">
                    {mergeFieldEntityLabels[entity] || entity}
                  </span>
                  {expandedSections.has(entity) || search ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-2">
                {fields.map((field) => {
                  const tag = getMergeFieldTag(field);
                  return (
                    <Tooltip key={`${entity}-${field.field}`}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start h-7 px-2 text-xs font-normal"
                          onClick={() => onInsert(tag)}
                        >
                          <code className="text-xs bg-muted px-1 py-0.5 rounded mr-2">
                            {tag}
                          </code>
                          <span className="truncate">{field.label}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-[200px]">
                        <p className="font-medium">{field.label}</p>
                        {field.description && (
                          <p className="text-xs text-muted-foreground">{field.description}</p>
                        )}
                        {field.sampleValue && (
                          <p className="text-xs mt-1">
                            Example: <span className="text-primary">{field.sampleValue}</span>
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          ))}

          {Object.keys(filteredRegistry).length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              No fields match your search
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
