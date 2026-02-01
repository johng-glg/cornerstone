import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Building2, FileText, Plus, Handshake, History, Calculator } from 'lucide-react';
import { useLiability } from '@/hooks/useLiabilities';
import { useSettlements } from '@/hooks/useSettlements';
import { useClientService } from '@/hooks/useClientServices';
import { Skeleton } from '@/components/ui/skeleton';
import { SettlementFormDialog } from './SettlementFormDialog';
import { SettlementCard } from './SettlementCard';
import { LiabilityActionsTimeline } from './LiabilityActionsTimeline';
import { SettlementOfferBuilder } from './SettlementOfferBuilder';

interface LiabilityDetailSheetProps {
  liabilityId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}

const statusBadgeColors: Record<string, string> = {
  enrolled: 'bg-blue-100 text-blue-800',
  in_negotiation: 'bg-yellow-100 text-yellow-800',
  settled: 'bg-green-100 text-green-800',
  in_litigation: 'bg-red-100 text-red-800',
  dismissed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-gray-100 text-gray-400',
};

const statusLabels: Record<string, string> = {
  enrolled: 'Enrolled',
  in_negotiation: 'In Negotiation',
  settled: 'Settled',
  in_litigation: 'In Litigation',
  dismissed: 'Dismissed',
  cancelled: 'Cancelled',
};

const typeLabels: Record<string, string> = {
  credit_card: 'Credit Card',
  medical: 'Medical',
  auto_loan: 'Auto Loan',
  personal_loan: 'Personal Loan',
  student_loan: 'Student Loan',
  mortgage: 'Mortgage',
  other: 'Other',
};

const formatCurrency = (amount: number | null) =>
  amount ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount) : '—';

const maskAccountNumber = (num: string | null) =>
  num ? `****${num.slice(-4)}` : 'N/A';

export function LiabilityDetailSheet({ liabilityId, open, onOpenChange, onEdit }: LiabilityDetailSheetProps) {
  const { data: liability, isLoading } = useLiability(liabilityId || undefined);
  const { data: settlements } = useSettlements(liabilityId || undefined);
  const { data: clientService } = useClientService(liability?.client_service_id);
  const [showSettlementForm, setShowSettlementForm] = useState(false);
  const [showOfferBuilder, setShowOfferBuilder] = useState(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : liability ? (
          <>
            <SheetHeader className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <SheetTitle className="text-xl flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    {typeLabels[liability.liability_type]}
                  </SheetTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Account: {maskAccountNumber(liability.account_number)}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={onEdit}>
                  Edit
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Badge className={statusBadgeColors[liability.status]}>
                  {statusLabels[liability.status]}
                </Badge>
                {liability.priority && liability.priority > 0 && (
                  <Badge variant="outline">Priority: {liability.priority}</Badge>
                )}
              </div>
            </SheetHeader>

            <Separator className="my-4" />

            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="settlements">Settlements</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
                {/* Balances Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Balances
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Original</p>
                        <p className="text-lg font-semibold">{formatCurrency(liability.original_balance)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Enrolled</p>
                        <p className="text-lg font-semibold">{formatCurrency(liability.enrolled_balance)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Current</p>
                        <p className="text-lg font-semibold text-primary">{formatCurrency(liability.current_balance)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Creditors */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Creditors
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Original Creditor</p>
                      <p className="font-medium">
                        {liability.original_creditor?.name || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Current Creditor</p>
                      <p className="font-medium">
                        {liability.current_creditor?.name || liability.original_creditor?.name || 'Not specified'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Service Link */}
                {liability.client_service && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Service
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="font-medium">{liability.client_service.service_number}</p>
                      {liability.client_service.primary_client && (
                        <p className="text-sm text-muted-foreground">
                          {liability.client_service.primary_client.first_name} {liability.client_service.primary_client.last_name}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Notes */}
                {liability.notes && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{liability.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="settlements" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Handshake className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium">Settlement Offers</h4>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setShowSettlementForm(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Quick Offer
                    </Button>
                    <Button size="sm" onClick={() => setShowOfferBuilder(true)}>
                      <Calculator className="h-4 w-4 mr-1" />
                      Build Offer
                    </Button>
                  </div>
                </div>

                {settlements && settlements.length > 0 ? (
                  <div className="space-y-4">
                    {settlements.map((settlement) => (
                      <SettlementCard key={settlement.id} settlement={settlement} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No settlement offers yet
                  </p>
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-4 mt-4">
                <div className="flex items-center gap-2 mb-4">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-medium">Activity Timeline</h4>
                </div>
                <LiabilityActionsTimeline liabilityId={liabilityId!} />
              </TabsContent>
            </Tabs>

            {/* Settlement Form (Quick) */}
            {showSettlementForm && liabilityId && (
              <SettlementFormDialog
                open={showSettlementForm}
                onOpenChange={setShowSettlementForm}
                liabilityId={liabilityId}
              />
            )}

            {/* Settlement Offer Builder (Advanced) */}
            {showOfferBuilder && liabilityId && liability?.client_service_id && (
              <SettlementOfferBuilder
                open={showOfferBuilder}
                onOpenChange={setShowOfferBuilder}
                liabilityId={liabilityId}
                clientServiceId={liability.client_service_id}
                currentEscrowBalance={clientService?.escrow_balance || 0}
                monthlyDraft={clientService?.monthly_payment || 0}
              />
            )}
          </>
        ) : (
          <p className="text-muted-foreground">Liability not found</p>
        )}
      </SheetContent>
    </Sheet>
  );
}
