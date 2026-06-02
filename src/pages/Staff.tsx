import { useStaffList } from "@/hooks/useModules";
import { ListPage } from "@/components/common/ListPage";
import { StatusBadge } from "@/components/common/StatusBadge";
import { titleCase } from "@/lib/format";

export default function Staff() {
  const q = useStaffList();
  return (
    <ListPage
      title="Staff"
      description="People in your firm."
      query={q}
      searchText={(s) =>
        `${s.first_name} ${s.last_name} ${s.email} ${s.department} ${s.job_title ?? ""}`
      }
      empty="No staff yet."
      columns={[
        { header: "Name", cell: (s) => `${s.first_name} ${s.last_name}` },
        { header: "Email", cell: (s) => s.email },
        { header: "Department", cell: (s) => titleCase(s.department) },
        { header: "Title", cell: (s) => s.job_title ?? "—" },
        {
          header: "Active",
          cell: (s) => <StatusBadge status={s.is_active ? "active" : "inactive"} />,
        },
      ]}
    />
  );
}
