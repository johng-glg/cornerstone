import { useServiceCatalog } from "@/hooks/useModules";
import { ListPage } from "@/components/common/ListPage";
import { StatusBadge } from "@/components/common/StatusBadge";
import { titleCase } from "@/lib/format";

export default function Services() {
  const q = useServiceCatalog();
  return (
    <ListPage
      title="Services"
      description="The program catalog clients can be enrolled in."
      query={q}
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
