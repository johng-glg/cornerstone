import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCreateCreditorContact, useUpdateCreditorContact, type CreditorContact } from '@/hooks/useCreditorContacts';

const formSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  title: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreditorContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creditorId: string;
  contact?: CreditorContact | null;
  onCreated?: (contact: CreditorContact) => void;
}

export function CreditorContactFormDialog({ 
  open, 
  onOpenChange, 
  creditorId,
  contact,
  onCreated 
}: CreditorContactFormDialogProps) {
  const createContact = useCreateCreditorContact();
  const updateContact = useUpdateCreditorContact();
  const isEditing = !!contact;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      title: '',
      email: '',
      phone: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (contact) {
      form.reset({
        first_name: contact.first_name,
        last_name: contact.last_name,
        title: contact.title || '',
        email: contact.email || '',
        phone: contact.phone || '',
        notes: contact.notes || '',
      });
    } else {
      form.reset({
        first_name: '',
        last_name: '',
        title: '',
        email: '',
        phone: '',
        notes: '',
      });
    }
  }, [contact, form]);

  const onSubmit = (values: FormValues) => {
    const data = {
      creditor_id: creditorId,
      first_name: values.first_name,
      last_name: values.last_name,
      title: values.title || null,
      email: values.email || null,
      phone: values.phone || null,
      notes: values.notes || null,
      is_active: true,
    };

    if (isEditing) {
      updateContact.mutate(
        { id: contact.id, ...data },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createContact.mutate(data, { 
        onSuccess: (newContact) => {
          onCreated?.(newContact);
          onOpenChange(false);
        } 
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Attorney, Account Manager" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="jsmith@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Direct Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="(555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Notes about this contact..."
                      className="resize-none"
                      rows={2}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createContact.isPending || updateContact.isPending}
              >
                {isEditing ? 'Save Changes' : 'Add Contact'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
