import { cn } from "@/lib/utils";
import { titleCase } from "@/lib/format";

// Maps a status family to a tint. Unknown statuses fall back to neutral.
const TINTS: Record<string, string> = {
  // positive / done
  active: "bg-green-100 text-green-800",
  converted: "bg-green-100 text-green-800",
  settled: "bg-green-100 text-green-800",
  completed: "bg-green-100 text-green-800",
  cleared: "bg-green-100 text-green-800",
  qualified: "bg-green-100 text-green-800",
  // in progress
  contacted: "bg-blue-100 text-blue-800",
  in_negotiation: "bg-blue-100 text-blue-800",
  sent: "bg-blue-100 text-blue-800",
  pending: "bg-amber-100 text-amber-800",
  enrolled: "bg-blue-100 text-blue-800",
  new: "bg-amber-100 text-amber-800",
  // attention / terminal-negative
  in_litigation: "bg-purple-100 text-purple-800",
  lost: "bg-red-100 text-red-800",
  cancelled: "bg-red-100 text-red-800",
  declined: "bg-red-100 text-red-800",
  dismissed: "bg-gray-100 text-gray-700",
  inactive: "bg-gray-100 text-gray-700",
};

/** Small colored pill for an entity status. */
export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const tint = TINTS[status] ?? "bg-gray-100 text-gray-700";
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tint)}
    >
      {titleCase(status)}
    </span>
  );
}
