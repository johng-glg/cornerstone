import {
  useClientLitigation,
  useClientPayments,
  useClientBilling,
  useClientDocuments,
  useClientSignatures,
  useClientCommunications,
} from "@/hooks/useClientDetail";
import { QueryState } from "@/components/common/QueryState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate, titleCase } from "@/lib/format";

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50 text-left">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function ClientLitigationTab({
  clientId,
  serviceIds,
}: {
  clientId: string;
  serviceIds: string[];
}) {
  const q = useClientLitigation(clientId, serviceIds);
  return (
    <QueryState
      isLoading={q.isLoading}
      error={q.error}
      isEmpty={(q.data ?? []).length === 0}
      emptyMessage="No litigation matters for this client."
    >
      <Table head={["Case #", "Court", "Opposing party", "Status", "Response due", "Next hearing"]}>
        {(q.data ?? []).map((m) => (
          <tr key={m.id} className="border-b last:border-0">
            <td className="px-3 py-2 font-mono text-xs">{m.case_number ?? "—"}</td>
            <td className="px-3 py-2">{m.court_name ?? "—"}</td>
            <td className="px-3 py-2 text-muted-foreground">{m.opposing_party ?? "—"}</td>
            <td className="px-3 py-2">
              <StatusBadge status={m.status} />
            </td>
            <td className="px-3 py-2">{formatDate(m.response_deadline)}</td>
            <td className="px-3 py-2">{formatDate(m.next_hearing_date)}</td>
          </tr>
        ))}
      </Table>
    </QueryState>
  );
}

export function ClientPaymentsTab({
  clientId,
  serviceIds,
}: {
  clientId: string;
  serviceIds: string[];
}) {
  const q = useClientPayments(clientId, serviceIds);
  return (
    <QueryState
      isLoading={q.isLoading}
      error={q.error}
      isEmpty={(q.data ?? []).length === 0}
      emptyMessage="No payments recorded yet."
    >
      <Table head={["Type", "Amount", "Status", "Scheduled", "Processed"]}>
        {(q.data ?? []).map((t) => (
          <tr key={t.id} className="border-b last:border-0">
            <td className="px-3 py-2">{titleCase(t.transaction_type)}</td>
            <td className="px-3 py-2">{formatCurrency(t.amount)}</td>
            <td className="px-3 py-2">
              <StatusBadge status={t.status} />
            </td>
            <td className="px-3 py-2">{formatDate(t.scheduled_date)}</td>
            <td className="px-3 py-2 text-muted-foreground">{formatDate(t.processed_at)}</td>
          </tr>
        ))}
      </Table>
    </QueryState>
  );
}

export function ClientBillingTab({ clientId }: { clientId: string }) {
  const q = useClientBilling(clientId);
  return (
    <>
      <p className="mb-3 text-xs text-muted-foreground">
        Time &amp; expense entries. Forth / processor billing appears here once those integrations
        are deployed.
      </p>
      <QueryState
        isLoading={q.isLoading}
        error={q.error}
        isEmpty={(q.data ?? []).length === 0}
        emptyMessage="No billing entries."
      >
        <Table head={["Date", "Type", "Description", "Amount", "Billable", "Status"]}>
          {(q.data ?? []).map((b) => (
            <tr key={b.id} className="border-b last:border-0">
              <td className="px-3 py-2">{formatDate(b.billing_date)}</td>
              <td className="px-3 py-2">{titleCase(b.entry_type)}</td>
              <td className="px-3 py-2">{b.description}</td>
              <td className="px-3 py-2">{formatCurrency(b.total_amount)}</td>
              <td className="px-3 py-2">{b.is_billable ? "Yes" : "No"}</td>
              <td className="px-3 py-2">
                <StatusBadge status={b.status} />
              </td>
            </tr>
          ))}
        </Table>
      </QueryState>
    </>
  );
}

export function ClientDocumentsTab({ clientId }: { clientId: string }) {
  const q = useClientDocuments(clientId);
  return (
    <QueryState
      isLoading={q.isLoading}
      error={q.error}
      isEmpty={(q.data ?? []).length === 0}
      emptyMessage="No documents attached."
    >
      <Table head={["Title", "Type", "Added", ""]}>
        {(q.data ?? []).map((d) => (
          <tr key={d.id} className="border-b last:border-0">
            <td className="px-3 py-2">{d.title}</td>
            <td className="px-3 py-2 text-muted-foreground">{titleCase(d.document_type)}</td>
            <td className="px-3 py-2">{formatDate(d.created_at)}</td>
            <td className="px-3 py-2 text-right">
              <a
                href={d.file_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-guardian-gold hover:underline"
              >
                Open
              </a>
            </td>
          </tr>
        ))}
      </Table>
    </QueryState>
  );
}

export function ClientSignaturesTab({ clientId }: { clientId: string }) {
  const q = useClientSignatures(clientId);
  return (
    <QueryState
      isLoading={q.isLoading}
      error={q.error}
      isEmpty={(q.data ?? []).length === 0}
      emptyMessage="No signature requests."
    >
      <Table head={["Title", "Status", "Completed", "Created"]}>
        {(q.data ?? []).map((s) => (
          <tr key={s.id} className="border-b last:border-0">
            <td className="px-3 py-2">{s.title}</td>
            <td className="px-3 py-2">
              <StatusBadge status={s.status} />
            </td>
            <td className="px-3 py-2">{formatDate(s.completed_at)}</td>
            <td className="px-3 py-2 text-muted-foreground">{formatDate(s.created_at)}</td>
          </tr>
        ))}
      </Table>
    </QueryState>
  );
}

export function ClientCommsTab({ clientId }: { clientId: string }) {
  const q = useClientCommunications(clientId);
  return (
    <QueryState
      isLoading={q.isLoading}
      error={q.error}
      isEmpty={(q.data ?? []).length === 0}
      emptyMessage="No communications logged."
    >
      <ul className="space-y-2">
        {(q.data ?? []).map((c) => (
          <Card key={c.id}>
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {titleCase(c.communication_type)}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({titleCase(c.direction)})
                  </span>
                </span>
                <time className="text-xs text-muted-foreground">
                  {formatDate(c.communication_date)}
                </time>
              </div>
              {c.subject && <p className="text-sm">{c.subject}</p>}
              {c.notes && <p className="text-sm text-muted-foreground">{c.notes}</p>}
              {c.outcome && <p className="text-xs text-muted-foreground">Outcome: {c.outcome}</p>}
            </CardContent>
          </Card>
        ))}
      </ul>
    </QueryState>
  );
}
