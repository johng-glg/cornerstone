import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useUpdateLead } from "@/hooks/useCoreCrm";
import type { LeadListRow, LeadStatus } from "@/lib/db-types";
import { formatCurrency } from "@/lib/format";

const COLUMNS: { key: LeadStatus; label: string; tint: string }[] = [
  { key: "new", label: "New", tint: "bg-amber-400" },
  { key: "contacted", label: "Contacted", tint: "bg-blue-400" },
  { key: "qualified", label: "Qualified", tint: "bg-green-400" },
  { key: "converted", label: "Converted", tint: "bg-emerald-500" },
  { key: "lost", label: "Lost", tint: "bg-red-400" },
];

export function LeadsBoard({ leads }: { leads: LeadListRow[] }) {
  const navigate = useNavigate();
  const update = useUpdateLead();

  const onDrop = (e: React.DragEvent, status: LeadStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    update.mutate(
      { id, status },
      {
        onSuccess: () => toast.success(`Moved to ${status}`),
        onError: (err) => toast.error(err.message),
      },
    );
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {COLUMNS.map((col) => {
        const items = leads.filter((l) => l.status === col.key);
        return (
          <div
            key={col.key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, col.key)}
            className="flex w-64 shrink-0 flex-col rounded-md border bg-muted/30"
          >
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="flex items-center gap-2 text-sm font-medium">
                <span className={`h-2 w-2 rounded-full ${col.tint}`} />
                {col.label}
              </span>
              <span className="rounded-full bg-background px-2 text-xs text-muted-foreground">
                {items.length}
              </span>
            </div>
            <div className="flex-1 space-y-2 p-2">
              {items.map((l) => (
                <div
                  key={l.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", l.id)}
                  onClick={() => navigate(`/leads/${l.id}`)}
                  className="cursor-pointer rounded-md border bg-background p-2.5 text-sm shadow-sm hover:border-guardian-gold"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {l.first_name} {l.last_name}
                    </span>
                    {l.lead_score != null && (
                      <span className="rounded-full bg-guardian-gold/20 px-1.5 text-xs text-guardian-navy">
                        {l.lead_score}
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-[10px] text-muted-foreground">{l.lead_number}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatCurrency(l.estimated_debt_amount)}
                  </p>
                </div>
              ))}
              {items.length === 0 && (
                <p className="px-1 py-4 text-center text-xs text-muted-foreground">Drop here</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
