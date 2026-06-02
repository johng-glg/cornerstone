import { toast } from "sonner";
import { useServiceCatalog } from "@/hooks/useModules";
import { useAddService } from "@/hooks/useModuleMutations";
import { ListPage } from "@/components/common/ListPage";
import { QuickFormDialog } from "@/components/common/QuickFormDialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { titleCase } from "@/lib/format";

const SERVICE_TYPES = [
  { value: "debt_resolution", label: "Debt Resolution" },
  { value: "consumer_defense", label: "Consumer Defense" },
];

function AddServiceAction() {
  const add = useAddService();
  return (
    <QuickFormDialog
      trigger={<Button size="sm">New service</Button>}
      title="New service"
      pending={add.isPending}
      fields={[
        { name: "name", label: "Name", required: true, full: true },
        {
          name: "service_type",
          label: "Type",
          type: "select",
          required: true,
          defaultValue: "debt_resolution",
          options: SERVICE_TYPES,
        },
        { name: "description", label: "Description", type: "textarea" },
      ]}
      onSubmit={async (v) => {
        try {
          await add.mutateAsync({
            name: v.name,
            service_type: v.service_type,
            description: v.description || null,
          });
          toast.success("Service added.");
        } catch (e) {
          toast.error((e as Error).message);
          throw e;
        }
      }}
    />
  );
}

export default function Services() {
  const q = useServiceCatalog();
  return (
    <ListPage
      title="Services"
      description="The program catalog clients can be enrolled in."
      query={q}
      action={<AddServiceAction />}
      searchText={(s) => `${s.name} ${s.service_type}`}
      empty="No services defined."
      columns={[
        { header: "Name", cell: (s) => s.name },
        { header: "Type", cell: (s) => titleCase(s.service_type) },
        { header: "Description", cell: (s) => s.description ?? "—" },
        {
          header: "Active",
          cell: (s) => <StatusBadge status={s.is_active ? "active" : "inactive"} />,
        },
      ]}
    />
  );
}
