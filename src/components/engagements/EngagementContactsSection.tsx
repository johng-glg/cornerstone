import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, User } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useContacts } from '@/hooks/useContacts';
import { useAddEngagementContact, useRemoveEngagementContact, type ContactRelationship } from '@/hooks/useEngagements';
import type { Tables } from '@/integrations/supabase/types';

interface EngagementContactsSectionProps {
  engagementId: string;
  contacts: (Tables<'engagement_contacts'> & {
    contact?: Tables<'contacts'>;
  })[];
  primaryContactId: string | null;
}

const relationshipLabels: Record<string, string> = {
  primary_client: 'Primary Client',
  co_client: 'Co-Client',
  spouse: 'Spouse',
  authorized_contact: 'Authorized Contact',
  other: 'Other',
};

export function EngagementContactsSection({ engagementId, contacts, primaryContactId }: EngagementContactsSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [selectedRelationship, setSelectedRelationship] = useState<ContactRelationship>('primary_client');
  
  const { data: allContacts } = useContacts();
  const addContact = useAddEngagementContact();
  const removeContact = useRemoveEngagementContact();

  const handleAddContact = async () => {
    if (!selectedContactId) return;
    
    await addContact.mutateAsync({
      engagement_id: engagementId,
      contact_id: selectedContactId,
      relationship: selectedRelationship,
      is_primary: contacts.length === 0,
    });
    
    setShowAddForm(false);
    setSelectedContactId('');
    setSelectedRelationship('primary_client');
  };

  const availableContacts = allContacts?.filter(
    (c) => !contacts.some((ec) => ec.contact_id === c.id)
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium">Related Contacts</h4>
        <Button size="sm" variant="outline" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Contact
        </Button>
      </div>

      {showAddForm && (
        <div className="p-3 border rounded-lg space-y-3 bg-muted/30">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Contact</label>
              <Select value={selectedContactId} onValueChange={setSelectedContactId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select contact" />
                </SelectTrigger>
                <SelectContent>
                  {availableContacts?.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.first_name} {contact.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Relationship</label>
              <Select value={selectedRelationship} onValueChange={(v) => setSelectedRelationship(v as ContactRelationship)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary_client">Primary Client</SelectItem>
                  <SelectItem value="co_client">Co-Client</SelectItem>
                  <SelectItem value="spouse">Spouse</SelectItem>
                  <SelectItem value="authorized_contact">Authorized Contact</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddContact} disabled={!selectedContactId || addContact.isPending}>
              Add
            </Button>
          </div>
        </div>
      )}

      {contacts.length > 0 ? (
        <div className="space-y-2">
          {contacts.map((ec) => (
            <div key={ec.id} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {ec.contact?.first_name} {ec.contact?.last_name}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {relationshipLabels[ec.relationship]}
                    </Badge>
                    {ec.is_primary && (
                      <Badge variant="secondary" className="text-xs">Primary</Badge>
                    )}
                  </div>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => removeContact.mutate({ id: ec.id, engagementId })}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          No contacts linked to this engagement
        </p>
      )}
    </div>
  );
}
