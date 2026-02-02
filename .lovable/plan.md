

# Pagination Implementation Plan

This plan adds server-side pagination to the Clients, Leads, Liabilities, and Transactions (Payments) list views to efficiently handle large datasets without loading all records at once.

---

## Architecture Decision

### Server-Side vs. Client-Side Pagination

**Recommendation: Server-Side Pagination**

The current implementation fetches all records from the database and displays them in a table. This approach has limitations:

- Supabase has a default limit of 1000 rows per query
- Loading thousands of records impacts performance and memory
- Network transfer of large datasets is slow

Server-side pagination uses Supabase's `.range()` method to fetch only the records needed for the current page, combined with a count query to determine total pages.

---

## Implementation Strategy

### Core Components

| Component | Purpose |
|-----------|---------|
| **`usePagination` hook** | Manages pagination state (page, pageSize, total count) |
| **`PaginationControls` component** | Reusable UI for page navigation and page size selection |
| **Modified data hooks** | Add pagination parameters to existing `useClients`, `useLeads`, etc. |
| **Modified page components** | Integrate pagination state and controls |

---

## Technical Details

### 1. Pagination Hook (`src/hooks/usePagination.ts`)

A reusable hook that manages:
- Current page number (1-indexed for display, 0-indexed for API)
- Page size (configurable: 10, 25, 50, 100)
- Total count of records
- Computed values: total pages, has next/previous, range display

```typescript
interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  totalCount: number;
}

interface UsePaginationReturn {
  page: number;              // Current page (1-indexed)
  pageSize: number;          // Items per page
  totalPages: number;        // Total number of pages
  totalCount: number;        // Total items
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  rangeStart: number;        // First item index on current page
  rangeEnd: number;          // Last item index on current page
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
}
```

### 2. Pagination Controls Component (`src/components/ui/pagination-controls.tsx`)

A reusable component that displays:
- "Showing X to Y of Z results" text
- Page size selector dropdown
- Previous/Next buttons
- Page number buttons with ellipsis for large ranges

Uses the existing pagination primitives from `src/components/ui/pagination.tsx`.

```text
+-------------------------------------------------------------------+
| Showing 1 to 25 of 1,234 results    [10 ▾]  [< Prev] [1][2]...[50] [Next >] |
+-------------------------------------------------------------------+
```

### 3. Modified Data Hooks

Each hook will be updated to accept pagination parameters and return count information.

#### Pattern for Paginated Queries

```typescript
// Example: useClients with pagination
export function useClients(options: {
  search?: string;
  status?: ClientStatus;
  page?: number;        // 1-indexed
  pageSize?: number;    // Default: 25
}) {
  return useQuery({
    queryKey: ['clients', options],
    queryFn: async () => {
      const { page = 1, pageSize = 25, search, status } = options;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('clients')
        .select('*, phones:client_phones(*), addresses:client_addresses(*)', { count: 'exact' })
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
      }
      if (status) {
        query = query.eq('status', status);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data as Client[], count: count ?? 0 };
    },
  });
}
```

**Key Changes:**
- Add `{ count: 'exact' }` to the select to get total count
- Use `.range(from, to)` to fetch only the current page
- Return `{ data, count }` instead of just data

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/usePagination.ts` | Pagination state management hook |
| `src/components/ui/pagination-controls.tsx` | Reusable pagination UI component |

---

## Files to Modify

### Hooks

| File | Changes |
|------|---------|
| `src/hooks/useClients.ts` | Add pagination params to `useClients`, return count |
| `src/hooks/useLeads.ts` | Add pagination params to `useLeads`, return count |
| `src/hooks/useLiabilities.ts` | Add pagination params to `useLiabilities`, return count |
| `src/hooks/useTransactions.ts` | Add pagination params to `useTransactions`, return count |

### Pages

| File | Changes |
|------|---------|
| `src/pages/Clients.tsx` | Add pagination state, integrate PaginationControls |
| `src/pages/Leads.tsx` | Add pagination state (list view only), integrate controls |
| `src/pages/Liabilities.tsx` | Add pagination state, integrate PaginationControls |
| `src/pages/Payments.tsx` | Add pagination state, integrate PaginationControls |
| `src/components/payments/TransactionList.tsx` | Accept pagination props, pass to parent |

---

## Detailed Page Changes

### Clients Page (`src/pages/Clients.tsx`)

```typescript
// Add state
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(25);

// Update hook call
const { data: result, isLoading } = useClients({
  search: search || undefined,
  status: statusFilter === 'all' ? undefined : statusFilter,
  page,
  pageSize,
});

const clients = result?.data;
const totalCount = result?.count ?? 0;

// Reset page when filters change
useEffect(() => {
  setPage(1);
}, [search, statusFilter]);

// Add controls below table
<PaginationControls
  page={page}
  pageSize={pageSize}
  totalCount={totalCount}
  onPageChange={setPage}
  onPageSizeChange={(size) => {
    setPageSize(size);
    setPage(1);
  }}
/>
```

### Leads Page (`src/pages/Leads.tsx`)

Pagination only applies to list view (table), not Kanban view.

```typescript
// Add state (only used in list view)
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(25);

// Modify hook to support pagination when in list view
const { data: result, isLoading } = useLeads({
  status: statusFilter === 'all' ? undefined : statusFilter,
  page: view === 'list' ? page : undefined,
  pageSize: view === 'list' ? pageSize : undefined,
});

// For Kanban, use all leads; for list, use paginated
const leads = view === 'kanban' ? result?.data : result?.data;
const totalCount = result?.count ?? 0;
```

### Liabilities Page (`src/pages/Liabilities.tsx`)

Same pattern as Clients page.

### Payments Page (`src/pages/Payments.tsx`)

Similar pattern. The `TransactionList` component will be updated to not do client-side filtering since the server handles it.

---

## PaginationControls Component Design

```typescript
interface PaginationControlsProps {
  page: number;              // Current page (1-indexed)
  pageSize: number;          // Items per page
  totalCount: number;        // Total items
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];  // Default: [10, 25, 50, 100]
  showPageSizeSelector?: boolean;  // Default: true
  className?: string;
}
```

**Features:**
- Shows "Showing X to Y of Z results"
- Page size dropdown (10, 25, 50, 100)
- Smart page number display:
  - Shows first page, last page, and pages around current
  - Ellipsis for gaps (e.g., [1] ... [5][6][7] ... [20])
- Previous/Next buttons with disabled states
- Keyboard accessible

---

## Query Key Strategy

Pagination parameters are included in query keys to ensure proper caching:

```typescript
queryKey: ['clients', { search, status, page, pageSize }]
```

This means:
- Changing page fetches new data (no stale data from different page)
- Going back to a previous page uses cached data if still fresh
- Changing filters resets to page 1 and fetches fresh data

---

## Edge Cases Handled

1. **Empty results**: Show empty state, hide pagination
2. **Single page**: Show count but hide page navigation
3. **Filter changes**: Reset to page 1
4. **Page out of bounds**: If page > totalPages, reset to last valid page
5. **Loading state**: Show skeleton, disable navigation
6. **URL sync** (future): Could sync page to URL params for shareable links

---

## Performance Considerations

1. **Debounced search**: Existing debouncing prevents excessive queries while typing
2. **Query caching**: React Query caches results per page
3. **Optimistic updates**: When navigating to next page, prefetch could be added later
4. **Count query efficiency**: Using `{ count: 'exact' }` adds minimal overhead

---

## Default Page Sizes

| Page | Default | Reason |
|------|---------|--------|
| Clients | 25 | Balance between overview and performance |
| Leads | 25 | Same as clients |
| Liabilities | 25 | Same as clients |
| Transactions | 50 | Higher volume, users scan more data |

---

## Documentation Update

After implementation, update `src/lib/docs/roadmapData.ts` to mark "Pagination for List Views" as Completed.

---

## Summary

| New Files | Count |
|-----------|-------|
| Hooks | 1 (`usePagination.ts`) |
| Components | 1 (`pagination-controls.tsx`) |

| Modified Files | Count |
|----------------|-------|
| Hooks | 4 (useClients, useLeads, useLiabilities, useTransactions) |
| Pages | 4 (Clients, Leads, Liabilities, Payments) |
| Components | 1 (TransactionList) |
| Documentation | 1 (roadmapData) |

**Total: 2 new files, 10 modified files**

