
# Global Search Feature Implementation Plan

## Overview

This plan implements a comprehensive global search feature that allows users to search across leads, clients, services, liabilities, and litigation matters from anywhere in the application. The search will be accessible via a keyboard shortcut (Ctrl+K or Cmd+K) and through the search input in the top navigation bar.

---

## Architecture Decision

### Client-Side vs. Edge Function Approach

**Recommendation: Client-Side Search with Parallel Queries**

After analyzing the codebase, I recommend a client-side search approach that runs parallel queries against each table rather than an Edge Function. This approach:

- Leverages existing RLS policies for security (each user only sees data they have access to)
- Uses the existing Supabase client authentication
- Enables instant feedback with debounced queries
- Follows the existing hook pattern established in the codebase
- Avoids the latency overhead of Edge Function cold starts

For very large datasets (10,000+ records per table), we can later migrate to a PostgreSQL full-text search function or Edge Function if needed.

---

## Components to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `src/components/search/GlobalSearch.tsx` | Main command palette component with search UI |
| `src/components/search/SearchResultItem.tsx` | Individual search result display component |
| `src/hooks/useGlobalSearch.ts` | Hook to perform parallel search queries across tables |
| `src/types/search.ts` | TypeScript types for search results |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/layout/TopNav.tsx` | Replace placeholder input with GlobalSearch component, add keyboard shortcut |
| `src/components/layout/AppLayout.tsx` | Add global keyboard listener for Ctrl+K |

---

## Database Search Strategy

### Search Fields by Entity

| Entity | Searchable Fields | Primary Display | Secondary Display |
|--------|-------------------|-----------------|-------------------|
| **Leads** | `first_name`, `last_name`, `email`, `phone`, `lead_number` | Full name | Lead number, status |
| **Clients** | `first_name`, `last_name`, `email` | Full name | Email, status |
| **Client Services** | `service_number`, `notes` + client name via join | Service number + client name | Status, enrolled debt |
| **Liabilities** | `account_number` + creditor name via join + client name | Creditor + account | Balance, status |
| **Litigation Matters** | `case_number`, `court_name`, `opposing_party` + client name | Case number + client name | Court, status |

### Query Pattern

Each entity search uses Supabase's `.or()` with `.ilike()` for case-insensitive partial matching:

```typescript
// Example: Search clients
supabase
  .from('clients')
  .select('id, first_name, last_name, email, status')
  .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
  .eq('is_active', true)
  .limit(10)
```

---

## Implementation Details

### 1. Search Types (`src/types/search.ts`)

```typescript
export type SearchResultType = 'lead' | 'client' | 'service' | 'liability' | 'litigation';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;           // Primary display text
  subtitle: string;        // Secondary info
  badge?: string;          // Status badge
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  route: string;           // Navigation path
  icon: string;            // Lucide icon name
}

export interface GlobalSearchState {
  query: string;
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
}
```

### 2. Search Hook (`src/hooks/useGlobalSearch.ts`)

The hook will:
- Accept a search query string
- Debounce input (300ms delay)
- Run parallel queries to all 5 tables
- Map results to a unified SearchResult format
- Sort by relevance (exact matches first, then partial)
- Return combined results with loading state

**Key Implementation Details:**

```typescript
export function useGlobalSearch(query: string) {
  const debouncedQuery = useDebounce(query, 300);
  
  return useQuery({
    queryKey: ['global-search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return [];
      
      const [leads, clients, services, liabilities, matters] = await Promise.all([
        searchLeads(debouncedQuery),
        searchClients(debouncedQuery),
        searchClientServices(debouncedQuery),
        searchLiabilities(debouncedQuery),
        searchLitigationMatters(debouncedQuery),
      ]);
      
      return sortByRelevance([...leads, ...clients, ...services, ...liabilities, ...matters], debouncedQuery);
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30000, // Cache results for 30 seconds
  });
}
```

**Relevance Sorting Logic:**
1. Exact matches on primary fields (name, number) scored highest
2. Starts-with matches scored medium
3. Contains matches scored lowest
4. Recent items within same score tier appear first

### 3. Global Search Component (`src/components/search/GlobalSearch.tsx`)

Uses the existing `CommandDialog` component from shadcn/ui (`cmdk`).

**Features:**
- Opens with Ctrl+K (Cmd+K on Mac) keyboard shortcut
- Groups results by entity type (Leads, Clients, etc.)
- Shows loading spinner during search
- Empty state when no results found
- Keyboard navigation (arrow keys, enter to select)
- Click or Enter navigates to the selected item
- Recent searches stored in localStorage (optional future enhancement)

**Component Structure:**

```text
CommandDialog
├── CommandInput (search box)
├── CommandList
│   ├── CommandEmpty (no results message)
│   ├── CommandGroup heading="Leads"
│   │   └── CommandItem × n
│   ├── CommandGroup heading="Clients"
│   │   └── CommandItem × n
│   ├── CommandGroup heading="Services"
│   │   └── CommandItem × n
│   ├── CommandGroup heading="Liabilities"
│   │   └── CommandItem × n
│   └── CommandGroup heading="Litigation"
│       └── CommandItem × n
└── Loading indicator (when searching)
```

### 4. TopNav Integration

**Changes to `TopNav.tsx`:**

```typescript
// Replace the form with a clickable trigger
<Button
  variant="outline"
  className="hidden md:flex items-center w-64 justify-start text-muted-foreground"
  onClick={() => setSearchOpen(true)}
>
  <Search className="mr-2 h-4 w-4" />
  <span>Search...</span>
  <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
    <span className="text-xs">⌘</span>K
  </kbd>
</Button>

<GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
```

### 5. Keyboard Shortcut Registration

In `TopNav.tsx`, add a useEffect for the global keyboard shortcut:

```typescript
useEffect(() => {
  const down = (e: KeyboardEvent) => {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setSearchOpen((open) => !open);
    }
  };
  
  document.addEventListener('keydown', down);
  return () => document.removeEventListener('keydown', down);
}, []);
```

---

## Search Result Routes

| Entity Type | Route Pattern | Example |
|-------------|---------------|---------|
| Lead | `/leads` with sheet open | Opens LeadDetailSheet |
| Client | `/clients/:id` | `/clients/abc-123` |
| Service | `/services` with sheet open | Opens ServiceDetailSheet |
| Liability | `/liabilities` with sheet open | Opens LiabilityDetailSheet |
| Litigation | `/litigation` with sheet open | Opens LitigationMatterDetailSheet |

**Navigation Strategy:**

For entities that use sheets (side panels) rather than dedicated pages, we'll navigate to the list page and set a URL parameter that triggers the sheet to open:

```typescript
// Example: Navigate to liability
navigate(`/liabilities?open=${liabilityId}`);
```

This requires minor updates to the list pages to check for the `open` query parameter.

---

## Performance Optimizations

1. **Debouncing**: 300ms delay before executing search to prevent excessive queries while typing
2. **Minimum Query Length**: Require at least 2 characters before searching
3. **Result Limits**: Cap each table query at 10 results (50 total max)
4. **Stale Time**: Cache results for 30 seconds to avoid re-fetching on dialog toggle
5. **Parallel Queries**: Use `Promise.all` to run all queries concurrently (not sequentially)
6. **Index Optimization**: Recommend adding database indexes on frequently searched columns (future enhancement)

---

## UI/UX Details

### Visual Design

- **Search Trigger**: Outlined button in TopNav showing "Search..." with keyboard shortcut badge
- **Dialog**: Centered modal with rounded corners, consistent with existing dialogs
- **Result Items**: Show icon (by type), title, subtitle, and status badge
- **Grouping**: Results grouped by type with section headings
- **Loading**: Spinner icon in input field while searching
- **Empty State**: Friendly message "No results found for '[query]'"

### Icons by Entity Type

| Entity | Icon (Lucide) |
|--------|---------------|
| Lead | `UserPlus` |
| Client | `User` |
| Service | `Briefcase` |
| Liability | `CreditCard` |
| Litigation | `Scale` |

### Keyboard Interactions

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate through results |
| `Enter` | Select and navigate to result |
| `Escape` | Close search dialog |
| `Ctrl/Cmd + K` | Toggle search dialog |

---

## Files Summary

### Create

1. **`src/types/search.ts`** - Type definitions for search results
2. **`src/hooks/useGlobalSearch.ts`** - Search hook with parallel queries and debouncing
3. **`src/components/search/GlobalSearch.tsx`** - Command palette dialog component
4. **`src/components/search/SearchResultItem.tsx`** - Individual result item component

### Modify

1. **`src/components/layout/TopNav.tsx`**
   - Add keyboard shortcut listener
   - Replace form with trigger button
   - Integrate GlobalSearch component
   - Add search dialog state

2. **`src/pages/Liabilities.tsx`** - Add query param handling to auto-open detail sheet
3. **`src/pages/Services.tsx`** - Add query param handling to auto-open detail sheet
4. **`src/pages/Litigation.tsx`** - Add query param handling to auto-open detail sheet
5. **`src/pages/Leads.tsx`** - Add query param handling to auto-open detail sheet

---

## Technical Considerations

### RLS Security

All queries go through the existing Supabase client with user authentication, so RLS policies automatically filter results to only show data the user has access to. No additional security measures needed.

### Error Handling

- Network errors show toast notification
- Individual query failures don't break the entire search (graceful degradation)
- Empty results clearly communicated

### Accessibility

- Full keyboard navigation support
- ARIA labels on search input and results
- Focus management when opening/closing dialog
- Screen reader announcements for result count

---

## Future Enhancements (Not in This Plan)

1. **Recent Searches**: Store and display recent search queries
2. **Search Filters**: Allow filtering by entity type before searching
3. **PostgreSQL Full-Text Search**: For better performance with large datasets
4. **Search Analytics**: Track what users search for to improve relevance
5. **Quick Actions**: Add "Create new..." options in empty state
