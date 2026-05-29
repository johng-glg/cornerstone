import { useAuth } from "@/lib/auth";

export default function Dashboard() {
  const { staff } = useAuth();
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-muted-foreground">
        Welcome{staff ? `, ${staff.first_name}` : ""}. Modules arrive in subsequent Phase A PRs.
      </p>
    </div>
  );
}
