import { useCompaniesList } from "@/hooks/useModules";
import { ListPage } from "@/components/common/ListPage";
import { StatusBadge } from "@/components/common/StatusBadge";
import { titleCase } from "@/lib/format";

export default function Companies() {
  const q = useCompaniesList();
  return (
    <ListPage
      title="Companies"
      description="Tenant companies you can access."
      query={q}
      empty="No companies."
      columns={[
        { header: "Name", cell: (c) => c.name },
        { header: "Type", cell: (c) => titleCase(c.company_type) },
        { header: "City", cell: (c) => c.city ?? "—" },
        { header: "State", cell: (c) => c.state ?? "—" },
        {
          header: "Active",
          cell: (c) => <StatusBadge status={c.is_active ? "active" : "inactive"} />,
        },
      ]}
    />
  );
}
