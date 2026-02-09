import { useState } from 'react';
import { Check, ChevronsUpDown, Link2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import type { SearchResult, SearchResultType } from '@/types/search';

const TYPE_TO_ENTITY: Record<SearchResultType, string> = {
  lead: 'lead',
  client: 'engagement',
  service: 'engagement',
  liability: 'liability',
  litigation: 'litigation_matter',
};

const ENTITY_LABELS: Record<string, string> = {
  lead: 'Lead',
  engagement: 'Client',
  liability: 'Liability',
  litigation_matter: 'Litigation',
};

interface EntitySearchSelectProps {
  entityType: string | null;
  entityId: string | null;
  onSelect: (entityType: string | null, entityId: string | null, label?: string) => void;
  disabled?: boolean;
  readOnlyLabel?: string;
}

export function EntitySearchSelect({
  entityType,
  entityId,
  onSelect,
  disabled = false,
  readOnlyLabel,
}: EntitySearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { data } = useGlobalSearch(searchQuery);

  const handleSelect = (result: SearchResult) => {
    const mappedType = TYPE_TO_ENTITY[result.type] || result.type;
    onSelect(mappedType, result.id, result.title);
    setOpen(false);
    setSearchQuery('');
  };

  const handleClear = () => {
    onSelect(null, null);
  };

  // Show read-only badge when entity is pre-set
  if (disabled && readOnlyLabel) {
    return (
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Linked To</label>
        <Badge variant="secondary" className="gap-1.5">
          <Link2 className="h-3 w-3" />
          {ENTITY_LABELS[entityType || ''] || entityType}: {readOnlyLabel}
        </Badge>
      </div>
    );
  }

  // Show selected entity with clear button
  if (entityId && entityType) {
    return (
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Linked To</label>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5">
            <Link2 className="h-3 w-3" />
            {ENTITY_LABELS[entityType] || entityType}
            {readOnlyLabel && `: ${readOnlyLabel}`}
          </Badge>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleClear}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  const grouped = data?.grouped;

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">Link to Entity (optional)</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal text-muted-foreground"
          >
            <span className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Search leads, clients, liabilities...
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Type to search..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>
                {searchQuery.length < 2 ? 'Type at least 2 characters...' : 'No results found.'}
              </CommandEmpty>
              {grouped?.leads && grouped.leads.length > 0 && (
                <CommandGroup heading="Leads">
                  {grouped.leads.map((r) => (
                    <CommandItem key={r.id} onSelect={() => handleSelect(r)}>
                      <div className="flex flex-col">
                        <span>{r.title}</span>
                        <span className="text-xs text-muted-foreground">{r.subtitle}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {grouped?.clients && grouped.clients.length > 0 && (
                <CommandGroup heading="Clients">
                  {grouped.clients.map((r) => (
                    <CommandItem key={r.id} onSelect={() => handleSelect(r)}>
                      <div className="flex flex-col">
                        <span>{r.title}</span>
                        <span className="text-xs text-muted-foreground">{r.subtitle}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {grouped?.liabilities && grouped.liabilities.length > 0 && (
                <CommandGroup heading="Liabilities">
                  {grouped.liabilities.map((r) => (
                    <CommandItem key={r.id} onSelect={() => handleSelect(r)}>
                      <div className="flex flex-col">
                        <span>{r.title}</span>
                        <span className="text-xs text-muted-foreground">{r.subtitle}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {grouped?.litigation && grouped.litigation.length > 0 && (
                <CommandGroup heading="Litigation">
                  {grouped.litigation.map((r) => (
                    <CommandItem key={r.id} onSelect={() => handleSelect(r)}>
                      <div className="flex flex-col">
                        <span>{r.title}</span>
                        <span className="text-xs text-muted-foreground">{r.subtitle}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
