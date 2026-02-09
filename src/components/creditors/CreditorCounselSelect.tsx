import { useState } from 'react';
import { Check, ChevronsUpDown, Plus, Building2, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useCreditors } from '@/hooks/useCreditors';
import { useCreditorContacts } from '@/hooks/useCreditorContacts';
import { CreditorFormDialog } from '@/components/creditors/CreditorFormDialog';
import { CreditorContactFormDialog } from '@/components/creditors/CreditorContactFormDialog';
import type { Creditor } from '@/hooks/useCreditors';

interface CreditorCounselSelectProps {
  creditorId: string | null;
  contactId: string | null;
  onCreditorChange: (id: string | null) => void;
  onContactChange: (id: string | null) => void;
  disabled?: boolean;
}

export function CreditorCounselSelect({
  creditorId,
  contactId,
  onCreditorChange,
  onContactChange,
  disabled,
}: CreditorCounselSelectProps) {
  const [creditorOpen, setCreditorOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [creditorDialogOpen, setCreditorDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);

  const { data: creditors } = useCreditors();
  const { data: contacts } = useCreditorContacts(creditorId || undefined);

  const selectedCreditor = creditors?.find((c) => c.id === creditorId);
  const selectedContact = contacts?.find((c) => c.id === contactId);

  const handleCreditorSelect = (id: string) => {
    if (id === creditorId) {
      onCreditorChange(null);
      onContactChange(null);
    } else {
      onCreditorChange(id);
      onContactChange(null);
    }
    setCreditorOpen(false);
  };

  const handleContactSelect = (id: string | null) => {
    onContactChange(id === contactId ? null : id);
    setContactOpen(false);
  };

  return (
    <div className="space-y-3">
      {/* Creditor Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Creditor / Law Firm</label>
        <Popover open={creditorOpen} onOpenChange={setCreditorOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={creditorOpen}
              className="w-full justify-between"
              disabled={disabled}
            >
              {selectedCreditor ? (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  {selectedCreditor.name}
                </div>
              ) : (
                <span className="text-muted-foreground">Select creditor...</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0">
            <Command>
              <CommandInput placeholder="Search creditors..." />
              <CommandList>
                <CommandEmpty>No creditors found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      setCreditorOpen(false);
                      setCreditorDialogOpen(true);
                    }}
                    className="text-primary"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Creditor
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Creditors">
                  {creditors?.map((creditor) => (
                    <CommandItem
                      key={creditor.id}
                      value={creditor.name}
                      onSelect={() => handleCreditorSelect(creditor.id)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          creditorId === creditor.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p>{creditor.name}</p>
                          {(creditor.city || creditor.state) && (
                            <p className="text-xs text-muted-foreground">
                              {[creditor.city, creditor.state].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Contact Selector */}
      {creditorId && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Attorney/Contact</label>
          <Popover open={contactOpen} onOpenChange={setContactOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={contactOpen}
                className="w-full justify-between"
                disabled={disabled}
              >
                {selectedContact ? (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {selectedContact.first_name} {selectedContact.last_name}
                    {selectedContact.title && (
                      <span className="text-muted-foreground">({selectedContact.title})</span>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">Select contact (optional)...</span>
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0">
              <Command>
                <CommandInput placeholder="Search contacts..." />
                <CommandList>
                  <CommandEmpty>No contacts found for this creditor.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        setContactOpen(false);
                        setContactDialogOpen(true);
                      }}
                      className="text-primary"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add New Contact
                    </CommandItem>
                    <CommandItem onSelect={() => handleContactSelect(null)}>
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          !contactId ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="text-muted-foreground">(No specific contact)</span>
                    </CommandItem>
                  </CommandGroup>
                  {contacts && contacts.length > 0 && (
                    <>
                      <CommandSeparator />
                      <CommandGroup heading="Contacts">
                        {contacts.map((contact) => (
                          <CommandItem
                            key={contact.id}
                            value={`${contact.first_name} ${contact.last_name}`}
                            onSelect={() => handleContactSelect(contact.id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                contactId === contact.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p>
                                  {contact.first_name} {contact.last_name}
                                  {contact.title && (
                                    <span className="text-muted-foreground ml-1">
                                      ({contact.title})
                                    </span>
                                  )}
                                </p>
                                {contact.email && (
                                  <p className="text-xs text-muted-foreground">{contact.email}</p>
                                )}
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Quick Add Dialogs */}
      <CreditorFormDialog
        open={creditorDialogOpen}
        onOpenChange={setCreditorDialogOpen}
        creditor={null}
        onCreated={(creditor: Creditor) => {
          onCreditorChange(creditor.id);
        }}
      />

      {creditorId && (
        <CreditorContactFormDialog
          open={contactDialogOpen}
          onOpenChange={setContactDialogOpen}
          creditorId={creditorId}
          onCreated={(contact) => {
            onContactChange(contact.id);
          }}
        />
      )}
    </div>
  );
}
