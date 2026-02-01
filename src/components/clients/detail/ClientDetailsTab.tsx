import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Phone, MapPin, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useDeleteClientPhone, useDeleteClientAddress } from '@/hooks/useClients';
import { ClientPhoneForm } from '@/components/clients/ClientPhoneForm';
import { ClientAddressForm } from '@/components/clients/ClientAddressForm';
import type { Tables } from '@/integrations/supabase/types';

interface ClientDetailsTabProps {
  client: Tables<'clients'> & {
    phones?: Tables<'client_phones'>[];
    addresses?: Tables<'client_addresses'>[];
  };
}

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

export function ClientDetailsTab({ client }: ClientDetailsTabProps) {
  const [showPhoneForm, setShowPhoneForm] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const deletePhone = useDeleteClientPhone();
  const deleteAddress = useDeleteClientAddress();

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div>
        <h3 className="text-sm font-medium mb-3">Personal Information</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-muted-foreground">Date of Birth</label>
            <p className="text-sm font-medium">
              {client.date_of_birth
                ? format(new Date(client.date_of_birth), 'MMM d, yyyy')
                : 'Not provided'}
            </p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Email</label>
            <p className="text-sm font-medium">{client.email || 'Not provided'}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Client Since</label>
            <p className="text-sm font-medium">
              {format(new Date(client.created_at), 'MMM d, yyyy')}
            </p>
          </div>
        </div>

        {client.tcpa_consent_date && (
          <div className="mt-4">
            <label className="text-sm text-muted-foreground">TCPA Consent Date</label>
            <p className="text-sm font-medium">
              {format(new Date(client.tcpa_consent_date), 'MMM d, yyyy h:mm a')}
            </p>
          </div>
        )}

        {client.notes && (
          <div className="mt-4">
            <label className="text-sm text-muted-foreground">Notes</label>
            <p className="text-sm whitespace-pre-wrap mt-1">{client.notes}</p>
          </div>
        )}
      </div>

      <Separator />

      {/* Phone Numbers */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-medium">Phone Numbers</h3>
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
          <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
            No phone numbers added yet
          </p>
        )}

        {showPhoneForm && (
          <div className="mt-3">
            <ClientPhoneForm
              clientId={client.id}
              onClose={() => setShowPhoneForm(false)}
            />
          </div>
        )}
      </div>

      <Separator />

      {/* Addresses */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-medium">Addresses</h3>
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
          <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
            No addresses added yet
          </p>
        )}

        {showAddressForm && (
          <div className="mt-3">
            <ClientAddressForm
              clientId={client.id}
              onClose={() => setShowAddressForm(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
