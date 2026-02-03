import { format } from 'date-fns';
import { 
  FileSignature, X, ExternalLink, Clock, 
  Send, XCircle, Bell, Download 
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSignatureRequest, useCancelSignatureRequest, useResendSignatureReminder } from '@/hooks/useSignatureRequests';
import { SignerCard } from './SignerCard';
import { SignatureTimeline } from './SignatureTimeline';
import { useToast } from '@/hooks/use-toast';
import type { SignatureRequest, SignatureRequestStatus } from '@/types/esign';
import { 
  SIGNATURE_REQUEST_STATUS_LABELS, 
  DELIVERY_METHOD_LABELS,
  SIGNING_MODE_LABELS,
} from '@/types/esign';

interface SignatureRequestSheetProps {
  request: SignatureRequest | null;
  onClose: () => void;
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

export function SignatureRequestSheet({ request, onClose }: SignatureRequestSheetProps) {
  const { toast } = useToast();
  const { data: fullRequest, isLoading } = useSignatureRequest(request?.id);
  const cancelRequest = useCancelSignatureRequest();
  const resendReminder = useResendSignatureReminder();

  const displayRequest = fullRequest || request;

  const handleCancel = async () => {
    if (!displayRequest) return;
    
    try {
      await cancelRequest.mutateAsync(displayRequest.id);
      toast({
        title: 'Request canceled',
        description: 'The signature request has been canceled.',
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to cancel request',
        variant: 'destructive',
      });
    }
  };

  const handleResend = async (signerId?: string) => {
    if (!displayRequest) return;
    
    try {
      await resendReminder.mutateAsync({
        signatureRequestId: displayRequest.id,
        signerId,
      });
      toast({
        title: 'Reminder sent',
        description: 'A reminder has been sent to the signer(s).',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send reminder',
        variant: 'destructive',
      });
    }
  };

  const canCancel = displayRequest && ['draft', 'queued', 'sent', 'viewed', 'partially_signed'].includes(displayRequest.status);
  const canResend = displayRequest && ['sent', 'viewed', 'partially_signed'].includes(displayRequest.status);

  return (
    <Sheet open={!!request} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <FileSignature className="h-5 w-5" />
              <SheetTitle className="text-lg">{displayRequest?.title}</SheetTitle>
            </div>
            {displayRequest && (
              <Badge variant={statusVariants[displayRequest.status]}>
                {SIGNATURE_REQUEST_STATUS_LABELS[displayRequest.status]}
              </Badge>
            )}
          </div>
        </SheetHeader>

        {displayRequest && (
          <div className="mt-6 space-y-6">
            {/* Quick Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Created</span>
                <p className="font-medium">
                  {format(new Date(displayRequest.created_at), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
              {displayRequest.expires_at && (
                <div>
                  <span className="text-muted-foreground">Expires</span>
                  <p className="font-medium">
                    {format(new Date(displayRequest.expires_at), 'MMM d, yyyy')}
                  </p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Delivery</span>
                <p className="font-medium">
                  {DELIVERY_METHOD_LABELS[displayRequest.delivery_method]}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Signing Order</span>
                <p className="font-medium">
                  {SIGNING_MODE_LABELS[displayRequest.signing_mode]}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {canResend && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleResend()}
                  disabled={resendReminder.isPending}
                >
                  <Bell className="h-4 w-4 mr-1" />
                  Send Reminder
                </Button>
              )}
              {displayRequest.executed_pdf_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={displayRequest.executed_pdf_url} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-1" />
                    Download PDF
                  </a>
                </Button>
              )}
              {displayRequest.certificate_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={displayRequest.certificate_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Certificate
                  </a>
                </Button>
              )}
              {canCancel && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleCancel}
                  disabled={cancelRequest.isPending}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              )}
            </div>

            <Separator />

            {/* Tabs: Signers / Timeline */}
            <Tabs defaultValue="signers" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="signers" className="flex-1">
                  Signers
                </TabsTrigger>
                <TabsTrigger value="timeline" className="flex-1">
                  Timeline
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signers" className="mt-4 space-y-3">
                {displayRequest.signers?.map((signer) => (
                  <SignerCard
                    key={signer.id}
                    signer={signer}
                    showActions={canResend}
                    onResend={() => handleResend(signer.id)}
                  />
                ))}
                {(!displayRequest.signers || displayRequest.signers.length === 0) && (
                  <p className="text-center text-muted-foreground py-4">
                    No signers configured
                  </p>
                )}
              </TabsContent>

              <TabsContent value="timeline" className="mt-4">
                <SignatureTimeline events={displayRequest.events || []} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
