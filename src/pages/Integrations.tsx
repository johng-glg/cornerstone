import { useIntegrationProviders } from "@/hooks/useModules";
import { ListPage } from "@/components/common/ListPage";
import { StatusBadge } from "@/components/common/StatusBadge";
import { titleCase } from "@/lib/format";

export default function Integrations() {
  const q = useIntegrationProviders();
  return (
    <ListPage
      title="Integrations"
      description="Available connectors. Enable + credential management arrives with the edge-function deployment."
      query={q}
      empty="No integration providers."
      columns={[
        { header: "Provider", cell: (p) => p.display_name },
        { header: "Category", cell: (p) => titleCase(p.category) },
        { header: "Description", cell: (p) => p.description ?? "—" },
        {
          header: "Available",
          cell: (p) => <StatusBadge status={p.is_active ? "active" : "inactive"} />,
        },
      ]}
    />
  );
}
