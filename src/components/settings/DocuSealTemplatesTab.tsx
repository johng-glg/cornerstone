import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, FileSignature, Loader2, Pencil } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  useDocuSealTemplates,
  useCreateDocuSealTemplate,
  useUpdateDocuSealTemplate,
  useDeleteDocuSealTemplate,
} from '@/hooks/useDocuSealTemplates';
import type { DocuSealTemplate, SignerRoleDefinition } from '@/types/esign';

const roleSchema = z.object({
  role: z.string().min(1, 'Role key is required'),
  name: z.string().min(1, 'Role name is required'),
  required: z.boolean().optional(),
});

const formSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  docuseal_template_id: z.number().min(1, 'DocuSeal template ID is required'),
  description: z.string().optional(),
  signer_roles: z.array(roleSchema).min(1, 'At least one signer role is required'),
});

type FormData = z.infer<typeof formSchema>;

export function DocuSealTemplatesTab() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocuSealTemplate | null>(null);
  const { toast } = useToast();

  const { data: templates, isLoading } = useDocuSealTemplates();
  const createTemplate = useCreateDocuSealTemplate();
  const updateTemplate = useUpdateDocuSealTemplate();
  const deleteTemplate = useDeleteDocuSealTemplate();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      docuseal_template_id: 0,
      description: '',
      signer_roles: [{ role: 'client', name: 'Client', required: true }],
    },
  });

  const signerRoles = form.watch('signer_roles');

  const openCreateDialog = () => {
    setEditingTemplate(null);
    form.reset({
      name: '',
      docuseal_template_id: 0,
      description: '',
      signer_roles: [{ role: 'client', name: 'Client', required: true }],
    });
    setShowDialog(true);
  };

  const openEditDialog = (template: DocuSealTemplate) => {
    setEditingTemplate(template);
    form.reset({
      name: template.name,
      docuseal_template_id: template.docuseal_template_id,
      description: template.description || '',
      signer_roles: template.signer_roles,
    });
    setShowDialog(true);
  };

  const handleSubmit = async (data: FormData) => {
    try {
      if (editingTemplate) {
        await updateTemplate.mutateAsync({
          id: editingTemplate.id,
          name: data.name,
          description: data.description,
          signer_roles: data.signer_roles as SignerRoleDefinition[],
        });
        toast({ title: 'Template updated' });
      } else {
        await createTemplate.mutateAsync({
          name: data.name,
          docuseal_template_id: data.docuseal_template_id,
          description: data.description,
          signer_roles: data.signer_roles as SignerRoleDefinition[],
        });
        toast({ title: 'Template created' });
      }
      setShowDialog(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save template',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTemplate.mutateAsync(id);
      toast({ title: 'Template removed' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove template',
        variant: 'destructive',
      });
    }
  };

  const addSignerRole = () => {
    const currentRoles = form.getValues('signer_roles');
    form.setValue('signer_roles', [
      ...currentRoles,
      { role: '', name: '', required: false },
    ]);
  };

  const removeSignerRole = (index: number) => {
    const currentRoles = form.getValues('signer_roles');
    form.setValue('signer_roles', currentRoles.filter((_, i) => i !== index));
  };

  const isSubmitting = createTemplate.isPending || updateTemplate.isPending;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5" />
              DocuSeal Templates
            </CardTitle>
            <CardDescription>
              Manage document templates for electronic signatures
            </CardDescription>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-1" />
            Add Template
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !templates || templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileSignature className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No templates configured</p>
              <p className="text-xs mt-1">Add a template to start sending documents for signature</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template Name</TableHead>
                  <TableHead>DocuSeal ID</TableHead>
                  <TableHead>Signer Roles</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{template.name}</p>
                        {template.description && (
                          <p className="text-xs text-muted-foreground">{template.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {template.docuseal_template_id}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {template.signer_roles.map((role) => (
                          <Badge key={role.role} variant="secondary" className="text-xs">
                            {role.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(template)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(template.id)}
                          disabled={deleteTemplate.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Add Template'}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Client Agreement" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="docuseal_template_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>DocuSeal Template ID</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                        placeholder="e.g., 12345"
                        disabled={!!editingTemplate}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Brief description of this template..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Signer Roles */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <FormLabel>Signer Roles</FormLabel>
                  <Button type="button" variant="outline" size="sm" onClick={addSignerRole}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Role
                  </Button>
                </div>

                {signerRoles.map((_, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <FormField
                      control={form.control}
                      name={`signer_roles.${index}.role`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input {...field} placeholder="Role key (e.g., client)" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`signer_roles.${index}.name`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input {...field} placeholder="Display name (e.g., Client)" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {signerRoles.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSignerRole(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingTemplate ? 'Save Changes' : 'Create Template'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
