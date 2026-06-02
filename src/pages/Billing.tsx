import { toast } from "sonner";
import { useBillingList } from "@/hooks/useModules";
import { useAddBillingEntry } from "@/hooks/useModuleMutations";
import { useClients, useClientServices } from "@/hooks/useCoreCrm";
import { useLitigationMatters } from "@/hooks/useDomains";
import { ListPage } from "@/components/common/ListPage";
import { QuickFormDialog } from "@/components/common/QuickFormDialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import type { BillingListRow } from "@/hooks/useModules";
import { formatCurrency, formatDate, titleCase } from "@/lib/format";

// Radix Select rejects empty-string values, so "not linked" uses this sentinel (mapped to null).
const NONE = "__none__";

/** Short label for whatever a billing entry is associated with. */
function linkedLabel(b: BillingListRow): string {
  if (b.litigation_matter) return `Matter ${b.litigation_matter.case_number ?? ""}`.trim();
  if (b.client_service) return `Engagement ${b.client_service.service_number}`;
  if (b.client) return `${b.client.first_name} ${b.client.last_name}`;
  return "—";
}

function AddBillingAction() {
  const add = useAddBillingEntry();
  const clients = useClients();
  const engagements = useClientServices();
  const matters = useLitigationMatters();
  return (
    <QuickFormDialog
      trigger={<Button size="sm">New entry</Button>}
      title="New billing entry"
      description="Log time or an expense and link it to the client, engagement, or matter it's for."
      pending={add.isPending}
      fields={[
        {
          name: "entry_type",
          label: "Type",
          type: "select",
          required: true,
          defaultValue: "time",
          options: [
            { value: "time", label: "Time" },
            { value: "expense", label: "Expense" },
          ],
        },
        { name: "total_amount", label: "Amount ($)", type: "number", required: true },
        { name: "description", label: "Description", required: true, full: true },
        {
          name: "is_billable",
          label: "Billable",
          type: "select",
          defaultValue: "yes",
          options: [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ],
        },
        { name: "duration_minutes", label: "Duration (min)", type: "number" },
        { name: "hourly_rate", label: "Hourly rate ($)", type: "number" },
        {
          name: "client_id",
          label: "Client",
          type: "select",
          defaultValue: NONE,
          options: [
            { value: NONE, label: "— None —" },
            ...(clients.data ?? []).map((c) => ({
              value: c.id,
              label: `${c.first_name} ${c.last_name}`,
            })),
          ],
        },
        {
          name: "client_service_id",
          label: "Engagement",
          type: "select",
          defaultValue: NONE,
          options: [
            { value: NONE, label: "— None —" },
            ...(engagements.data ?? []).map((e) => ({
              value: e.id,
              label: `${e.service_number} (${titleCase(e.status)})`,
            })),
          ],
        },
        {
          name: "litigation_matter_id",
          label: "Litigation matter",
          type: "select",
          defaultValue: NONE,
          options: [
            { value: NONE, label: "— None —" },
            ...(matters.data ?? []).map((m) => ({
              value: m.id,
              label: m.case_number || m.opposing_party || `Matter ${m.id.slice(0, 8)}`,
            })),
          ],
        },
      ]}
      onSubmit={async (v) => {
        const orNull = (val: string) => (val && val !== NONE ? val : null);
        try {
          await add.mutateAsync({
            entry_type: v.entry_type,
            description: v.description,
            total_amount: Number(v.total_amount) || 0,
            is_billable: v.is_billable !== "no",
            duration_minutes: v.duration_minutes ? Number(v.duration_minutes) : null,
            hourly_rate: v.hourly_rate ? Number(v.hourly_rate) : null,
            client_id: orNull(v.client_id),
            client_service_id: orNull(v.client_service_id),
            litigation_matter_id: orNull(v.litigation_matter_id),
          });
          toast.success("Billing entry added.");
        } catch (e) {
          toast.error((e as Error).message);
          throw e;
        }
      }}
    />
  );
}

export default function Billing() {
  const q = useBillingList();
  return (
    <ListPage
      title="Billing"
      description="Time & expense entries. Forth / processor billing populates once those integrations are deployed."
      query={q}
      action={<AddBillingAction />}
      empty="No billing entries."
      columns={[
        { header: "Date", cell: (b) => formatDate(b.billing_date) },
        { header: "Type", cell: (b) => titleCase(b.entry_type) },
        { header: "Description", cell: (b) => b.description },
        { header: "Linked to", cell: (b) => linkedLabel(b) },
        { header: "Amount", cell: (b) => formatCurrency(b.total_amount) },
        { header: "Billable", cell: (b) => (b.is_billable ? "Yes" : "No") },
        { header: "Status", cell: (b) => <StatusBadge status={b.status} /> },
      ]}
    />
  );
}
