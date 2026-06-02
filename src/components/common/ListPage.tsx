import { useMemo, useState, type ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { QueryState } from "@/components/common/QueryState";
import { Input } from "@/components/ui/input";

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

/** Shared title + toolbar + data-table scaffold for the module list pages. */
export function ListPage<T extends { id: string }>({
  title,
  description,
  action,
  query,
  columns,
  empty = "Nothing here yet.",
  onRowClick,
  searchText,
  searchPlaceholder = "Search…",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  query: UseQueryResult<T[], Error>;
  columns: Column<T>[];
  empty?: string;
  onRowClick?: (row: T) => void;
  /** When provided, a search box filters rows by this text (case-insensitive substring). */
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
}) {
  const [search, setSearch] = useState("");
  const rows = useMemo(() => {
    const base = query.data ?? [];
    if (!searchText || !search.trim()) return base;
    const q = search.trim().toLowerCase();
    return base.filter((r) => searchText(r).toLowerCase().includes(q));
  }, [query.data, search, searchText]);
  const hasAny = (query.data ?? []).length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {searchText && (hasAny || search) && (
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="max-w-xs"
        />
      )}
      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        isEmpty={rows.length === 0}
        emptyMessage={search ? "No matches." : empty}
      >
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left">
              <tr>
                {columns.map((c) => (
                  <th key={c.header} className="px-3 py-2 font-medium">
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={
                    onRowClick
                      ? "cursor-pointer border-b last:border-0 hover:bg-muted/40"
                      : "border-b last:border-0"
                  }
                >
                  {columns.map((c) => (
                    <td key={c.header} className={`px-3 py-2 ${c.className ?? ""}`}>
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>
    </div>
  );
}
