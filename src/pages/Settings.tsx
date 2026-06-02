import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { MfaCard } from "@/components/settings/MfaCard";
import { FeatureFlagsCard } from "@/components/settings/FeatureFlagsCard";
import { ProfileSettingsTab } from "@/components/settings/ProfileSettingsTab";
import { NotificationSettingsTab } from "@/components/settings/NotificationSettingsTab";
import { CompanySettingsTab } from "@/components/settings/CompanySettingsTab";
import { ReminderSettingsTab } from "@/components/settings/ReminderSettingsTab";
import { NsfRetrySettingsTab } from "@/components/settings/NsfRetrySettingsTab";
import { ScoringProfilesSettingsTab } from "@/components/settings/ScoringProfilesSettingsTab";
import { EsignTemplatesSettingsTab } from "@/components/settings/EsignTemplatesSettingsTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const CONFIG_LINKS = [
  { to: "/lead-rules", label: "Assignment Rules" },
  { to: "/workflows", label: "Workflows" },
  { to: "/task-templates", label: "Task Templates" },
  { to: "/litigation-teams", label: "Litigation Teams" },
  { to: "/templates", label: "Templates" },
  { to: "/integrations", label: "Integrations" },
  { to: "/creditors", label: "Creditors" },
  { to: "/services", label: "Services" },
  { to: "/staff", label: "Staff" },
];

function ConfigurationTab({ isAdmin }: { isAdmin: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Configuration</CardTitle>
        <CardDescription>Firm-wide setup lives on these pages.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2">
          {CONFIG_LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="text-sm text-guardian-gold hover:underline">
              → {l.label}
            </Link>
          ))}
          {isAdmin && (
            <Link to="/companies" className="text-sm text-guardian-gold hover:underline">
              → Companies
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <Tabs defaultValue="profile">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          {isAdmin && <TabsTrigger value="reminders">Reminders</TabsTrigger>}
          {isAdmin && <TabsTrigger value="nsf">NSF Retry</TabsTrigger>}
          {isAdmin && <TabsTrigger value="scoring">Scoring</TabsTrigger>}
          {isAdmin && <TabsTrigger value="esign">E-sign</TabsTrigger>}
          {isAdmin && <TabsTrigger value="company">Company</TabsTrigger>}
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="flags">Feature Flags</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="max-w-2xl pt-4">
          <ProfileSettingsTab />
        </TabsContent>
        <TabsContent value="notifications" className="max-w-2xl pt-4">
          <NotificationSettingsTab />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="reminders" className="max-w-2xl pt-4">
            <ReminderSettingsTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="nsf" className="max-w-3xl pt-4">
            <NsfRetrySettingsTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="scoring" className="max-w-3xl pt-4">
            <ScoringProfilesSettingsTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="esign" className="max-w-3xl pt-4">
            <EsignTemplatesSettingsTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="company" className="max-w-2xl pt-4">
            <CompanySettingsTab />
          </TabsContent>
        )}
        <TabsContent value="security" className="max-w-2xl pt-4">
          <MfaCard />
        </TabsContent>
        <TabsContent value="flags" className="max-w-2xl pt-4">
          <FeatureFlagsCard />
        </TabsContent>
        <TabsContent value="config" className="max-w-2xl pt-4">
          <ConfigurationTab isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
