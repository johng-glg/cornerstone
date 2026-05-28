import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useCreateTemplate, useUpdateTemplate } from '@/hooks/useTemplates';
import { useTemplateCategories, useSeedDefaultCategories } from '@/hooks/useTemplateCategories';
import { MergeFieldPalette } from './MergeFieldPalette';
import { ConditionalBlockInserter } from './ConditionalBlockInserter';
import { TemplateVersionHistory } from './TemplateVersionHistory';
import { TemplateUsagePanel } from './TemplateUsagePanel';
import {
  Template,
  TemplateType,
  TemplateLanguage,
  templateTypeLabels,
  templateLanguageLabels,
  TEMPLATE_CHAR_LIMITS,
  MergeFieldDefinition,
} from '@/types/templates';
import { AlertCircle, Plus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  template_type: z.enum(['email', 'sms', 'document']),
  category_id: z.string().optional(),
  subject: z.string().optional(),
  content: z.string().min(1, 'Content is required'),
  language: z.enum(['en', 'es']),
  is_active: z.boolean(),
  changeNotes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface TemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: Template | null;
}

export function TemplateFormDialog({ open, onOpenChange, template }: TemplateFormDialogProps) {
  const [activeTab, setActiveTab] = useState('content');
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const [insertTarget, setInsertTarget] = useState<'content' | 'subject'>('content');

  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const { data: categories, isLoading: categoriesLoading } = useTemplateCategories();
  const seedCategories = useSeedDefaultCategories();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      template_type: 'email',
      category_id: '',
      subject: '',
      content: '',
      language: 'en',
      is_active: true,
      changeNotes: '',
    },
  });

  const templateType = form.watch('template_type');
  const content = form.watch('content');

  // Reset form when template changes
  useEffect(() => {
    if (template) {
      form.reset({
        name: template.name,
        description: template.description || '',
        template_type: template.template_type,
        category_id: template.category_id || '',
        subject: template.subject || '',
        content: template.content,
        language: template.language,
        is_active: template.is_active,
        changeNotes: '',
      });
    } else {
      form.reset({
        name: '',
        description: '',
        template_type: 'email',
        category_id: '',
        subject: '',
        content: '',
        language: 'en',
        is_active: true,
        changeNotes: '',
      });
    }
  }, [template, form, open]);

  const onSubmit = async (data: FormData) => {
    const payload = {
      name: data.name,
      description: data.description || null,
      template_type: data.template_type as TemplateType,
      category_id: data.category_id || null,
      subject: data.template_type === 'email' ? data.subject || null : null,
      content: data.content,
      content_html: null, // Will be set when rich editor is implemented
      language: data.language as TemplateLanguage,
      is_active: data.is_active,
      merge_fields: [] as MergeFieldDefinition[],
      conditional_clauses: [],
    };

    if (template) {
      await updateTemplate.mutateAsync({
        id: template.id,
        ...payload,
        changeNotes: data.changeNotes,
      });
    } else {
      await createTemplate.mutateAsync({
        ...payload,
        is_system: false,
      });
    }

    onOpenChange(false);
  };

  const handleMergeFieldInsert = (tag: string) => {
    const target = insertTarget === 'subject' ? subjectRef.current : contentRef.current;
    if (!target) return;

    const start = target.selectionStart || 0;
    const end = target.selectionEnd || 0;
    const fieldName = insertTarget === 'subject' ? 'subject' : 'content';
    const currentValue = form.getValues(fieldName) || '';
    
    const newValue = currentValue.substring(0, start) + tag + currentValue.substring(end);
    form.setValue(fieldName, newValue);

    // Refocus and set cursor position after the inserted tag
    setTimeout(() => {
      target.focus();
      const newPosition = start + tag.length;
      target.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const isOverCharLimit = templateType === 'sms' && content.length > TEMPLATE_CHAR_LIMITS.sms;
  const isPending = createTemplate.isPending || updateTemplate.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{template ? 'Edit Template' : 'Create Template'}</DialogTitle>
          <DialogDescription>
            {template ? 'Update your template content and settings' : 'Create a new template for emails, SMS, or documents'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
              <TabsList>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-auto">
                <TabsContent value="content" className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Template Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Welcome Email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="template_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={!!template}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(['email', 'sms', 'document'] as TemplateType[]).map((type) => (
                                <SelectItem key={type} value={type}>
                                  {templateTypeLabels[type]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {templateType === 'email' && (
                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject Line</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Welcome to {company.name}!" 
                              {...field}
                              ref={subjectRef}
                              onFocus={() => setInsertTarget('subject')}
                            />
                          </FormControl>
                          <FormDescription>
                            You can use merge fields in the subject line
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name="content"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center justify-between">
                              Content
                              {templateType === 'sms' && (
                                <span className={`text-xs ${isOverCharLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
                                  {content.length} / {TEMPLATE_CHAR_LIMITS.sms}
                                </span>
                              )}
                            </FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Hello {client.first_name},"
                                className="min-h-[300px] font-mono text-sm"
                                {...field}
                                ref={contentRef}
                                onFocus={() => setInsertTarget('content')}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {isOverCharLimit && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            SMS content exceeds the {TEMPLATE_CHAR_LIMITS.sms} character limit
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    <div>
                      <MergeFieldPalette onInsert={handleMergeFieldInsert} />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="settings" className="mt-4 space-y-4">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe when this template should be used..."
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <div className="flex gap-2">
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categories?.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id}>
                                    {cat.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {(!categories || categories.length === 0) && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => seedCategories.mutate()}
                                disabled={seedCategories.isPending}
                                title="Create default categories"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="language"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Language</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(['en', 'es'] as TemplateLanguage[]).map((lang) => (
                                <SelectItem key={lang} value={lang}>
                                  {templateLanguageLabels[lang]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active</FormLabel>
                          <FormDescription>
                            Only active templates can be used in workflows and communications
                          </FormDescription>
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

                  {template && (
                    <FormField
                      control={form.control}
                      name="changeNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Change Notes</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Describe what changed in this version..."
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Optional notes about this update (stored in version history)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {template && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline">Version {template.current_version}</Badge>
                      {template.is_system && (
                        <Badge variant="secondary">System Template</Badge>
                      )}
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>

            <DialogFooter className="mt-4 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || isOverCharLimit}>
                {isPending ? 'Saving...' : template ? 'Save Changes' : 'Create Template'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
