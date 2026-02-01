import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, Mail, MapPin, Plus, Trash2, Check } from 'lucide-react';
import { useClient, useDeleteClientPhone, useDeleteClientAddress } from '@/hooks/useClients';
import { Skeleton } from '@/components/ui/skeleton';
import { ClientPhoneForm } from './ClientPhoneForm';
import { ClientAddressForm } from './ClientAddressForm';
import { format } from 'date-fns';

interface ClientDetailSheetProps {
  clientId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}

export function ClientDetailSheet({ clientId, open, onOpenChange, onEdit }: ClientDetailSheetProps) {
  const { data: client, isLoading } = useClient(clientId || undefined);
  const [showPhoneForm, setShowPhoneForm] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const deletePhone = useDeleteClientPhone();
  const deleteAddress = useDeleteClientAddress();

  const phoneTypeLabels: Record<string, string> = {
    mobile: 'Mobile',
    home: 'Home',
    work: 'Work',
    fax: 'Fax',
    other: 'Other',
  };

  const addressTypeLabels: Record<string, string> = {
    home: 'Home',
    work: 'Work',
    mailing: 'Mailing',
    other: 'Other',
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : client ? (
          <>
            <SheetHeader className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <SheetTitle className="text-xl">
                    {client.first_name} {client.middle_name ? `${client.middle_name} ` : ''}{client.last_name}
                  </SheetTitle>
                  {client.email && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Mail className="h-3 w-3" />
                      {client.email}
                    </p>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={onEdit}>
                  Edit
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {client.tcpa_consent && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    TCPA Consent
                  </Badge>
                )}
                {client.preferred_contact_method && (
                  <Badge variant="outline">
                    Preferred: {phoneTypeLabels[client.preferred_contact_method]}
                  </Badge>
                )}
              </div>
            </SheetHeader>

            <Separator className="my-4" />

            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="phones">Phones</TabsTrigger>
                <TabsTrigger value="addresses">Addresses</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                    <p className="text-sm">
                      {client.date_of_birth 
                        ? format(new Date(client.date_of_birth), 'MMM d, yyyy')
                        : 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Created</label>
                    <p className="text-sm">
                      {format(new Date(client.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>

                {client.tcpa_consent_date && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">TCPA Consent Date</label>
                    <p className="text-sm">
                      {format(new Date(client.tcpa_consent_date), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                )}

                {client.notes && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Notes</label>
                    <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="phones" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium">Phone Numbers</h4>
                  <Button size="sm" variant="outline" onClick={() => setShowPhoneForm(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Phone
                  </Button>
                </div>

                {client.phones && client.phones.length > 0 ? (
                  <div className="space-y-2">
                    {client.phones.map((phone) => (
                      <div key={phone.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{phone.phone_number}</p>
                            <p className="text-xs text-muted-foreground">
                              {phoneTypeLabels[phone.phone_type]}
                              {phone.is_primary && ' • Primary'}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deletePhone.mutate({ id: phone.id, clientId: client.id })}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No phone numbers added yet
                  </p>
                )}

                {showPhoneForm && (
                  <ClientPhoneForm
                    clientId={client.id}
                    onClose={() => setShowPhoneForm(false)}
                  />
                )}
              </TabsContent>

              <TabsContent value="addresses" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium">Addresses</h4>
                  <Button size="sm" variant="outline" onClick={() => setShowAddressForm(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Address
                  </Button>
                </div>

                {client.addresses && client.addresses.length > 0 ? (
                  <div className="space-y-2">
                    {client.addresses.map((address) => (
                      <div key={address.id} className="flex items-start justify-between p-3 rounded-lg border">
                        <div className="flex items-start gap-3">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">{address.address_line1}</p>
                            {address.address_line2 && (
                              <p className="text-sm">{address.address_line2}</p>
                            )}
                            <p className="text-sm">
                              {address.city}, {address.state} {address.zip_code}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {addressTypeLabels[address.address_type]}
                              {address.is_primary && ' • Primary'}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteAddress.mutate({ id: address.id, clientId: client.id })}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No addresses added yet
                  </p>
                )}

                {showAddressForm && (
                  <ClientAddressForm
                    clientId={client.id}
                    onClose={() => setShowAddressForm(false)}
                  />
                )}
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <p className="text-muted-foreground">Client not found</p>
        )}
      </SheetContent>
    </Sheet>
  );
}
