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
import { useLawFirms } from '@/hooks/useLawFirms';
import { useLawFirmContacts } from '@/hooks/useLawFirmContacts';
import { LawFirmFormDialog } from './LawFirmFormDialog';
import { LawFirmContactFormDialog } from './LawFirmContactFormDialog';

interface OpposingCounselSelectProps {
  lawFirmId: string | null;
  contactId: string | null;
  onLawFirmChange: (id: string | null) => void;
  onContactChange: (id: string | null) => void;
  disabled?: boolean;
}

export function OpposingCounselSelect({
  lawFirmId,
  contactId,
  onLawFirmChange,
  onContactChange,
  disabled,
}: OpposingCounselSelectProps) {
  const [firmOpen, setFirmOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [firmDialogOpen, setFirmDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);

  const { data: firms } = useLawFirms();
  const { data: contacts } = useLawFirmContacts(lawFirmId || undefined);

  const selectedFirm = firms?.find((f) => f.id === lawFirmId);
  const selectedContact = contacts?.find((c) => c.id === contactId);

  const handleFirmSelect = (id: string) => {
    if (id === lawFirmId) {
      // Clear selection
      onLawFirmChange(null);
      onContactChange(null);
    } else {
      onLawFirmChange(id);
      onContactChange(null); // Reset contact when firm changes
    }
    setFirmOpen(false);
  };

  const handleContactSelect = (id: string | null) => {
    onContactChange(id === contactId ? null : id);
    setContactOpen(false);
  };

  return (
    <div className="space-y-3">
      {/* Law Firm Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Law Firm</label>
        <Popover open={firmOpen} onOpenChange={setFirmOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={firmOpen}
              className="w-full justify-between"
              disabled={disabled}
            >
              {selectedFirm ? (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  {selectedFirm.name}
                </div>
              ) : (
                <span className="text-muted-foreground">Select law firm...</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0">
            <Command>
              <CommandInput placeholder="Search law firms..." />
              <CommandList>
                <CommandEmpty>No law firms found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      setFirmOpen(false);
                      setFirmDialogOpen(true);
                    }}
                    className="text-primary"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Law Firm
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Law Firms">
                  {firms?.map((firm) => (
                    <CommandItem
                      key={firm.id}
                      value={firm.name}
                      onSelect={() => handleFirmSelect(firm.id)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          lawFirmId === firm.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p>{firm.name}</p>
                          {(firm.city || firm.state) && (
                            <p className="text-xs text-muted-foreground">
                              {[firm.city, firm.state].filter(Boolean).join(', ')}
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

      {/* Contact Selector (only shown when firm is selected) */}
      {lawFirmId && (
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
                  <CommandEmpty>No contacts found at this firm.</CommandEmpty>
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
      <LawFirmFormDialog
        open={firmDialogOpen}
        onOpenChange={setFirmDialogOpen}
      />

      {lawFirmId && (
        <LawFirmContactFormDialog
          open={contactDialogOpen}
          onOpenChange={setContactDialogOpen}
          lawFirmId={lawFirmId}
        />
      )}
    </div>
  );
}
