import { useCreditors } from "@/hooks/useModules";
import { ListPage } from "@/components/common/ListPage";
import { StatusBadge } from "@/components/common/StatusBadge";
import { titleCase } from "@/lib/format";

export default function Creditors() {
  const q = useCreditors();
  return (
    <ListPage
      title="Creditors"
      description="Creditor directory."
      query={q}
      empty="No creditors yet."
      columns={[
        { header: "Name", cell: (c) => c.name },
        { header: "Type", cell: (c) => (c.creditor_type ? titleCase(c.creditor_type) : "—") },
        { header: "Phone", cell: (c) => c.phone ?? "—" },
        { header: "Email", cell: (c) => c.email ?? "—" },
        { header: "State", cell: (c) => c.state ?? "—" },
        {
          header: "Active",
          cell: (c) => <StatusBadge status={c.is_active ? "active" : "inactive"} />,
        },
      ]}
    />
  );
}
