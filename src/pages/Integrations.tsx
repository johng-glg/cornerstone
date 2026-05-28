import { IntegrationsSettingsTab } from '@/components/settings/IntegrationsSettingsTab';

export default function IntegrationsPage() {
  return (
    <div className="h-full flex flex-col">
      <div className="border-b px-6 py-4">
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">Manage third-party service connections</p>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <IntegrationsSettingsTab />
      </div>
    </div>
  );
}
