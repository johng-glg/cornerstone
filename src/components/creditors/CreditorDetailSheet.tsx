import { useState } from 'react';
import { NotesPanel } from '@/components/notes/NotesPanel';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Phone, Mail, MapPin, Building2, FileText, Plus, Edit, Trash2, User, Scale } from 'lucide-react';
import { useCreditor } from '@/hooks/useCreditors';
import { useLiabilities } from '@/hooks/useLiabilities';
import { useCreditorContacts, useDeleteCreditorContact, type CreditorContact } from '@/hooks/useCreditorContacts';
import { useLitigationMatters } from '@/hooks/useLitigationMatters';
import { CreditorContactFormDialog } from './CreditorContactFormDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  const { data: liabilitiesResult } = useLiabilities();
  const { data: contacts } = useCreditorContacts(creditorId || undefined);
  const { data: allMatters } = useLitigationMatters();
  const deleteContact = useDeleteCreditorContact();

  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<CreditorContact | null>(null);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);
  
  // Filter liabilities where this creditor is original, current, or servicing
  const relatedLiabilities = liabilitiesResult?.data?.filter(
    l => l.original_creditor_id === creditorId || l.current_creditor_id === creditorId || (l as any).servicing_creditor_id === creditorId
  ) || [];

  // Aggregate balances
  const totalOriginalBalance = relatedLiabilities.reduce((sum, l) => sum + (l.original_balance || 0), 0);
  const totalCurrentBalance = relatedLiabilities.reduce((sum, l) => sum + (l.current_balance || 0), 0);

  // Filter litigation matters where this creditor is opposing counsel
  const relatedMatters = allMatters?.filter(
    m => (m as any).opposing_creditor_id === creditorId
  ) || [];

  const hasAddress = creditor?.address_line1 || creditor?.city || creditor?.state;

  const handleEditContact = (contact: CreditorContact) => {
    setEditingContact(contact);
    setContactDialogOpen(true);
  };

  const confirmDeleteContact = () => {
    if (deletingContactId) {
      deleteContact.mutate(deletingContactId, {
        onSuccess: () => setDeletingContactId(null),
      });
    }
  };

  return (
    <>
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

                {/* Contacts / Attorneys Section */}
                <Separator />
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Contacts ({contacts?.length || 0})
                    </h4>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setEditingContact(null);
                        setContactDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Contact
                    </Button>
                  </div>

                  {contacts && contacts.length > 0 ? (
                    <div className="space-y-2">
                      {contacts.map((contact) => (
                        <Card key={contact.id} className="cursor-pointer hover:bg-muted/50">
                          <CardContent className="py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                                <User className="h-4 w-4 text-secondary-foreground" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  {contact.first_name} {contact.last_name}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  {contact.title && <span>{contact.title}</span>}
                                  {contact.email && (
                                    <>
                                      {contact.title && <span>•</span>}
                                      <span>{contact.email}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditContact(contact);
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingContactId(contact.id);
                                }}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground border rounded-lg border-dashed">
                      <User className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No contacts added</p>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {creditorId && <NotesPanel entityType="creditor" entityId={creditorId} flat />}

                <Separator />

                {/* Litigation Matters */}
                {relatedMatters.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Scale className="h-4 w-4 text-muted-foreground" />
                      <h4 className="text-sm font-medium">Litigation Matters ({relatedMatters.length})</h4>
                    </div>
                    
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Case #</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {relatedMatters.slice(0, 10).map((matter) => (
                          <TableRow key={matter.id}>
                            <TableCell className="text-sm font-medium">
                              {matter.case_number || 'Pending'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs capitalize">
                                {matter.status.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {formatCurrency(matter.liability?.current_balance ?? null)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <Separator />

                {/* Related Liabilities */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium">Related Liabilities ({relatedLiabilities.length})</h4>
                  </div>

                  {/* Aggregate Balance Summary */}
                  {relatedLiabilities.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      <Card>
                        <CardContent className="p-3 text-center">
                          <p className="text-xs text-muted-foreground">Total Original</p>
                          <p className="text-lg font-semibold">{formatCurrency(totalOriginalBalance)}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-3 text-center">
                          <p className="text-xs text-muted-foreground">Total Current</p>
                          <p className="text-lg font-semibold">{formatCurrency(totalCurrentBalance)}</p>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                  
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

      {/* Contact Form Dialog */}
      {creditorId && (
        <CreditorContactFormDialog
          open={contactDialogOpen}
          onOpenChange={(open) => {
            setContactDialogOpen(open);
            if (!open) setEditingContact(null);
          }}
          creditorId={creditorId}
          contact={editingContact}
        />
      )}

      {/* Delete Contact Confirmation */}
      <AlertDialog open={!!deletingContactId} onOpenChange={(open) => !open && setDeletingContactId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the contact from this creditor. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteContact} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
