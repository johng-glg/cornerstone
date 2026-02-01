import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Constants, type Enums } from '@/integrations/supabase/types';

const appRoles = Constants.public.Enums.app_role;

// Map roles to their corresponding departments
const roleToDepartment: Record<Enums<'app_role'>, Enums<'department'>> = {
  admin: 'admin',
  attorney: 'attorney',
  paralegal: 'attorney',
  negotiator: 'negotiations',
  case_manager: 'case_manager',
  sales_rep: 'sales_intake',
  client_services_rep: 'client_services',
  payment_processor: 'payment_processing',
  correspondent: 'correspondence',
  viewer: 'admin',
};

const formSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  company_id: z.string().min(1, 'Company is required'),
  is_active: z.boolean(),
  role: z.enum(appRoles as unknown as [string, ...string[]], {
    required_error: 'Role is required',
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface StaffMember {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  department: string;
  company_id: string;
  is_active: boolean;
}

interface StaffFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffMember?: StaffMember | null;
}

export function StaffFormDialog({ open, onOpenChange, staffMember }: StaffFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!staffMember;

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Get staff member's current role
  const { data: staffRole } = useQuery({
    queryKey: ['staff-role', staffMember?.user_id],
    queryFn: async () => {
      if (!staffMember?.user_id) return null;
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', staffMember.user_id)
        .maybeSingle();
      if (error) throw error;
      return data?.role || null;
    },
    enabled: !!staffMember?.user_id,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      company_id: '',
      is_active: true,
      role: undefined,
    },
  });

  // Reset form when dialog opens/closes or staff member changes
  useEffect(() => {
    if (open && staffMember) {
      form.reset({
        first_name: staffMember.first_name,
        last_name: staffMember.last_name,
        email: staffMember.email,
        phone: staffMember.phone || '',
        company_id: staffMember.company_id,
        is_active: staffMember.is_active,
        role: (staffRole as Enums<'app_role'>) || undefined,
      });
    } else if (open && !staffMember) {
      form.reset({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        company_id: '',
        is_active: true,
        role: undefined,
      });
    }
  }, [open, staffMember, staffRole, form]);

  const selectedRole = form.watch('role');
  const department = selectedRole ? roleToDepartment[selectedRole as Enums<'app_role'>] : null;

  const createStaffMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const derivedDepartment = roleToDepartment[values.role as Enums<'app_role'>];
      
      const { data, error } = await supabase.functions.invoke('create-staff-user', {
        body: {
          email: values.email,
          first_name: values.first_name,
          last_name: values.last_name,
          department: derivedDepartment,
          company_id: values.company_id,
          phone: values.phone || undefined,
          is_active: values.is_active,
          roles: [values.role],
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Staff member created',
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['staff-list'] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating staff member',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateStaffMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!staffMember) throw new Error('No staff member to update');
      
      const derivedDepartment = roleToDepartment[values.role as Enums<'app_role'>];

      // Update staff record
      const { error: staffError } = await supabase
        .from('staff')
        .update({
          first_name: values.first_name,
          last_name: values.last_name,
          phone: values.phone || null,
          department: derivedDepartment,
          company_id: values.company_id,
          is_active: values.is_active,
        })
        .eq('id', staffMember.id);

      if (staffError) throw staffError;

      // Update role - delete existing and insert new
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', staffMember.user_id);

      const { error: roleError } = await supabase
        .from('user_roles')
        .insert([{
          user_id: staffMember.user_id,
          role: values.role as Enums<'app_role'>,
        }]);

      if (roleError) throw roleError;

      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: 'Staff member updated',
        description: 'Changes saved successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['staff-list'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles-list'] });
      queryClient.invalidateQueries({ queryKey: ['staff-role', staffMember?.user_id] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating staff member',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    if (isEditing) {
      updateStaffMutation.mutate(values);
    } else {
      createStaffMutation.mutate(values);
    }
  };

  const isPending = createStaffMutation.isPending || updateStaffMutation.isPending;

  const formatRole = (role: string) =>
    role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const formatDepartment = (dept: string) =>
    dept.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Staff Member' : 'Add Staff Member'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update staff member details.'
              : 'Create a new staff account. Default password is TestPass123!'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
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
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
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
                    <Input 
                      type="email" 
                      placeholder="john@example.com" 
                      disabled={isEditing}
                      {...field} 
                    />
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
                  <FormLabel>Phone (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="(555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {appRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {formatRole(role)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {department && (
              <div className="rounded-lg border p-3 bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  Department: <span className="font-medium text-foreground">{formatDepartment(department)}</span>
                </p>
              </div>
            )}

            <FormField
              control={form.control}
              name="company_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select company" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {companies?.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
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
                  <div className="space-y-0.5">
                    <FormLabel>Active Status</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Staff member can access the system
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? 'Save Changes' : 'Create Staff Member'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
