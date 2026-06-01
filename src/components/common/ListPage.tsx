import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { QueryState } from "@/components/common/QueryState";

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
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  query: UseQueryResult<T[], Error>;
  columns: Column<T>[];
  empty?: string;
  onRowClick?: (row: T) => void;
}) {
  const rows = query.data ?? [];
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        isEmpty={rows.length === 0}
        emptyMessage={empty}
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
