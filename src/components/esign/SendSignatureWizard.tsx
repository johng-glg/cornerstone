import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FileSignature, Plus, Trash2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useDocuSealTemplates } from '@/hooks/useDocuSealTemplates';
import { useCreateSignatureRequest, useSendSignatureRequest } from '@/hooks/useSignatureRequests';
import type { DeliveryMethod, SigningMode, CreateSignerData } from '@/types/esign';
import { DELIVERY_METHOD_LABELS, SIGNING_MODE_LABELS, SIGNER_ROLE_LABELS } from '@/types/esign';

interface SendSignatureWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: 'lead' | 'client';
  entityId: string;
  entityData?: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
}

const signerSchema = z.object({
  signer_role: z.string().min(1, 'Role is required'),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
});

const formSchema = z.object({
  docuseal_template_id: z.number().min(1, 'Template is required'),
  title: z.string().min(1, 'Title is required'),
  signing_mode: z.enum(['parallel', 'sequential']),
  delivery_method: z.enum(['email_sms', 'email_only', 'sms_only']),
  language: z.enum(['en', 'es']),
  signers: z.array(signerSchema).min(1, 'At least one signer is required'),
});

type FormData = z.infer<typeof formSchema>;

export function SendSignatureWizard({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityData,
}: SendSignatureWizardProps) {
  const [step, setStep] = useState(1);
  const { toast } = useToast();
  
  const { data: templates, isLoading: templatesLoading } = useDocuSealTemplates();
  const createRequest = useCreateSignatureRequest();
  const sendRequest = useSendSignatureRequest();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      docuseal_template_id: 0,
      title: '',
      signing_mode: 'parallel',
      delivery_method: 'email_only',
      language: 'en',
      signers: entityData ? [{
        signer_role: 'client',
        name: `${entityData.firstName} ${entityData.lastName}`,
        email: entityData.email,
        phone: entityData.phone || '',
      }] : [],
    },
  });

  const signers = form.watch('signers');
  const selectedTemplateId = form.watch('docuseal_template_id');
  const selectedTemplate = templates?.find(t => t.docuseal_template_id === selectedTemplateId);

  const addSigner = () => {
    const currentSigners = form.getValues('signers');
    form.setValue('signers', [
      ...currentSigners,
      { signer_role: '', name: '', email: '', phone: '' },
    ]);
  };

  const removeSigner = (index: number) => {
    const currentSigners = form.getValues('signers');
    form.setValue('signers', currentSigners.filter((_, i) => i !== index));
  };

  const handleNext = async () => {
    if (step === 1) {
      const valid = await form.trigger(['docuseal_template_id', 'title']);
      if (valid) setStep(2);
    } else if (step === 2) {
      const valid = await form.trigger(['signers']);
      if (valid) setStep(3);
    } else if (step === 3) {
      const valid = await form.trigger(['signing_mode', 'delivery_method', 'language']);
      if (valid) setStep(4);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async (data: FormData) => {
    try {
      // Create the signature request
      const signersWithIndex: CreateSignerData[] = data.signers.map((s, i) => ({
        signer_role: s.signer_role,
        name: s.name,
        email: s.email,
        phone: s.phone,
        order_index: i,
      }));

      const request = await createRequest.mutateAsync({
        entity_type: entityType,
        entity_id: entityId,
        docuseal_template_id: data.docuseal_template_id,
        title: data.title,
        signing_mode: data.signing_mode as SigningMode,
        delivery_method: data.delivery_method as DeliveryMethod,
        language: data.language as 'en' | 'es',
        signers: signersWithIndex,
      });

      // Send the request
      await sendRequest.mutateAsync(request.id);

      toast({
        title: 'Signature request sent',
        description: 'The document has been sent for signature.',
      });

      onOpenChange(false);
      form.reset();
      setStep(1);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send signature request',
        variant: 'destructive',
      });
    }
  };

  const isSubmitting = createRequest.isPending || sendRequest.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            Send for Signature
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-4">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                s === step
                  ? 'bg-primary text-primary-foreground'
                  : s < step
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {s}
            </div>
          ))}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Step 1: Template Selection */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="font-medium">Select Template</h3>
                
                <FormField
                  control={form.control}
                  name="docuseal_template_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document Template</FormLabel>
                      <Select
                        value={field.value?.toString() || ''}
                        onValueChange={(val) => field.onChange(parseInt(val, 10))}
                        disabled={templatesLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a template..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {templates?.map((template) => (
                            <SelectItem
                              key={template.id}
                              value={template.docuseal_template_id.toString()}
                            >
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedTemplate?.description && (
                  <p className="text-sm text-muted-foreground">
                    {selectedTemplate.description}
                  </p>
                )}

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document Title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Client Agreement - John Doe" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 2: Signers */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Configure Signers</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addSigner}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Signer
                  </Button>
                </div>

                {signers.map((_, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">Signer {index + 1}</span>
                      {signers.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSigner(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`signers.${index}.signer_role`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select role..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Object.entries(SIGNER_ROLE_LABELS).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>
                                    {label}
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
                        name={`signers.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="John Doe" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`signers.${index}.email`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" placeholder="john@example.com" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`signers.${index}.phone`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone (optional)</FormLabel>
                            <FormControl>
                              <Input {...field} type="tel" placeholder="+1 555 123 4567" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Step 3: Delivery Options */}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="font-medium">Delivery Options</h3>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="signing_mode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Signing Order</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(SIGNING_MODE_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
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
                    name="delivery_method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Method</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(DELIVERY_METHOD_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
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
                    name="language"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Language</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="es">Spanish</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div className="space-y-4">
                <h3 className="font-medium">Review & Send</h3>

                <div className="border rounded-lg p-4 space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Document</Label>
                    <p className="font-medium">{form.getValues('title')}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedTemplate?.name}
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-xs text-muted-foreground">Signers</Label>
                    <div className="space-y-2 mt-2">
                      {signers.map((signer, index) => (
                        <div key={index} className="text-sm">
                          <span className="font-medium">{signer.name}</span>
                          <span className="text-muted-foreground"> ({SIGNER_ROLE_LABELS[signer.signer_role] || signer.signer_role})</span>
                          <span className="text-muted-foreground block text-xs">{signer.email}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <Label className="text-xs text-muted-foreground">Signing Order</Label>
                      <p>{SIGNING_MODE_LABELS[form.getValues('signing_mode')]}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Delivery</Label>
                      <p>{DELIVERY_METHOD_LABELS[form.getValues('delivery_method')]}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Language</Label>
                      <p>{form.getValues('language') === 'en' ? 'English' : 'Spanish'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={step === 1 ? () => onOpenChange(false) : handleBack}
                disabled={isSubmitting}
              >
                {step === 1 ? 'Cancel' : 'Back'}
              </Button>

              {step < 4 ? (
                <Button type="button" onClick={handleNext}>
                  Continue
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Send for Signature
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
