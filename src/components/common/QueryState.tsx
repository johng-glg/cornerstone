import type { ReactNode } from "react";

interface QueryStateProps {
  isLoading: boolean;
  error: Error | null;
  isEmpty: boolean;
  emptyMessage?: string;
  children: ReactNode;
}

/** Shared loading / error / empty wrapper for list views. */
export function QueryState({
  isLoading,
  error,
  isEmpty,
  emptyMessage = "Nothing here yet.",
  children,
}: QueryStateProps) {
  if (isLoading) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Loading…
      </p>
    );
  }
  if (error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Failed to load: {error.message}
      </p>
    );
  }
  if (isEmpty) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }
  return <>{children}</>;
}
