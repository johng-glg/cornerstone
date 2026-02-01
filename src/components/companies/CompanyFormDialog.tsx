import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tables } from '@/integrations/supabase/types';

type Company = Tables<'companies'>;

const companySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  company_type: z.enum(['law_firm', 'affiliate', 'financing_company']),
  parent_company_id: z.string().nullable(),
  data_visibility: z.enum(['own_only', 'parent_and_own', 'full_hierarchy']),
  is_active: z.boolean(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

interface CompanyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: Company | null;
}

export function CompanyFormDialog({ open, onOpenChange, company }: CompanyFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!company;

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: '',
      company_type: 'law_firm',
      parent_company_id: null,
      data_visibility: 'own_only',
      is_active: true,
      phone: '',
      email: '',
      website: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      zip_code: '',
    },
  });

  useEffect(() => {
    if (company) {
      form.reset({
        name: company.name,
        company_type: company.company_type,
        parent_company_id: company.parent_company_id,
        data_visibility: company.data_visibility,
        is_active: company.is_active,
        phone: company.phone || '',
        email: company.email || '',
        website: company.website || '',
        address_line1: company.address_line1 || '',
        address_line2: company.address_line2 || '',
        city: company.city || '',
        state: company.state || '',
        zip_code: company.zip_code || '',
      });
    } else {
      form.reset({
        name: '',
        company_type: 'law_firm',
        parent_company_id: null,
        data_visibility: 'own_only',
        is_active: true,
        phone: '',
        email: '',
        website: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        zip_code: '',
      });
    }
  }, [company, form]);

  const mutation = useMutation({
    mutationFn: async (values: CompanyFormValues) => {
      if (isEditing && company) {
        const { error } = await supabase
          .from('companies')
          .update({
            name: values.name,
            company_type: values.company_type,
            parent_company_id: values.parent_company_id,
            data_visibility: values.data_visibility,
            is_active: values.is_active,
            email: values.email || null,
            phone: values.phone || null,
            website: values.website || null,
            address_line1: values.address_line1 || null,
            address_line2: values.address_line2 || null,
            city: values.city || null,
            state: values.state || null,
            zip_code: values.zip_code || null,
          })
          .eq('id', company.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('companies')
          .insert({
            name: values.name,
            company_type: values.company_type,
            parent_company_id: values.parent_company_id,
            data_visibility: values.data_visibility,
            is_active: values.is_active,
            email: values.email || null,
            phone: values.phone || null,
            website: values.website || null,
            address_line1: values.address_line1 || null,
            address_line2: values.address_line2 || null,
            city: values.city || null,
            state: values.state || null,
            zip_code: values.zip_code || null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success(isEditing ? 'Company updated' : 'Company created');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Failed to save company: ${error.message}`);
    },
  });

  const onSubmit = (values: CompanyFormValues) => {
    mutation.mutate(values);
  };

  const parentOptions = companies?.filter(c => c.id !== company?.id) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Company' : 'Add Company'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="law_firm">Law Firm</SelectItem>
                        <SelectItem value="affiliate">Affiliate</SelectItem>
                        <SelectItem value="financing_company">Financing Company</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parent_company_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Company</FormLabel>
                    <Select 
                      onValueChange={(val) => field.onChange(val === 'none' ? null : val)} 
                      value={field.value || 'none'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="None (Root)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None (Root Company)</SelectItem>
                        {parentOptions.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="data_visibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Visibility</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="own_only">Own Only</SelectItem>
                        <SelectItem value="parent_and_own">Parent and Own</SelectItem>
                        <SelectItem value="full_hierarchy">Full Hierarchy</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel className="text-sm font-medium">Active</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Contact Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Address</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="address_line1"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Address Line 1</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address_line2"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Address Line 2</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        <Input {...field} />
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
                      <FormLabel>ZIP Code</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving...' : isEditing ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
