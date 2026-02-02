import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus, User, Briefcase, CreditCard, Scale } from 'lucide-react';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import type { SearchResult, SearchResultType } from '@/types/search';

const typeIcons: Record<SearchResultType, React.ElementType> = {
  lead: UserPlus,
  client: User,
  service: Briefcase,
  liability: CreditCard,
  litigation: Scale,
};

const typeLabels: Record<SearchResultType, string> = {
  lead: 'Leads',
  client: 'Clients',
  service: 'Services',
  liability: 'Liabilities',
  litigation: 'Litigation',
};

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { data, isLoading, isFetching } = useGlobalSearch(query);

  // Reset query when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery('');
    }
  }, [open]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      onOpenChange(false);
      navigate(result.route);
    },
    [navigate, onOpenChange]
  );

  const renderGroup = (type: SearchResultType, results: SearchResult[]) => {
    if (results.length === 0) return null;

    const Icon = typeIcons[type];

    return (
      <CommandGroup key={type} heading={typeLabels[type]}>
        {results.map((result) => (
          <CommandItem
            key={result.id}
            value={`${result.type}-${result.id}-${result.title}`}
            onSelect={() => handleSelect(result)}
            className="flex items-center gap-3 py-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{result.title}</p>
              <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
            </div>
            {result.badge && (
              <Badge
                variant={result.badgeVariant || 'secondary'}
                className="shrink-0 text-[10px] capitalize"
              >
                {result.badge.replace(/_/g, ' ')}
              </Badge>
            )}
          </CommandItem>
        ))}
      </CommandGroup>
    );
  };

  const showLoading = isLoading || isFetching;
  const hasResults = data?.results && data.results.length > 0;
  const showEmpty = query.length >= 2 && !showLoading && !hasResults;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="flex items-center border-b px-3">
        <CommandInput
          placeholder="Search leads, clients, services, liabilities, litigation..."
          value={query}
          onValueChange={setQuery}
          className="flex-1"
        />
        {showLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      <CommandList>
        {query.length < 2 && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Type at least 2 characters to search...
          </div>
        )}
        {showEmpty && (
          <CommandEmpty>No results found for "{query}"</CommandEmpty>
        )}
        {data?.grouped && (
          <>
            {renderGroup('lead', data.grouped.leads)}
            {renderGroup('client', data.grouped.clients)}
            {renderGroup('service', data.grouped.services)}
            {renderGroup('liability', data.grouped.liabilities)}
            {renderGroup('litigation', data.grouped.litigation)}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
