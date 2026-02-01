import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCreateCreditor, useUpdateCreditor, type Creditor } from '@/hooks/useCreditors';

const creditorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  creditor_type: z.enum(['original_creditor', 'collection_agency', 'law_firm', 'debt_buyer']),
  phone: z.string().max(20).optional().nullable(),
  fax: z.string().max(20).optional().nullable(),
  email: z.string().email('Invalid email').max(255).optional().nullable().or(z.literal('')),
  address_line1: z.string().max(255).optional().nullable(),
  address_line2: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(2).optional().nullable(),
  zip_code: z.string().max(10).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

type CreditorFormData = z.infer<typeof creditorSchema>;

interface CreditorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creditor?: Creditor | null;
}

const creditorTypeLabels: Record<string, string> = {
  original_creditor: 'Original Creditor',
  collection_agency: 'Collection Agency',
  law_firm: 'Law Firm',
  debt_buyer: 'Debt Buyer',
};

export function CreditorFormDialog({ open, onOpenChange, creditor }: CreditorFormDialogProps) {
  const createCreditor = useCreateCreditor();
  const updateCreditor = useUpdateCreditor();
  const isEditing = !!creditor;

  const form = useForm<CreditorFormData>({
    resolver: zodResolver(creditorSchema),
    defaultValues: {
      name: '',
      creditor_type: 'original_creditor',
      phone: '',
      fax: '',
      email: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      zip_code: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (creditor) {
      form.reset({
        name: creditor.name,
        creditor_type: creditor.creditor_type,
        phone: creditor.phone || '',
        fax: creditor.fax || '',
        email: creditor.email || '',
        address_line1: creditor.address_line1 || '',
        address_line2: creditor.address_line2 || '',
        city: creditor.city || '',
        state: creditor.state || '',
        zip_code: creditor.zip_code || '',
        notes: creditor.notes || '',
      });
    } else {
      form.reset({
        name: '',
        creditor_type: 'original_creditor',
        phone: '',
        fax: '',
        email: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        zip_code: '',
        notes: '',
      });
    }
  }, [creditor, form]);

  const onSubmit = async (data: CreditorFormData) => {
    const creditorData = {
      name: data.name,
      creditor_type: data.creditor_type,
      phone: data.phone || null,
      fax: data.fax || null,
      email: data.email || null,
      address_line1: data.address_line1 || null,
      address_line2: data.address_line2 || null,
      city: data.city || null,
      state: data.state || null,
      zip_code: data.zip_code || null,
      notes: data.notes || null,
    };

    if (isEditing && creditor) {
      await updateCreditor.mutateAsync({ id: creditor.id, ...creditorData });
    } else {
      await createCreditor.mutateAsync(creditorData);
    }
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Creditor' : 'New Creditor'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Creditor name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="creditor_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(creditorTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} placeholder="(555) 123-4567" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fax</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} placeholder="(555) 123-4568" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} type="email" placeholder="contact@creditor.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address_line1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address Line 1</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} placeholder="123 Main St" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address_line2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address Line 2</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} placeholder="Suite 100" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} placeholder="City" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} placeholder="CA" maxLength={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="zip_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zip Code</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} placeholder="12345" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value || ''} placeholder="Additional notes..." rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createCreditor.isPending || updateCreditor.isPending}>
                {isEditing ? 'Save Changes' : 'Create Creditor'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
