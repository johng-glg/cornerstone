import { SignatureRequestsPanel } from '@/components/esign/SignatureRequestsPanel';

interface ClientSignaturesTabProps {
  clientId: string;
  clientData?: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
}

export function ClientSignaturesTab({ clientId, clientData }: ClientSignaturesTabProps) {
  return (
    <div className="space-y-6">
      <SignatureRequestsPanel
        entityType="client"
        entityId={clientId}
        entityData={clientData}
      />
    </div>
  );
}
