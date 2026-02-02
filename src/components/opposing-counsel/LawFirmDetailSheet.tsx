import { useState } from 'react';
import { format } from 'date-fns';
import { Building2, Phone, Mail, MapPin, Edit, Plus, User, Trash2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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
import { useLawFirm, useDeleteLawFirm } from '@/hooks/useLawFirms';
import { useLawFirmContacts, useDeleteLawFirmContact, type LawFirmContact } from '@/hooks/useLawFirmContacts';
import { LawFirmContactFormDialog } from './LawFirmContactFormDialog';

interface LawFirmDetailSheetProps {
  firmId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}

export function LawFirmDetailSheet({ firmId, open, onOpenChange, onEdit }: LawFirmDetailSheetProps) {
  const { data: firm, isLoading } = useLawFirm(firmId || undefined);
  const { data: contacts } = useLawFirmContacts(firmId || undefined);
  const deleteFirm = useDeleteLawFirm();
  const deleteContact = useDeleteLawFirmContact();

  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<LawFirmContact | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);

  const handleEditContact = (contact: LawFirmContact) => {
    setEditingContact(contact);
    setContactDialogOpen(true);
  };

  const handleDeleteFirm = () => {
    if (firmId) {
      deleteFirm.mutate(firmId, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          onOpenChange(false);
        },
      });
    }
  };

  const handleDeleteContact = (contactId: string) => {
    setDeletingContactId(contactId);
  };

  const confirmDeleteContact = () => {
    if (deletingContactId) {
      deleteContact.mutate(deletingContactId, {
        onSuccess: () => setDeletingContactId(null),
      });
    }
  };

  if (!firmId) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : firm ? (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <SheetTitle className="text-xl flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      {firm.name}
                    </SheetTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Added {format(new Date(firm.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={onEdit}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setDeleteDialogOpen(true)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </SheetHeader>

              <div className="space-y-6 mt-4">
                {/* Contact Info */}
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    <h4 className="font-medium">Contact Information</h4>
                    <div className="grid gap-3 text-sm">
                      {firm.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{firm.phone}</span>
                        </div>
                      )}
                      {firm.fax && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="text-xs">Fax:</span>
                          <span className="text-foreground">{firm.fax}</span>
                        </div>
                      )}
                      {firm.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{firm.email}</span>
                        </div>
                      )}
                      {(firm.address_line1 || firm.city) && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            {firm.address_line1 && <p>{firm.address_line1}</p>}
                            {firm.address_line2 && <p>{firm.address_line2}</p>}
                            {(firm.city || firm.state || firm.zip_code) && (
                              <p>
                                {[firm.city, firm.state].filter(Boolean).join(', ')}
                                {firm.zip_code && ` ${firm.zip_code}`}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      {!firm.phone && !firm.email && !firm.address_line1 && (
                        <p className="text-muted-foreground">No contact information added</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Notes */}
                {firm.notes && (
                  <Card>
                    <CardContent className="pt-4">
                      <h4 className="font-medium mb-2">Notes</h4>
                      <p className="text-sm whitespace-pre-wrap">{firm.notes}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Contacts */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Attorneys & Contacts</h4>
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
                                  handleDeleteContact(contact.id);
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
                    <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                      <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No contacts added</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Law firm not found
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Contact Form Dialog */}
      {firmId && (
        <LawFirmContactFormDialog
          open={contactDialogOpen}
          onOpenChange={setContactDialogOpen}
          lawFirmId={firmId}
          contact={editingContact}
        />
      )}

      {/* Delete Firm Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Law Firm?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the law firm and all associated contacts from the directory.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFirm} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Contact Confirmation */}
      <AlertDialog open={!!deletingContactId} onOpenChange={(open) => !open && setDeletingContactId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the contact from the directory. This action cannot be undone.
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
