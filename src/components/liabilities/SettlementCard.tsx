import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X, CheckCircle, Gavel, AlertCircle, Trash2, Send } from 'lucide-react';
import { 
  useApproveSettlement, 
  useAcceptSettlement, 
  useRejectSettlement, 
  useCompleteSettlement,
  useDeleteSettlement,
  type Settlement 
} from '@/hooks/useSettlements';
import { useSendForthPaymentToCreditor } from '@/hooks/useForthApi';
import { useAuth } from '@/lib/auth';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SettlementCardProps {
  settlement: Settlement;
}

const statusBadgeColors: Record<string, string> = {
  offered: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  completed: 'bg-emerald-100 text-emerald-800',
  defaulted: 'bg-orange-100 text-orange-800',
  cancelled: 'bg-gray-100 text-gray-500',
};

const statusLabels: Record<string, string> = {
  offered: 'Offered',
  accepted: 'Accepted',
  rejected: 'Rejected',
  completed: 'Completed',
  defaulted: 'Defaulted',
  cancelled: 'Deleted',
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

type ConfirmAction = 'approve' | 'accept' | 'delete' | null;

export function SettlementCard({ settlement }: SettlementCardProps) {
  const { staff, hasRole } = useAuth();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  
  const approveSettlement = useApproveSettlement();
  const acceptSettlement = useAcceptSettlement();
  const rejectSettlement = useRejectSettlement();
  const completeSettlement = useCompleteSettlement();
  const deleteSettlement = useDeleteSettlement();
  const sendPayment = useSendForthPaymentToCreditor();

  // Cornerstone Phase 3D: external_payment_id / payment_send_status are new columns;
  // cast until types regenerate.
  const settlementAny = settlement as unknown as Settlement & {
    external_payment_id?: string | null;
    payment_send_status?: string | null;
  };

  const isDeleted = settlement.status === 'cancelled';
  const canApprove = hasRole('attorney') || hasRole('admin');
  const needsApproval = !settlement.attorney_approved && settlement.status === 'offered';
  const canAcceptReject = settlement.attorney_approved && settlement.status === 'offered';
  const canComplete = settlement.status === 'accepted';
  const canDelete = !isDeleted && settlement.status !== 'completed';

  const handleApprove = () => {
    if (staff?.id) {
      approveSettlement.mutate({
        id: settlement.id,
        liabilityId: settlement.liability_id,
        offerAmount: settlement.offer_amount,
        staffId: staff.id,
      });
    }
    setConfirmAction(null);
  };

  const handleAccept = () => {
    acceptSettlement.mutate({
      id: settlement.id,
      liabilityId: settlement.liability_id,
      offerAmount: settlement.offer_amount,
      staffId: staff?.id,
    });
    setConfirmAction(null);
  };

  const handleComplete = () => {
    completeSettlement.mutate({
      id: settlement.id,
      liabilityId: settlement.liability_id,
      staffId: staff?.id,
    });
  };

  const handleDelete = () => {
    deleteSettlement.mutate({
      id: settlement.id,
      liabilityId: settlement.liability_id,
      offerAmount: settlement.offer_amount,
      staffId: staff?.id,
    });
    setConfirmAction(null);
  };

  const getConfirmDialogContent = () => {
    switch (confirmAction) {
      case 'approve':
        return {
          title: 'Approve Settlement Offer?',
          description: `You are about to approve the ${formatCurrency(settlement.offer_amount)} settlement offer. This confirms the offer meets legal requirements and can be presented to the client.`,
          actionLabel: 'Approve',
          actionClass: '',
          onConfirm: handleApprove,
        };
      case 'accept':
        return {
          title: 'Accept Settlement Offer?',
          description: `You are about to mark the ${formatCurrency(settlement.offer_amount)} settlement as accepted by the client. This will begin the payment process.`,
          actionLabel: 'Accept',
          actionClass: '',
          onConfirm: handleAccept,
        };
      case 'delete':
        return {
          title: 'Delete Settlement Offer?',
          description: `This will mark the ${formatCurrency(settlement.offer_amount)} settlement offer as deleted. It will remain visible in the history but can no longer be acted upon.`,
          actionLabel: 'Delete',
          actionClass: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
          onConfirm: handleDelete,
        };
      default:
        return null;
    }
  };

  const dialogContent = getConfirmDialogContent();

  return (
    <>
      <Card className={`overflow-hidden ${isDeleted ? 'opacity-60' : ''}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className={`text-lg ${isDeleted ? 'line-through text-muted-foreground' : ''}`}>
              {formatCurrency(settlement.offer_amount)}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className={statusBadgeColors[settlement.status]}>
                {statusLabels[settlement.status]}
              </Badge>
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => setConfirmAction('delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Details */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            {settlement.offer_percentage && (
              <div>
                <span className="text-muted-foreground">Percentage:</span>
                <span className="ml-1 font-medium">{settlement.offer_percentage.toFixed(1)}%</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Type:</span>
              <span className="ml-1 font-medium capitalize">
                {settlement.payment_type.replace('_', ' ')}
              </span>
            </div>
            {settlement.payment_type === 'payment_plan' && settlement.number_of_payments && (
              <div>
                <span className="text-muted-foreground">Payments:</span>
                <span className="ml-1 font-medium">{settlement.number_of_payments}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Offered:</span>
              <span className="ml-1">{format(new Date(settlement.offered_date), 'MMM d, yyyy')}</span>
            </div>
          </div>

          {/* Attorney Approval Status */}
          {!isDeleted && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              {settlement.attorney_approved ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700">
                    Approved by {settlement.attorney_approver?.first_name} {settlement.attorney_approver?.last_name}
                    {settlement.attorney_approved_date && (
                      <span className="text-muted-foreground ml-1">
                        on {format(new Date(settlement.attorney_approved_date), 'MMM d')}
                      </span>
                    )}
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-700">Pending attorney approval</span>
                </>
              )}
            </div>
          )}

          {/* Notes */}
          {settlement.notes && (
            <p className="text-sm text-muted-foreground">{settlement.notes}</p>
          )}

          {/* Action Buttons */}
          {!isDeleted && (
            <div className="flex flex-wrap gap-2 pt-2">
              {needsApproval && canApprove && (
                <Button 
                  size="sm" 
                  onClick={() => setConfirmAction('approve')}
                  disabled={approveSettlement.isPending}
                >
                  <Gavel className="h-4 w-4 mr-1" />
                  Approve
                </Button>
              )}
              
              {canAcceptReject && (
                <>
                  <Button 
                    size="sm" 
                    onClick={() => setConfirmAction('accept')}
                    disabled={acceptSettlement.isPending}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Accept
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => rejectSettlement.mutate(settlement.id)}
                    disabled={rejectSettlement.isPending}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </>
              )}
              
              {canComplete && (
                <Button 
                  size="sm" 
                  onClick={handleComplete}
                  disabled={completeSettlement.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Mark Complete
                </Button>
              )}

              {/* Cornerstone Phase 3D — Send disbursement to Forth Pay */}
              {settlement.status === 'accepted' && settlement.attorney_approved && !settlementAny.external_payment_id && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => sendPayment.mutate({ settlementId: settlement.id, paymentMethod: 'ach' })}
                  disabled={sendPayment.isPending || settlementAny.payment_send_status === 'sending'}
                >
                  <Send className="h-4 w-4 mr-1" />
                  {sendPayment.isPending || settlementAny.payment_send_status === 'sending' ? 'Sending…' : 'Send Payment'}
                </Button>
              )}

              {settlementAny.external_payment_id && (
                <Badge variant="outline" className="self-center">
                  Payment sent · {settlementAny.external_payment_id.slice(0, 12)}…
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogContent?.title}</AlertDialogTitle>
            <AlertDialogDescription>{dialogContent?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={dialogContent?.onConfirm}
              className={dialogContent?.actionClass}
            >
              {dialogContent?.actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}