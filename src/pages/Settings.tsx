import { useAuth } from "@/lib/auth";
import { MfaCard } from "@/components/settings/MfaCard";
import { FeatureFlagsCard } from "@/components/settings/FeatureFlagsCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Settings() {
  const { staff, roles } = useAuth();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profile</CardTitle>
          <CardDescription>Your account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Name: </span>
            {staff ? `${staff.first_name} ${staff.last_name}` : "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Email: </span>
            {staff?.email ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Roles: </span>
            {roles.length ? roles.join(", ") : "—"}
          </p>
        </CardContent>
      </Card>

      <FeatureFlagsCard />

      <MfaCard />
    </div>
  );
}
