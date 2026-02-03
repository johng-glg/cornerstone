import { useState } from 'react';
import { FileSignature, Plus, ExternalLink, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSignatureRequests } from '@/hooks/useSignatureRequests';
import { SendSignatureWizard } from './SendSignatureWizard';
import { SignatureRequestSheet } from './SignatureRequestSheet';
import { SignerCard } from './SignerCard';
import type { SignatureRequest, SignatureRequestStatus } from '@/types/esign';
import { SIGNATURE_REQUEST_STATUS_LABELS } from '@/types/esign';

interface SignatureRequestsPanelProps {
  entityType: 'lead' | 'client';
  entityId: string;
  entityData?: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
}

const statusVariants: Record<SignatureRequestStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  queued: 'secondary',
  sent: 'outline',
  viewed: 'outline',
  partially_signed: 'outline',
  completed: 'default',
  declined: 'destructive',
  expired: 'destructive',
  canceled: 'secondary',
  error: 'destructive',
};

export function SignatureRequestsPanel({ 
  entityType, 
  entityId,
  entityData,
}: SignatureRequestsPanelProps) {
  const [showWizard, setShowWizard] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<SignatureRequest | null>(null);
  
  const { data: requests, isLoading } = useSignatureRequests(entityType, entityId);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileSignature className="h-4 w-4" />
            Signature Requests
          </CardTitle>
          <Button size="sm" onClick={() => setShowWizard(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Send for Signature
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : !requests || requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileSignature className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No signature requests yet</p>
              <p className="text-xs mt-1">Click "Send for Signature" to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <SignatureRequestCard 
                  key={request.id} 
                  request={request}
                  onViewDetails={() => setSelectedRequest(request)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send Wizard */}
      <SendSignatureWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        entityType={entityType}
        entityId={entityId}
        entityData={entityData}
      />

      {/* Detail Sheet */}
      <SignatureRequestSheet
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
      />
    </>
  );
}

interface SignatureRequestCardProps {
  request: SignatureRequest;
  onViewDetails: () => void;
}

function SignatureRequestCard({ request, onViewDetails }: SignatureRequestCardProps) {
  const statusLabel = SIGNATURE_REQUEST_STATUS_LABELS[request.status];
  
  return (
    <div className="border rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium text-sm">{request.title}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(new Date(request.created_at), 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusVariants[request.status]}>
            {statusLabel}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onViewDetails}>
                View Details
              </DropdownMenuItem>
              {request.executed_pdf_url && (
                <DropdownMenuItem asChild>
                  <a href={request.executed_pdf_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Signed PDF
                  </a>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Signers */}
      {request.signers && request.signers.length > 0 && (
        <div className="space-y-2">
          {request.signers.map((signer) => (
            <SignerCard key={signer.id} signer={signer} />
          ))}
        </div>
      )}
    </div>
  );
}
