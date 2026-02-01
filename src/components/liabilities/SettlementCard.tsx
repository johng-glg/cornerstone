import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X, CheckCircle, Gavel, AlertCircle, Trash2 } from 'lucide-react';
import { 
  useApproveSettlement, 
  useAcceptSettlement, 
  useRejectSettlement, 
  useCompleteSettlement,
  useDeleteSettlement,
  type Settlement 
} from '@/hooks/useSettlements';
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

export function SettlementCard({ settlement }: SettlementCardProps) {
  const { staff, hasRole } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const approveSettlement = useApproveSettlement();
  const acceptSettlement = useAcceptSettlement();
  const rejectSettlement = useRejectSettlement();
  const completeSettlement = useCompleteSettlement();
  const deleteSettlement = useDeleteSettlement();

  const isDeleted = settlement.status === 'cancelled';
  const canApprove = hasRole('attorney') || hasRole('admin');
  const needsApproval = !settlement.attorney_approved && settlement.status === 'offered';
  const canAcceptReject = settlement.attorney_approved && settlement.status === 'offered';
  const canComplete = settlement.status === 'accepted';
  const canDelete = !isDeleted && settlement.status !== 'completed';

  const handleApprove = () => {
    if (staff?.id) {
      approveSettlement.mutate({ id: settlement.id, staffId: staff.id });
    }
  };

  const handleAccept = () => {
    acceptSettlement.mutate({
      id: settlement.id,
      liabilityId: settlement.liability_id,
      offerAmount: settlement.offer_amount,
      staffId: staff?.id,
    });
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
    setShowDeleteConfirm(false);
  };

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
                  onClick={() => setShowDeleteConfirm(true)}
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
                  onClick={handleApprove}
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
                    onClick={handleAccept}
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Settlement Offer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the {formatCurrency(settlement.offer_amount)} settlement offer as deleted. 
              It will remain visible in the history but can no longer be acted upon.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Offer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}