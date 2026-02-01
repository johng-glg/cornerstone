import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useClient } from '@/hooks/useClients';
import { ClientFormDialog } from '@/components/clients/ClientFormDialog';
import { ClientHeader } from '@/components/clients/detail/ClientHeader';
import { ClientOverviewTab } from '@/components/clients/detail/ClientOverviewTab';
import { ClientServicesTab } from '@/components/clients/detail/ClientServicesTab';
import { ClientLiabilitiesTab } from '@/components/clients/detail/ClientLiabilitiesTab';
import { ClientPaymentsTab } from '@/components/clients/detail/ClientPaymentsTab';
import { ClientTasksTab } from '@/components/clients/detail/ClientTasksTab';
import { ClientDetailsTab } from '@/components/clients/detail/ClientDetailsTab';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: client, isLoading } = useClient(id);
  const [showEditForm, setShowEditForm] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  if (isLoading) {
    return (
      <div className="h-full">
        <div className="border-b p-6">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="p-6">
          <Skeleton className="h-10 w-full max-w-md mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Client Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The client you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => navigate('/clients')}
            className="text-primary hover:underline"
          >
            Back to Clients
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Client Header */}
      <ClientHeader 
        client={client} 
        onEdit={() => setShowEditForm(true)} 
      />

      {/* Tabs */}
      <div className="flex-1 overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <div className="border-b px-6 sticky top-0 bg-background z-10">
            <TabsList className="h-12">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="liabilities">Liabilities</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="comms" disabled>Comms</TabsTrigger>
              <TabsTrigger value="documents" disabled>Documents</TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6">
            <TabsContent value="overview" className="mt-0">
              <ClientOverviewTab
                clientId={client.id}
                onViewServices={() => setActiveTab('services')}
                onViewTasks={() => setActiveTab('tasks')}
              />
            </TabsContent>

            <TabsContent value="services" className="mt-0">
              <ClientServicesTab clientId={client.id} />
            </TabsContent>

            <TabsContent value="liabilities" className="mt-0">
              <ClientLiabilitiesTab clientId={client.id} />
            </TabsContent>

            <TabsContent value="payments" className="mt-0">
              <ClientPaymentsTab clientId={client.id} />
            </TabsContent>

            <TabsContent value="tasks" className="mt-0">
              <ClientTasksTab clientId={client.id} />
            </TabsContent>

            <TabsContent value="details" className="mt-0">
              <ClientDetailsTab client={client} />
            </TabsContent>

            <TabsContent value="comms" className="mt-0">
              <div className="border rounded-lg p-8 text-center text-muted-foreground">
                Communications feature coming soon...
              </div>
            </TabsContent>

            <TabsContent value="documents" className="mt-0">
              <div className="border rounded-lg p-8 text-center text-muted-foreground">
                Documents feature coming soon...
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Edit Form Dialog */}
      <ClientFormDialog
        open={showEditForm}
        onOpenChange={setShowEditForm}
        client={client}
      />
    </div>
  );
}
