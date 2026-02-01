import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLead, useUpdateLead } from '@/hooks/useLeads';
import { useServices } from '@/hooks/useServices';
import { useCreditors } from '@/hooks/useCreditors';
import { useCurrentStaff } from '@/hooks/useStaff';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  Check,
  User,
  Briefcase,
  DollarSign,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

const contactSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  date_of_birth: z.string().optional(),
  tcpa_consent: z.boolean().default(false),
});

const serviceSchema = z.object({
  services: z.array(z.string()).min(1, 'Select at least one service'),
});

const liabilitySchema = z.object({
  liabilities: z.array(z.object({
    creditor_id: z.string().min(1, 'Select a creditor'),
    liability_type: z.enum(['credit_card', 'medical', 'auto_loan', 'personal_loan', 'student_loan', 'mortgage', 'other']),
    original_balance: z.number().min(0),
    current_balance: z.number().min(0).optional(),
    account_number: z.string().optional(),
  })),
});

type ContactFormData = z.infer<typeof contactSchema>;
type ServiceFormData = z.infer<typeof serviceSchema>;
type LiabilityFormData = z.infer<typeof liabilitySchema>;

interface LeadConversionWizardProps {
  leadId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

const STEPS = [
  { id: 'client', label: 'Client Info', icon: User },
  { id: 'services', label: 'Services', icon: Briefcase },
  { id: 'liabilities', label: 'Liabilities', icon: DollarSign },
  { id: 'confirm', label: 'Confirm', icon: CheckCircle },
];

export function LeadConversionWizard({ leadId, onClose, onSuccess }: LeadConversionWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isConverting, setIsConverting] = useState(false);
  const [contactData, setContactData] = useState<ContactFormData | null>(null);
  const [serviceData, setServiceData] = useState<ServiceFormData | null>(null);
  const [liabilityData, setLiabilityData] = useState<LiabilityFormData>({ liabilities: [] });
  
  const { data: lead } = useLead(leadId ?? undefined);
  const { data: services } = useServices();
  const { data: creditors } = useCreditors();
  const { data: currentStaff } = useCurrentStaff();
  const updateLead = useUpdateLead();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const contactForm = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      first_name: lead?.first_name || '',
      last_name: lead?.last_name || '',
      email: lead?.email || '',
      phone: lead?.phone || '',
      tcpa_consent: false,
    },
  });

  const serviceForm = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      services: [],
    },
  });

  const liabilityForm = useForm<LiabilityFormData>({
    resolver: zodResolver(liabilitySchema),
    defaultValues: {
      liabilities: [],
    },
  });

  // Update form when lead data loads
  if (lead && !contactData) {
    contactForm.reset({
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email || '',
      phone: lead.phone || '',
      tcpa_consent: false,
    });
  }

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const handleNextStep = async () => {
    if (currentStep === 0) {
      const isValid = await contactForm.trigger();
      if (isValid) {
        setContactData(contactForm.getValues());
        setCurrentStep(1);
      }
    } else if (currentStep === 1) {
      const isValid = await serviceForm.trigger();
      if (isValid) {
        setServiceData(serviceForm.getValues());
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      setLiabilityData(liabilityForm.getValues());
      setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleConvert = async () => {
    if (!lead || !contactData || !serviceData || !currentStaff?.company_id) return;

    setIsConverting(true);

    try {
      // 1. Create client
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert([{
          first_name: contactData.first_name,
          last_name: contactData.last_name,
          email: contactData.email || null,
          company_id: currentStaff.company_id,
          tcpa_consent: contactData.tcpa_consent,
          tcpa_consent_date: contactData.tcpa_consent ? new Date().toISOString() : null,
        }])
        .select()
        .single();

      if (clientError) throw clientError;

      // 2. Add phone if provided
      if (contactData.phone) {
        await supabase.from('client_phones').insert([{
          client_id: client.id,
          phone_number: contactData.phone,
          phone_type: 'mobile',
          is_primary: true,
        }]);
      }

      // 3. Create client service
      const { data: clientService, error: serviceError } = await supabase
        .from('client_services')
        .insert([{
          owning_company_id: currentStaff.company_id,
          originating_company_id: lead.originating_company_id || currentStaff.company_id,
          primary_client_id: client.id,
          status: 'active',
          enrolled_date: new Date().toISOString().split('T')[0],
          service_number: '', // Auto-generated by trigger
        }] as any)
        .select()
        .single();

      if (serviceError) throw serviceError;

      // 4. Link client service to client
      await supabase.from('client_service_clients').insert([{
        client_service_id: clientService.id,
        client_id: client.id,
        relationship: 'primary_client',
        is_primary: true,
      }]);

      // 5. Add service types
      for (const serviceId of serviceData.services) {
        await supabase.from('client_service_types').insert([{
          client_service_id: clientService.id,
          service_id: serviceId,
        }]);
      }

      // 6. Add liabilities if any
      for (const liability of liabilityData.liabilities) {
        await supabase.from('liabilities').insert([{
          client_service_id: clientService.id,
          current_creditor_id: liability.creditor_id,
          original_creditor_id: liability.creditor_id,
          liability_type: liability.liability_type,
          original_balance: liability.original_balance,
          current_balance: liability.current_balance || liability.original_balance,
          enrolled_balance: liability.original_balance,
          account_number: liability.account_number || null,
        }]);
      }

      // 7. Update lead status
      await updateLead.mutateAsync({
        id: lead.id,
        status: 'converted',
        converted_service_id: clientService.id,
      });

      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['client_services'] });

      toast({ title: 'Lead converted successfully!' });
      onSuccess();
    } catch (error: any) {
      toast({ 
        title: 'Conversion failed', 
        description: error.message, 
        variant: 'destructive' 
      });
    } finally {
      setIsConverting(false);
    }
  };

  const addLiability = () => {
    const current = liabilityForm.getValues('liabilities');
    liabilityForm.setValue('liabilities', [
      ...current,
      {
        creditor_id: '',
        liability_type: 'credit_card',
        original_balance: 0,
        current_balance: 0,
        account_number: '',
      },
    ]);
  };

  const removeLiability = (index: number) => {
    const current = liabilityForm.getValues('liabilities');
    liabilityForm.setValue('liabilities', current.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={!!leadId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">CONVERT LEAD TO CLIENT SERVICE</DialogTitle>
          <DialogDescription>
            Complete the following steps to convert this lead into an active client service.
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-4">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between">
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  'flex flex-col items-center gap-1',
                  index <= currentStep ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center',
                    index < currentStep
                      ? 'bg-primary text-primary-foreground'
                      : index === currentStep
                      ? 'bg-primary/20 border-2 border-primary'
                      : 'bg-muted'
                  )}
                >
                  {index < currentStep ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <step.icon className="h-4 w-4" />
                  )}
                </div>
                <span className="text-xs font-medium">{step.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="min-h-[300px] py-4">
          {currentStep === 0 && (
            <Form {...contactForm}>
              <form className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={contactForm.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={contactForm.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={contactForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={contactForm.control}
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
                </div>
                <FormField
                  control={contactForm.control}
                  name="tcpa_consent"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Client has given TCPA consent for communications
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          )}

          {currentStep === 1 && (
            <Form {...serviceForm}>
              <form className="space-y-4">
                <FormField
                  control={serviceForm.control}
                  name="services"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Services *</FormLabel>
                      <div className="grid gap-3">
                        {services?.map((service) => (
                          <Card
                            key={service.id}
                            className={cn(
                              'cursor-pointer transition-all',
                              field.value.includes(service.id)
                                ? 'border-primary bg-primary/5'
                                : 'hover:border-primary/50'
                            )}
                            onClick={() => {
                              const current = field.value;
                              if (current.includes(service.id)) {
                                field.onChange(current.filter((id) => id !== service.id));
                              } else {
                                field.onChange([...current, service.id]);
                              }
                            }}
                          >
                            <CardContent className="p-4 flex items-center gap-3">
                              <Checkbox
                                checked={field.value.includes(service.id)}
                                className="pointer-events-none"
                              />
                              <div>
                                <p className="font-medium">{service.name}</p>
                                {service.description && (
                                  <p className="text-sm text-muted-foreground">
                                    {service.description}
                                  </p>
                                )}
                              </div>
                              <Badge className="ml-auto capitalize" variant="outline">
                                {service.service_type.replace('_', ' ')}
                              </Badge>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          )}

          {currentStep === 2 && (
            <Form {...liabilityForm}>
              <form className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Add debts to be enrolled in the program (optional)
                  </p>
                  <Button type="button" variant="outline" size="sm" onClick={addLiability}>
                    Add Liability
                  </Button>
                </div>

                {liabilityForm.watch('liabilities').length === 0 ? (
                  <Card className="bg-muted/50">
                    <CardContent className="p-8 text-center">
                      <DollarSign className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No liabilities added yet</p>
                      <p className="text-sm text-muted-foreground">
                        You can add liabilities now or later after conversion
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {liabilityForm.watch('liabilities').map((_, index) => (
                      <Card key={index}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">Liability #{index + 1}</CardTitle>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeLiability(index)}
                            >
                              Remove
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-3">
                          <FormField
                            control={liabilityForm.control}
                            name={`liabilities.${index}.creditor_id`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Creditor *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select creditor" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {creditors?.map((creditor) => (
                                      <SelectItem key={creditor.id} value={creditor.id}>
                                        {creditor.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={liabilityForm.control}
                            name={`liabilities.${index}.liability_type`}
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
                                    <SelectItem value="credit_card">Credit Card</SelectItem>
                                    <SelectItem value="medical">Medical</SelectItem>
                                    <SelectItem value="personal_loan">Personal Loan</SelectItem>
                                    <SelectItem value="auto_loan">Auto Loan</SelectItem>
                                    <SelectItem value="student_loan">Student Loan</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={liabilityForm.control}
                            name={`liabilities.${index}.original_balance`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Original Balance *</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    {...field}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={liabilityForm.control}
                            name={`liabilities.${index}.account_number`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Account #</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="xxxx-1234" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </form>
            </Form>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground">Contact</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{contactData?.first_name} {contactData?.last_name}</p>
                  <p className="text-sm text-muted-foreground">{contactData?.email}</p>
                  <p className="text-sm text-muted-foreground">{contactData?.phone}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground">Services</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {serviceData?.services.map((serviceId) => {
                    const service = services?.find((s) => s.id === serviceId);
                    return service ? (
                      <Badge key={serviceId}>{service.name}</Badge>
                    ) : null;
                  })}
                </CardContent>
              </Card>

              {liabilityData.liabilities.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm text-muted-foreground">
                      Liabilities ({liabilityData.liabilities.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {liabilityData.liabilities.map((liability, index) => {
                        const creditor = creditors?.find((c) => c.id === liability.creditor_id);
                        return (
                          <div key={index} className="flex justify-between">
                            <span>{creditor?.name || 'Unknown'}</span>
                            <span className="font-medium">
                              ${liability.original_balance.toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                      <div className="border-t pt-2 flex justify-between font-bold">
                        <span>Total</span>
                        <span>
                          ${liabilityData.liabilities
                            .reduce((sum, l) => sum + l.original_balance, 0)
                            .toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={currentStep === 0 ? onClose : handlePrevStep}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            {currentStep === 0 ? 'Cancel' : 'Back'}
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button type="button" onClick={handleNextStep}>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleConvert} disabled={isConverting}>
              {isConverting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Convert to Engagement
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
