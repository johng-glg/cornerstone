import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileSettingsTab } from '@/components/settings/ProfileSettingsTab';
import { AppearanceSettingsTab } from '@/components/settings/AppearanceSettingsTab';
import { CompanySettingsTab } from '@/components/settings/CompanySettingsTab';

export default function SettingsPage() {
  return (
    <div className="h-full flex flex-col">
      <div className="border-b px-6 py-4">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <Tabs defaultValue="profile" className="max-w-3xl">
          <TabsList className="mb-6">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="company">Company</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <ProfileSettingsTab />
          </TabsContent>

          <TabsContent value="appearance">
            <AppearanceSettingsTab />
          </TabsContent>

          <TabsContent value="company">
            <CompanySettingsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
