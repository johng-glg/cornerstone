import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SeverityBadge } from "@/components/forecast/SeverityBadge";
import { formatCurrency, formatDate, titleCase } from "@/lib/format";
import type { ForecastAlertRow, ForecastAlertWithClient } from "@/lib/forecast-types";

type Row = ForecastAlertRow | ForecastAlertWithClient;
const hasClient = (r: Row): r is ForecastAlertWithClient => "client_id" in r;

interface Props {
  alerts: Row[];
  /** Show a client column (firm-wide queue). Omit inside a single client's view. */
  showClient?: boolean;
  onAcknowledge?: (a: ForecastAlertRow) => void;
  onResolve?: (a: ForecastAlertRow) => void;
  pendingId?: string | null;
}

/** Shared breach-alert table — used by the firm-wide queue and the per-client Forecast tab. */
export function AlertsTable({ alerts, showClient, onAcknowledge, onResolve, pendingId }: Props) {
  const actions = !!(onAcknowledge || onResolve);
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50 text-left">
          <tr>
            {showClient && <th className="px-3 py-2 font-medium">Client</th>}
            <th className="px-3 py-2 font-medium">Severity</th>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Breach date</th>
            <th className="px-3 py-2 font-medium">Lead</th>
            <th className="px-3 py-2 font-medium">Shortfall</th>
            <th className="px-3 py-2 font-medium">Status</th>
            {actions && <th className="px-3 py-2 font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {alerts.map((a) => {
            const busy = pendingId === a.id;
            return (
              <tr key={a.id} className="border-b last:border-0 hover:bg-muted/40">
                {showClient && (
                  <td className="px-3 py-2">
                    {hasClient(a) && a.client_id ? (
                      <Link
                        to={`/clients/${a.client_id}`}
                        className="text-guardian-gold hover:underline"
                      >
                        {a.client_name || "View client"}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Forth {a.contact_id}</span>
                    )}
                  </td>
                )}
                <td className="px-3 py-2">
                  <SeverityBadge severity={a.severity} />
                </td>
                <td className="px-3 py-2">{titleCase(a.type)}</td>
                <td className="px-3 py-2">{formatDate(a.breach_date)}</td>
                <td className="px-3 py-2">{a.lead_days != null ? `${a.lead_days}d` : "—"}</td>
                <td className="px-3 py-2">{formatCurrency(a.shortfall_amount)}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={a.status} />
                </td>
                {actions && (
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      {onAcknowledge && a.status === "open" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => onAcknowledge(a)}
                        >
                          Ack
                        </Button>
                      )}
                      {onResolve && a.status !== "resolved" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => onResolve(a)}
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
