import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Phone, Mail, MapPin, Building2, FileText } from 'lucide-react';
import { useCreditor } from '@/hooks/useCreditors';
import { useLiabilities } from '@/hooks/useLiabilities';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface CreditorDetailSheetProps {
  creditorId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}

const creditorTypeLabels: Record<string, string> = {
  original_creditor: 'Original Creditor',
  collection_agency: 'Collection Agency',
  law_firm: 'Law Firm',
  debt_buyer: 'Debt Buyer',
};

const creditorTypeBadgeColors: Record<string, string> = {
  original_creditor: 'bg-blue-100 text-blue-800',
  collection_agency: 'bg-orange-100 text-orange-800',
  law_firm: 'bg-purple-100 text-purple-800',
  debt_buyer: 'bg-red-100 text-red-800',
};

const formatCurrency = (amount: number | null) =>
  amount ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount) : '—';

export function CreditorDetailSheet({ creditorId, open, onOpenChange, onEdit }: CreditorDetailSheetProps) {
  const { data: creditor, isLoading } = useCreditor(creditorId || undefined);
  const { data: allLiabilities } = useLiabilities();
  
  // Filter liabilities where this creditor is original or current
  const relatedLiabilities = allLiabilities?.filter(
    l => l.original_creditor_id === creditorId || l.current_creditor_id === creditorId
  ) || [];

  const hasAddress = creditor?.address_line1 || creditor?.city || creditor?.state;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : creditor ? (
          <>
            <SheetHeader className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <SheetTitle className="text-xl flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {creditor.name}
                  </SheetTitle>
                </div>
                <Button variant="outline" size="sm" onClick={onEdit}>
                  Edit
                </Button>
              </div>
              
              <Badge className={creditorTypeBadgeColors[creditor.creditor_type]}>
                {creditorTypeLabels[creditor.creditor_type]}
              </Badge>
            </SheetHeader>

            <Separator className="my-4" />

            <div className="space-y-6">
              {/* Contact Information */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Contact Information</h4>
                
                {creditor.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{creditor.phone}</span>
                  </div>
                )}
                
                {creditor.fax && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{creditor.fax} (Fax)</span>
                  </div>
                )}
                
                {creditor.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{creditor.email}</span>
                  </div>
                )}
                
                {hasAddress && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      {creditor.address_line1 && <p>{creditor.address_line1}</p>}
                      {creditor.address_line2 && <p>{creditor.address_line2}</p>}
                      {(creditor.city || creditor.state || creditor.zip_code) && (
                        <p>
                          {creditor.city}{creditor.city && creditor.state && ', '}
                          {creditor.state} {creditor.zip_code}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {!creditor.phone && !creditor.fax && !creditor.email && !hasAddress && (
                  <p className="text-sm text-muted-foreground">No contact information</p>
                )}
              </div>

              {/* Notes */}
              {creditor.notes && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Notes</h4>
                  <p className="text-sm whitespace-pre-wrap">{creditor.notes}</p>
                </div>
              )}

              <Separator />

              {/* Related Liabilities */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium">Related Liabilities ({relatedLiabilities.length})</h4>
                </div>
                
                {relatedLiabilities.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Service</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {relatedLiabilities.slice(0, 10).map((liability) => (
                        <TableRow key={liability.id}>
                          <TableCell className="text-sm">
                            {liability.client_service?.service_number || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {liability.original_creditor_id === creditorId ? 'Original' : 'Current'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatCurrency(liability.current_balance)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No liabilities assigned to this creditor
                  </p>
                )}
                
                {relatedLiabilities.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center">
                    Showing first 10 of {relatedLiabilities.length} liabilities
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground">Creditor not found</p>
        )}
      </SheetContent>
    </Sheet>
  );
}
