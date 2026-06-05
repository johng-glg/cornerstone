import { cn } from "@/lib/utils";
import { titleCase } from "@/lib/format";

const TINTS: Record<string, string> = {
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-yellow-100 text-yellow-800",
};

/** Colored pill for an alert severity. */
export function SeverityBadge({ severity }: { severity: string | null | undefined }) {
  if (!severity) return <span className="text-muted-foreground">—</span>;
  const tint = TINTS[severity.toLowerCase()] ?? "bg-gray-100 text-gray-700";
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tint)}
    >
      {titleCase(severity)}
    </span>
  );
}
